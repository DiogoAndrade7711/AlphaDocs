-- AlphaDocs — Migrations Supabase (PostgreSQL)
-- Execute no SQL Editor do Supabase ou via psql

-- =========================================
-- EXTENSÕES
-- =========================================
create extension if not exists "uuid-ossp";

-- =========================================
-- TABELAS
-- =========================================

-- Perfis de usuário
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  email text not null unique,
  whatsapp text,
  senha_hash text not null,
  creditos integer not null default 0 check (creditos >= 0),
  bloqueado boolean not null default false,
  aceitou_termos boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tabela separada de administradores (nunca no perfil/token)
create table if not exists admins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  created_at timestamptz not null default now()
);

-- Histórico de créditos
create table if not exists credit_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  tipo text not null, -- deposito, deducao, ajuste_manual, comissao_afiliado
  valor integer not null,
  descricao text,
  deposit_id uuid,
  created_at timestamptz not null default now()
);

-- Depósitos / pagamentos
create table if not exists deposits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  payment_id text,
  valor_brl numeric(10,2) not null,
  creditos integer not null,
  status text not null default 'pendente', -- pendente, aprovado, recusado
  pix_qr_code text,
  pix_qr_base64 text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- Módulos/Documentos sincronizados da API
create table if not exists modules (
  id uuid primary key default uuid_generate_v4(),
  codigo text not null unique,
  nome_exibicao text not null,
  descricao text,
  preco_creditos integer not null default 1,
  preco_api_brl numeric(10,2),
  icone_url text,
  ativo boolean not null default true,
  ordem integer not null default 0,
  campos_json jsonb,
  versao_ficha text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Documentos gerados
create table if not exists generated_docs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  modulo_codigo text not null,
  nome_documento text,
  documento_id_api text,
  pdf_path text,
  creditos_cobrados integer not null default 1,
  dados_enviados jsonb,
  created_at timestamptz not null default now()
);

-- Prévias (para painel admin)
create table if not exists previews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  modulo_codigo text not null,
  imagens_urls jsonb,
  created_at timestamptz not null default now()
);

-- Notificações
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  titulo text not null,
  mensagem text not null,
  tipo text not null default 'info', -- info, sucesso, erro
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

-- Reset de senha
create table if not exists password_resets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  usado boolean not null default false,
  created_at timestamptz not null default now()
);

-- Afiliados
create table if not exists affiliate_codes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade unique,
  codigo text not null unique,
  referrer_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Configurações do sistema
create table if not exists settings (
  id integer primary key default 1,
  nome_sistema text not null default 'AlphaDocs',
  cor_principal text not null default '#2563EB',
  preco_credito numeric(10,2) not null default 25.00,
  whatsapp_suporte text default '5584998286504',
  termos_de_uso text default 'Os documentos são modelos para fins legítimos (estudo, demonstração, organização pessoal, layouts e testes). O usuário é responsável pelo uso. É proibido usar o sistema para enganar pessoas, falsificar documentos oficiais ou cometer qualquer ilegalidade.',
  constraint single_row check (id = 1)
);
insert into settings (id) values (1) on conflict do nothing;

-- Log de auditoria
create table if not exists audit_logs (
  id uuid primary key default uuid_generate_v4(),
  admin_id uuid references profiles(id),
  acao text not null,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

-- =========================================
-- FUNÇÕES RPC
-- =========================================

create or replace function add_credits(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
begin
  update profiles set creditos = creditos + p_amount where id = p_user_id;
end;
$$;

create or replace function deduct_credits(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
begin
  update profiles set creditos = creditos - p_amount
  where id = p_user_id and creditos >= p_amount;
  if not found then
    raise exception 'Créditos insuficientes';
  end if;
end;
$$;

create or replace function report_sales_by_day()
returns table(dia date, total_brl numeric, total_depositos bigint)
language sql security definer as $$
  select date(created_at) as dia,
         sum(valor_brl) as total_brl,
         count(*) as total_depositos
  from deposits where status = 'aprovado'
  group by dia order by dia desc limit 30;
$$;

create or replace function report_top_docs()
returns table(modulo_codigo text, nome_documento text, total bigint)
language sql security definer as $$
  select modulo_codigo, nome_documento, count(*) as total
  from generated_docs
  group by modulo_codigo, nome_documento
  order by total desc limit 10;
$$;

-- =========================================
-- RLS — ROW LEVEL SECURITY
-- =========================================

alter table profiles enable row level security;
alter table credit_history enable row level security;
alter table deposits enable row level security;
alter table generated_docs enable row level security;
alter table previews enable row level security;
alter table notifications enable row level security;
alter table password_resets enable row level security;
alter table affiliate_codes enable row level security;
alter table admins enable row level security;
alter table modules enable row level security;
alter table settings enable row level security;
alter table audit_logs enable row level security;

-- profiles: usuário vê só seus dados; service_role vê tudo
create policy "user_own_profile" on profiles for all using (auth.uid() = id);

-- credit_history
create policy "user_own_history" on credit_history for all using (auth.uid() = user_id);

-- deposits
create policy "user_own_deposits" on deposits for all using (auth.uid() = user_id);

-- generated_docs
create policy "user_own_docs" on generated_docs for all using (auth.uid() = user_id);

-- previews
create policy "user_own_previews" on previews for all using (auth.uid() = user_id);

-- notifications
create policy "user_own_notifications" on notifications for all using (auth.uid() = user_id);

-- password_resets — acesso via service_role apenas
create policy "no_direct_access" on password_resets for all using (false);

-- affiliate_codes
create policy "user_own_affiliate" on affiliate_codes for all using (auth.uid() = user_id);

-- modules: leitura pública (autenticado), escrita só service_role
create policy "modules_read" on modules for select using (auth.role() = 'authenticated');

-- settings: leitura pública, escrita service_role
create policy "settings_read" on settings for select using (auth.role() = 'authenticated');

-- admins / audit_logs: só service_role
create policy "no_direct_admins" on admins for all using (false);
create policy "no_direct_audit" on audit_logs for all using (false);

-- =========================================
-- STORAGE — bucket privado para PDFs
-- =========================================
-- Execute via dashboard Supabase > Storage ou API
-- insert into storage.buckets (id, name, public) values ('alphadocs-pdfs', 'alphadocs-pdfs', false);

-- =========================================
-- TRIGGER updated_at
-- =========================================
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on profiles for each row execute function update_updated_at();
create trigger modules_updated_at before update on modules for each row execute function update_updated_at();
