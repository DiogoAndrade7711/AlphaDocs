# AlphaDocs

Plataforma completa para geração de documentos profissionais em PDF via formulário inteligente, com créditos, Pix automático e painel administrativo.

---

## Stack

- **Backend:** Node.js 20+ · Express · ESM
- **Frontend:** React 18 · Vite · React Router 6
- **Banco / Auth / Storage:** Supabase (PostgreSQL com RLS + Storage privado)
- **Pagamento:** Mercado Pago (Pix automático)
- **API de documentos:** configurada via `DOCS_API_KEY`

---

## Pré-requisitos

- Node.js 20+
- Conta no [Supabase](https://supabase.com) (gratuita)
- Conta no [Mercado Pago Developers](https://www.mercadopago.com.br/developers) para Pix
- Chave `DOCS_API_KEY` fornecida pelo serviço de documentos

---

## Instalação passo a passo

### 1. Clonar e instalar dependências

```bash
git clone <repo> alphadocs
cd alphadocs
npm run install:all
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Abra `.env` e preencha:

| Variável | Onde obter |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role key ⚠ secreta |
| `JWT_SECRET` | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `DOCS_API_KEY` | Painel do serviço de documentos → Minha API |
| `MP_ACCESS_TOKEN` | Mercado Pago Developers → Credenciais → Produção |
| `SMTP_*` | Dados do seu servidor de e-mail (Gmail, Brevo, SendGrid…) |

### 3. Configurar o banco de dados (Supabase)

1. Acesse **Supabase → SQL Editor**
2. Cole o conteúdo de `server/db/migrations.sql` e execute
3. Vá em **Storage → New bucket**, crie um bucket chamado `alphadocs-pdfs` com visibilidade **Private**

### 4. Criar o bucket de PDFs via SQL (alternativa ao passo 3-Storage)

```sql
insert into storage.buckets (id, name, public)
values ('alphadocs-pdfs', 'alphadocs-pdfs', false);
```

### 5. Criar o primeiro admin

Após criar sua conta pelo sistema, execute no SQL Editor do Supabase:

```sql
insert into admins (user_id)
select id from profiles where email = 'seu@email.com';
```

### 6. Rodar em desenvolvimento

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### 7. Build para produção

```bash
npm run build   # gera /server/public com o frontend
npm run start   # sobe o servidor Express servindo o frontend
```

Configure seu servidor (Nginx, Railway, Fly.io, etc.) para apontar para a porta 3001.

---

## Configurações pós-instalação

1. Acesse `/admin` com a conta admin criada
2. Vá em **Módulos → Atualizar catálogo** para sincronizar os documentos disponíveis
3. Configure os preços, nome do sistema e WhatsApp de suporte em **Configurações**
4. Verifique o saldo da API em **API externa**

---

## Segurança

- A chave `DOCS_API_KEY` fica **somente** no servidor — nunca no frontend
- RLS ativo em todas as tabelas — cada usuário acessa apenas seus próprios dados
- PDFs armazenados em bucket privado com links temporários (5 min)
- Papéis admin verificados no servidor em cada requisição
- Rate limit em login (10/15min) e geração (5/min)
- Senhas com bcrypt (salt 12)
- Webhook do Mercado Pago verificado por HMAC SHA-256
- Nunca registre `DOCS_API_KEY` em logs

---

## Decisões de projeto

**Por que Supabase?** RLS nativo, Storage integrado, PostgreSQL com suporte a RPCs — elimina infraestrutura extra e mantém a segurança de dados.

**Por que Mercado Pago?** Gateway mais usado no Brasil para Pix automático com webhook confiável. O `.env` aceita troca para qualquer gateway desde que `services/payment.js` seja adaptado.

**Formulário dinâmico:** `DynamicForm.jsx` lê o schema da API em tempo real via `GET /modules/{codigo}` — suporta todos os tipos de campo, catálogos com busca, campos calculados/automáticos, variantes e seção de médico. Nunca assume estrutura fixa.

**PDF seguro:** os links da API são temporários. O servidor baixa o PDF imediatamente após a geração e salva no Supabase Storage privado. Downloads são via link assinado com expiração de 5 minutos.
