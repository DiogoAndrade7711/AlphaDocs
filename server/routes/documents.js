import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import sharp from 'sharp';
import axios from 'axios';
import { requireAuth } from '../middleware/auth.js';
import { generateLimiter } from '../middleware/rateLimit.js';
import { docsApi } from '../services/docsApi.js';
import { supabaseAdmin } from '../services/supabase.js';
import { config } from '../config.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// GET /documents/modules — lista de módulos ativos do sistema (do banco, sincronizados)
router.get('/modules', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('modules')
      .select('id, codigo, nome_exibicao, descricao, preco_creditos, icone_url, ativo, ordem')
      .eq('ativo', true)
      .order('ordem');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar documentos.' });
  }
});

// GET /documents/modules/:codigo — campos do módulo (da API, sempre fresco)
router.get('/modules/:codigo', requireAuth, async (req, res) => {
  try {
    const data = await docsApi.getModule(req.params.codigo);
    res.json(data);
  } catch (err) {
    const msg = err.response?.data?.mensagem || 'Erro ao buscar campos do documento.';
    res.status(err.response?.status || 500).json({ erro: msg });
  }
});

// GET /documents/catalogos/:nome — busca em catálogos (cursos, titulos, cid)
router.get('/catalogos/:nome', requireAuth, async (req, res) => {
  try {
    const data = await docsApi.getCatalog(req.params.nome, req.query.q || '');
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar catálogo.' });
  }
});

// POST /documents/preview
router.post('/preview', requireAuth, upload.any(), async (req, res) => {
  try {
    let modulo, dados;

    if (req.files?.length) {
      // multipart — parse campos do body
      modulo = req.body.modulo;
      dados = JSON.parse(req.body.dados || '{}');
      // repassar como multipart para a API
      const { FormData } = await import('formdata-node');
      const form = new FormData();
      form.set('modulo', modulo);
      form.set('dados', JSON.stringify(dados));
      for (const file of req.files) {
        // comprimir imagem se necessário
        let buf = file.buffer;
        if (file.mimetype.startsWith('image/') && buf.length > 2 * 1024 * 1024) {
          buf = await sharp(buf).resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
        }
        form.set(file.fieldname, new Blob([buf], { type: file.mimetype }), file.originalname);
      }
      const result = await docsApi.preview(modulo, dados, form);
      return res.json(result);
    }

    ({ modulo, dados } = req.body);
    const result = await docsApi.preview(modulo, dados);
    res.json(result);
  } catch (err) {
    const msg = err.response?.data?.mensagem || 'Erro ao gerar prévia.';
    res.status(err.response?.status || 500).json({ erro: msg });
  }
});

// POST /documents/generate
router.post('/generate', requireAuth, generateLimiter, upload.any(), async (req, res) => {
  let modulo, dados;
  try {
    // Verificar saldo
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('creditos')
      .eq('id', req.userId)
      .single();

    if (profileError) throw profileError;

    // Buscar preço do módulo
    if (req.files?.length) {
      modulo = req.body.modulo;
      dados = JSON.parse(req.body.dados || '{}');
    } else {
      ({ modulo, dados } = req.body);
    }

    const { data: moduleData } = await supabaseAdmin
      .from('modules')
      .select('preco_creditos, nome_exibicao')
      .eq('codigo', modulo)
      .single();

    const custoCreditos = moduleData?.preco_creditos ?? 1;

    if (profile.creditos < custoCreditos) {
      return res.status(402).json({ erro: `Créditos insuficientes. Necessário: ${custoCreditos}, Disponível: ${profile.creditos}.` });
    }

    const idempotencyKey = uuidv4();

    let result;
    if (req.files?.length) {
      const { FormData } = await import('formdata-node');
      const form = new FormData();
      form.set('modulo', modulo);
      form.set('dados', JSON.stringify(dados));
      for (const file of req.files) {
        let buf = file.buffer;
        if (file.mimetype.startsWith('image/') && buf.length > 2 * 1024 * 1024) {
          buf = await sharp(buf).resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
        }
        form.set(file.fieldname, new Blob([buf], { type: file.mimetype }), file.originalname);
      }
      result = await docsApi.generate(modulo, dados, idempotencyKey, form);
    } else {
      result = await docsApi.generate(modulo, dados, idempotencyKey);
    }

    // API confirmou — agora desconta créditos e salva PDF
    await supabaseAdmin.rpc('deduct_credits', { p_user_id: req.userId, p_amount: custoCreditos });

    // Baixar e salvar o PDF (links temporários)
    let pdfPath = null;
    if (result.pdf_url || result.url) {
      try {
        const pdfUrl = result.pdf_url || result.url;
        const response = await axios.get(pdfUrl, { responseType: 'arraybuffer', timeout: 30000 });
        const fileName = `${req.userId}/${idempotencyKey}.pdf`;
        await supabaseAdmin.storage.from(config.storage.pdfBucket).upload(fileName, response.data, {
          contentType: 'application/pdf',
          upsert: false,
        });
        pdfPath = fileName;
      } catch (storageErr) {
        console.error('[generate] erro ao salvar PDF:', storageErr.message);
      }
    }

    // Registrar no histórico
    const { data: docRecord } = await supabaseAdmin.from('generated_docs').insert({
      user_id: req.userId,
      modulo_codigo: modulo,
      documento_id_api: result.id || result.documento_id,
      pdf_path: pdfPath,
      creditos_cobrados: custoCreditos,
      nome_documento: moduleData?.nome_exibicao || modulo,
      dados_enviados: dados,
    }).select('id').single();

    // Notificação
    await supabaseAdmin.from('notifications').insert({
      user_id: req.userId,
      titulo: 'Documento gerado!',
      mensagem: `${moduleData?.nome_exibicao || 'Documento'} gerado com sucesso.`,
      tipo: 'sucesso',
    });

    // Comissão afiliado
    const { data: af } = await supabaseAdmin.from('affiliate_codes').select('referrer_id').eq('user_id', req.userId).maybeSingle();
    if (af?.referrer_id) {
      const comissao = Math.max(0, Math.floor(custoCreditos * 0.1)); // 10%
      if (comissao > 0) {
        await supabaseAdmin.rpc('add_credits', { p_user_id: af.referrer_id, p_amount: comissao });
        await supabaseAdmin.from('credit_history').insert({
          user_id: af.referrer_id,
          tipo: 'comissao_afiliado',
          valor: comissao,
          descricao: 'Comissão de afiliado',
        });
      }
    }

    res.json({
      ...result,
      doc_id: docRecord?.id,
      creditos_cobrados: custoCreditos,
      pdf_path: pdfPath,
    });
  } catch (err) {
    const msg = err.response?.data?.mensagem || err.message || 'Erro ao gerar documento.';
    console.error('[generate]', msg);
    res.status(err.response?.status || 500).json({ erro: msg });
  }
});

// GET /documents/history — histórico do usuário
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('generated_docs')
      .select('id, modulo_codigo, nome_documento, creditos_cobrados, pdf_path, created_at')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar histórico.' });
  }
});

// GET /documents/download/:id — link temporário para PDF
router.get('/download/:id', requireAuth, async (req, res) => {
  try {
    const { data: doc, error } = await supabaseAdmin
      .from('generated_docs')
      .select('pdf_path, user_id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !doc?.pdf_path) return res.status(404).json({ erro: 'Documento não encontrado.' });

    const { data: signedData, error: signError } = await supabaseAdmin.storage
      .from(config.storage.pdfBucket)
      .createSignedUrl(doc.pdf_path, 300); // 5 min

    if (signError) throw signError;
    res.json({ url: signedData.signedUrl });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar link de download.' });
  }
});

// POST /documents/calcular — campos automáticos
router.post('/calcular', requireAuth, async (req, res) => {
  try {
    const result = await docsApi.calcular(req.body.modulo, req.body.dados);
    res.json(result);
  } catch (err) {
    const msg = err.response?.data?.mensagem || 'Erro ao calcular campos.';
    res.status(500).json({ erro: msg });
  }
});

export default router;
