import { supabaseAdmin } from '../services/supabase.js';

// Sempre verificado no servidor via tabela separada — nunca no token/perfil
export async function requireAdmin(req, res, next) {
  const { data, error } = await supabaseAdmin
    .from('admins')
    .select('id')
    .eq('user_id', req.userId)
    .single();

  if (error || !data) {
    return res.status(403).json({ erro: 'Acesso restrito a administradores.' });
  }
  req.isAdmin = true;
  next();
}
