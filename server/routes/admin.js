import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';
import { supabaseAdmin } from '../services/supabase.js';
import { docsApi } from '../services/docsApi.js';

const router = Router();
router.use(requireAuth, requireAdmin);

function auditLog(adminId, acao, detalhes = {}) {
  return supabaseAdmin.from('audit_logs').insert({ admin_id: adminId, acao, detalhes });
}

// GET /admin/summary
router.get('/summary', async (req, res) => {
  try {
    const [
      { count: totalUsuarios },
      depositsToday,
      depositsMonth,
      { count: totalPrevias },
      { count: totalDocs },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('deposits').select('valor_brl').eq('status', 'aprovado').gte('created_at', new Date().toISOString().slice(0, 10)),
      supabaseAdmin.from('deposits').select('valor_brl').eq('status', 'aprovado').gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabaseAdmin.from('previews').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('generated_docs').select('id', { count: 'exact', head: true }),
    ]);

    const totalHojeR = depositsToday.data?.reduce((s, d) => s + (d.valor_brl || 0), 0) || 0;
    const totalMesR = depositsMonth.data?.reduce((s, d) => s + (d.valor_brl || 0), 0) || 0;

    let apiAccount = null;
    try { apiAccount = await docsApi.getAccount(); } catch {}

    res.json({
      total_usuarios: totalUsuarios,
      deposito_hoje_brl: totalHojeR,
      deposito_mes_brl: totalMesR,
      total_previas: totalPrevias,
      total_docs_gerados: totalDocs,
      api_saldo: apiAccount?.saldo,
    });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar resumo.' });
  }
});

// --- USUÁRIOS ---
router.get('/users', async (req, res) => {
  try {
    const { q, bloqueado, page = 1 } = req.query;
    let query = supabaseAdmin.from('profiles').select('id, nome, email, whatsapp, creditos, bloqueado, created_at', { count: 'exact' });
    if (q) query = query.or(`nome.ilike.%${q}%,email.ilike.%${q}%`);
    if (bloqueado !== undefined) query = query.eq('bloqueado', bloqueado === 'true');
    query = query.order('created_at', { ascending: false }).range((page - 1) * 20, page * 20 - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ data, total: count });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuários.' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const [
      { data: profile },
      { data: history },
      { data: docs },
      { data: deposits },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*').eq('id', req.params.id).single(),
      supabaseAdmin.from('credit_history').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(30),
      supabaseAdmin.from('generated_docs').select('id, nome_documento, creditos_cobrados, created_at').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(20),
      supabaseAdmin.from('deposits').select('*').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(20),
    ]);
    if (!profile) return res.status(404).json({ erro: 'Usuário não encontrado.' });
    const { data: adminRow } = await supabaseAdmin.from('admins').select('id').eq('user_id', req.params.id).maybeSingle();
    res.json({ ...profile, is_admin: !!adminRow, credit_history: history, docs, deposits });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar usuário.' });
  }
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { nome, email, whatsapp } = req.body;
    const updates = {};
    if (nome) updates.nome = nome;
    if (email) updates.email = email.toLowerCase();
    if (whatsapp) updates.whatsapp = whatsapp.replace(/\D/g, '');
    const { data, error } = await supabaseAdmin.from('profiles').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    await auditLog(req.userId, 'editar_usuario', { target_id: req.params.id, campos: Object.keys(updates) });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao editar usuário.' });
  }
});

router.patch('/users/:id/password', async (req, res) => {
  try {
    const { nova_senha } = req.body;
    if (!nova_senha || nova_senha.length < 8) return res.status(400).json({ erro: 'Senha deve ter pelo menos 8 caracteres.' });
    const hash = await bcrypt.hash(nova_senha, 12);
    await supabaseAdmin.from('profiles').update({ senha_hash: hash }).eq('id', req.params.id);
    await auditLog(req.userId, 'trocar_senha_usuario', { target_id: req.params.id });
    res.json({ mensagem: 'Senha alterada.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao alterar senha.' });
  }
});

router.patch('/users/:id/block', async (req, res) => {
  try {
    const { bloqueado } = req.body;
    await supabaseAdmin.from('profiles').update({ bloqueado }).eq('id', req.params.id);
    await auditLog(req.userId, bloqueado ? 'bloquear_usuario' : 'desbloquear_usuario', { target_id: req.params.id });
    res.json({ mensagem: bloqueado ? 'Usuário bloqueado.' : 'Usuário desbloqueado.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao alterar bloqueio.' });
  }
});

router.post('/users/:id/credits', async (req, res) => {
  try {
    const { valor, motivo } = req.body;
    if (!valor || !motivo) return res.status(400).json({ erro: 'Valor e motivo são obrigatórios.' });
    const amount = parseInt(valor);
    if (amount === 0) return res.status(400).json({ erro: 'Valor não pode ser zero.' });

    if (amount > 0) {
      await supabaseAdmin.rpc('add_credits', { p_user_id: req.params.id, p_amount: amount });
    } else {
      await supabaseAdmin.rpc('deduct_credits', { p_user_id: req.params.id, p_amount: Math.abs(amount) });
    }
    await supabaseAdmin.from('credit_history').insert({
      user_id: req.params.id,
      tipo: 'ajuste_manual',
      valor: amount,
      descricao: `Ajuste manual: ${motivo}`,
    });
    await auditLog(req.userId, 'ajuste_creditos', { target_id: req.params.id, valor: amount, motivo });
    res.json({ mensagem: 'Créditos ajustados.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao ajustar créditos.' });
  }
});

router.patch('/users/:id/admin', async (req, res) => {
  try {
    const { isAdmin } = req.body;
    if (isAdmin) {
      await supabaseAdmin.from('admins').upsert({ user_id: req.params.id });
    } else {
      await supabaseAdmin.from('admins').delete().eq('user_id', req.params.id);
    }
    await auditLog(req.userId, isAdmin ? 'tornar_admin' : 'remover_admin', { target_id: req.params.id });
    res.json({ mensagem: `Papel de administrador ${isAdmin ? 'concedido' : 'removido'}.` });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao alterar papel.' });
  }
});

// --- DEPÓSITOS ---
router.get('/deposits', async (req, res) => {
  try {
    const { status, inicio, fim, page = 1 } = req.query;
    let query = supabaseAdmin
      .from('deposits')
      .select('id, user_id, profiles!inner(nome, email), valor_brl, creditos, status, created_at', { count: 'exact' });
    if (status) query = query.eq('status', status);
    if (inicio) query = query.gte('created_at', inicio);
    if (fim) query = query.lte('created_at', fim);
    query = query.order('created_at', { ascending: false }).range((page - 1) * 30, page * 30 - 1);
    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ data, total: count });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar depósitos.' });
  }
});

router.patch('/deposits/:id/approve', async (req, res) => {
  try {
    const { data: deposit } = await supabaseAdmin.from('deposits').select('*').eq('id', req.params.id).single();
    if (!deposit) return res.status(404).json({ erro: 'Depósito não encontrado.' });
    if (deposit.status === 'aprovado') return res.status(400).json({ erro: 'Já aprovado.' });

    await supabaseAdmin.from('deposits').update({ status: 'aprovado' }).eq('id', req.params.id);
    await supabaseAdmin.rpc('add_credits', { p_user_id: deposit.user_id, p_amount: deposit.creditos });
    await supabaseAdmin.from('credit_history').insert({
      user_id: deposit.user_id,
      tipo: 'deposito',
      valor: deposit.creditos,
      descricao: `Depósito aprovado manualmente — ${deposit.creditos} crédito(s)`,
      deposit_id: deposit.id,
    });
    await auditLog(req.userId, 'aprovar_deposito', { deposit_id: req.params.id });
    res.json({ mensagem: 'Depósito aprovado.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao aprovar depósito.' });
  }
});

router.patch('/deposits/:id/reject', async (req, res) => {
  try {
    await supabaseAdmin.from('deposits').update({ status: 'recusado' }).eq('id', req.params.id);
    await auditLog(req.userId, 'recusar_deposito', { deposit_id: req.params.id });
    res.json({ mensagem: 'Depósito recusado.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao recusar depósito.' });
  }
});

// --- MÓDULOS / CATÁLOGO ---
router.get('/modules', async (req, res) => {
  try {
    const { data } = await supabaseAdmin.from('modules').select('*').order('ordem');
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar módulos.' });
  }
});

router.patch('/modules/:id', async (req, res) => {
  try {
    const { nome_exibicao, descricao, preco_creditos, icone_url, ativo, ordem } = req.body;
    const updates = {};
    if (nome_exibicao !== undefined) updates.nome_exibicao = nome_exibicao;
    if (descricao !== undefined) updates.descricao = descricao;
    if (preco_creditos !== undefined) updates.preco_creditos = preco_creditos;
    if (icone_url !== undefined) updates.icone_url = icone_url;
    if (ativo !== undefined) updates.ativo = ativo;
    if (ordem !== undefined) updates.ordem = ordem;

    const { data, error } = await supabaseAdmin.from('modules').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    await auditLog(req.userId, 'editar_modulo', { module_id: req.params.id, campos: Object.keys(updates) });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao editar módulo.' });
  }
});

router.post('/modules/sync', async (req, res) => {
  try {
    const [version, modules] = await Promise.all([docsApi.getCatalogVersion(), docsApi.getModules()]);
    const list = Array.isArray(modules) ? modules : (modules.modulos || modules.data || []);

    for (const mod of list) {
      const moduleDetail = await docsApi.getModule(mod.codigo);
      await supabaseAdmin.from('modules').upsert({
        codigo: mod.codigo,
        nome_exibicao: mod.nome || `Documento ${mod.codigo.replace('doc-', '')}`,
        descricao: mod.descricao || '',
        preco_api_brl: mod.preco || moduleDetail?.preco,
        campos_json: moduleDetail?.campos || [],
        versao_ficha: moduleDetail?.versao_ficha || version?.versao,
        ativo: true,
      }, { onConflict: 'codigo', ignoreDuplicates: false });
    }

    await auditLog(req.userId, 'sincronizar_catalogo', { modulos: list.length });
    res.json({ mensagem: `${list.length} módulos sincronizados.` });
  } catch (err) {
    console.error('[sync]', err.message);
    res.status(500).json({ erro: 'Erro ao sincronizar catálogo.' });
  }
});

// --- API EXTERNA ---
router.get('/api-account', async (req, res) => {
  try {
    const data = await docsApi.getAccount();
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar saldo da API.' });
  }
});

router.get('/api-statement', async (req, res) => {
  try {
    const data = await docsApi.getStatement(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar extrato.' });
  }
});

router.get('/api-usage', async (req, res) => {
  try {
    const data = await docsApi.getUsage(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar consumo.' });
  }
});

router.post('/api-recharge', async (req, res) => {
  try {
    const data = await docsApi.recharge(req.body);
    res.json(data);
  } catch (err) {
    const msg = err.response?.data?.mensagem || 'Erro ao recarregar.';
    res.status(500).json({ erro: msg });
  }
});

// --- CONFIGURAÇÕES ---
router.get('/settings', async (req, res) => {
  try {
    const { data } = await supabaseAdmin.from('settings').select('*').single();
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar configurações.' });
  }
});

router.patch('/settings', async (req, res) => {
  try {
    const allowed = ['nome_sistema', 'cor_principal', 'preco_credito', 'whatsapp_suporte', 'termos_de_uso'];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    const { data } = await supabaseAdmin.from('settings').update(updates).eq('id', 1).select().single();
    await auditLog(req.userId, 'editar_configuracoes', { campos: Object.keys(updates) });
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar configurações.' });
  }
});

// --- AUDITORIA ---
router.get('/audit', async (req, res) => {
  try {
    const { data } = await supabaseAdmin
      .from('audit_logs')
      .select('id, acao, detalhes, created_at, profiles!admin_id(nome, email)')
      .order('created_at', { ascending: false })
      .limit(100);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar auditoria.' });
  }
});

// --- DOCUMENTOS GERADOS (admin view) ---
router.get('/generated', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    let query = supabaseAdmin
      .from('generated_docs')
      .select('id, nome_documento, creditos_cobrados, created_at, pdf_path, profiles!inner(nome, email)', { count: 'exact' });
    if (q) query = query.ilike('nome_documento', `%${q}%`);
    query = query.order('created_at', { ascending: false }).range((page - 1) * 30, page * 30 - 1);
    const { data, count } = await query;
    res.json({ data, total: count });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar documentos.' });
  }
});

// --- RELATÓRIOS ---
router.get('/reports/sales', async (req, res) => {
  try {
    const { data } = await supabaseAdmin.rpc('report_sales_by_day');
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar relatório.' });
  }
});

router.get('/reports/top-docs', async (req, res) => {
  try {
    const { data } = await supabaseAdmin.rpc('report_top_docs');
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao gerar relatório.' });
  }
});

export default router;
