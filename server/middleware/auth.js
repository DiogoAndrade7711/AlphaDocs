import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { supabaseAdmin } from '../services/supabase.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não fornecido.' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    // Verificar se usuário ainda existe e não está bloqueado
    const { data: user, error } = await supabaseAdmin
      .from('profiles')
      .select('id, bloqueado')
      .eq('id', payload.sub)
      .single();

    if (error || !user) return res.status(401).json({ erro: 'Usuário não encontrado.' });
    if (user.bloqueado) return res.status(403).json({ erro: 'Conta bloqueada. Entre em contato com o suporte.' });

    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ erro: 'Token inválido ou expirado.' });
  }
}
