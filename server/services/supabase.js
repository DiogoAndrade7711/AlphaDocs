import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Cliente com service role — acesso total, só no servidor
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Cliente anônimo para operações que respeitam RLS com JWT do usuário
export function supabaseForUser(accessToken) {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
