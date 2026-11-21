import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabaseAdmin } from '../services/supabase.js';
import { email as emailService } from '../services/email.js';
import { config } from '../config.js';
import { loginLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

function signToken(userId, userEmail) {
  return jwt.sign({ sub: userId, email: userEmail }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { nome, email, whatsapp, senha, aceitou_termos } = req.body;

    if (!nome || !email || !whatsapp || !senha || !aceitou_termos) {
      return res.status(400).json({ erro: 'Todos os campos são obrigatórios.' });
    }
    if (senha.length < 8) {
      return res.status(400).json({ erro: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    // Verificar se e-mail já existe
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) return res.status(409).json({ erro: 'E-mail já cadastrado.' });

    const hash = await bcrypt.hash(senha, 12);

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        whatsapp: whatsapp.replace(/\D/g, ''),
        senha_hash: hash,
        aceitou_termos: true,
        creditos: 0,
      })
      .select('id, email, nome')
      .single();

    if (error) throw error;

    // Código de afiliado
    const affiliateCode = crypto.randomBytes(4).toString('hex');
    await supabaseAdmin.from('affiliate_codes').insert({ user_id: profile.id, codigo: affiliateCode });

    emailService.sendWelcome(profile.email, profile.nome).catch(() => {});

    const token = signToken(profile.id, profile.email);
    res.status(201).json({ token, usuario: { id: profile.id, nome: profile.nome, email: profile.email } });
  } catch (err) {
    console.error('[register]', err.message);
    res.status(500).json({ erro: 'Erro ao criar conta.' });
  }
});

// POST /auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha são obrigatórios.' });

    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, nome, senha_hash, bloqueado, creditos')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
    if (user.bloqueado) return res.status(403).json({ erro: 'Conta bloqueada. Entre em contato com o suporte.' });

    const ok = await bcrypt.compare(senha, user.senha_hash);
    if (!ok) return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    // Verificar se é admin
    const { data: adminRow } = await supabaseAdmin.from('admins').select('id').eq('user_id', user.id).maybeSingle();

    const token = signToken(user.id, user.email);
    res.json({
      token,
      usuario: { id: user.id, nome: user.nome, email: user.email, creditos: user.creditos, isAdmin: !!adminRow },
    });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ erro: 'Erro ao fazer login.' });
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ erro: 'E-mail obrigatório.' });

    const { data: user } = await supabaseAdmin
      .from('profiles')
      .select('id, nome, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    // Responder sempre OK para não revelar se e-mail existe
    if (!user) return res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1h

    await supabaseAdmin.from('password_resets').upsert({
      user_id: user.id,
      token: resetToken,
      expires_at: expiresAt,
    });

    const link = `${config.clientUrl}/redefinir-senha?token=${resetToken}`;
    await emailService.sendPasswordReset(user.email, user.nome, link);

    res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });
  } catch (err) {
    console.error('[forgot-password]', err.message);
    res.status(500).json({ erro: 'Erro ao processar solicitação.' });
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, nova_senha } = req.body;
    if (!token || !nova_senha) return res.status(400).json({ erro: 'Token e nova senha são obrigatórios.' });
    if (nova_senha.length < 8) return res.status(400).json({ erro: 'A senha deve ter pelo menos 8 caracteres.' });

    const { data: reset, error } = await supabaseAdmin
      .from('password_resets')
      .select('user_id, expires_at, usado')
      .eq('token', token)
      .single();

    if (error || !reset) return res.status(400).json({ erro: 'Token inválido ou expirado.' });
    if (reset.usado) return res.status(400).json({ erro: 'Token já utilizado.' });
    if (new Date(reset.expires_at) < new Date()) return res.status(400).json({ erro: 'Token expirado.' });

    const hash = await bcrypt.hash(nova_senha, 12);
    await supabaseAdmin.from('profiles').update({ senha_hash: hash }).eq('id', reset.user_id);
    await supabaseAdmin.from('password_resets').update({ usado: true }).eq('token', token);

    res.json({ mensagem: 'Senha redefinida com sucesso.' });
  } catch (err) {
    console.error('[reset-password]', err.message);
    res.status(500).json({ erro: 'Erro ao redefinir senha.' });
  }
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('id, nome, email, whatsapp, creditos, created_at')
      .eq('id', req.userId)
      .single();

    if (error || !user) return res.status(404).json({ erro: 'Usuário não encontrado.' });

    const { data: adminRow } = await supabaseAdmin.from('admins').select('id').eq('user_id', req.userId).maybeSingle();
    const { data: affiliateCode } = await supabaseAdmin.from('affiliate_codes').select('codigo').eq('user_id', req.userId).maybeSingle();

    res.json({ ...user, isAdmin: !!adminRow, codigo_afiliado: affiliateCode?.codigo });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar dados.' });
  }
});

// PATCH /auth/profile
router.patch('/profile', requireAuth, async (req, res) => {
  try {
    const { nome, whatsapp } = req.body;
    const updates = {};
    if (nome) updates.nome = nome.trim();
    if (whatsapp) updates.whatsapp = whatsapp.replace(/\D/g, '');

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.userId)
      .select('id, nome, email, whatsapp')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar perfil.' });
  }
});

// PATCH /auth/change-password
router.patch('/change-password', requireAuth, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;
    if (!senha_atual || !nova_senha) return res.status(400).json({ erro: 'Senhas obrigatórias.' });
    if (nova_senha.length < 8) return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 8 caracteres.' });

    const { data: user } = await supabaseAdmin.from('profiles').select('senha_hash').eq('id', req.userId).single();
    const ok = await bcrypt.compare(senha_atual, user.senha_hash);
    if (!ok) return res.status(400).json({ erro: 'Senha atual incorreta.' });

    const hash = await bcrypt.hash(nova_senha, 12);
    await supabaseAdmin.from('profiles').update({ senha_hash: hash }).eq('id', req.userId);
    res.json({ mensagem: 'Senha alterada com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao alterar senha.' });
  }
});

export default router;
