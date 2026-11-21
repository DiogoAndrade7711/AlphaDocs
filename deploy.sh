#!/bin/bash
# ============================================================
# AlphaDocs — Script de deploy automático
# Execute: bash deploy.sh
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔══════════════════════════════════╗${NC}"
echo -e "${CYAN}║      AlphaDocs — Deploy          ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════╝${NC}"
echo ""

# ── 1. Verificar Node.js ─────────────────────────────────────
echo -e "${YELLOW}[1/5] Verificando Node.js...${NC}"
NODE_VERSION=$(node -v 2>/dev/null | cut -d. -f1 | tr -d 'v')
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ Node.js 18+ é necessário. Baixe em https://nodejs.org${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v) detectado${NC}"

# ── 2. Verificar Git ─────────────────────────────────────────
echo -e "${YELLOW}[2/5] Verificando Git...${NC}"
if ! command -v git &> /dev/null; then
  echo -e "${RED}✗ Git não encontrado. Instale em https://git-scm.com${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Git $(git --version | awk '{print $3}') detectado${NC}"

# ── 3. Instalar dependências ─────────────────────────────────
echo -e "${YELLOW}[3/5] Instalando dependências...${NC}"
npm install --silent
npm install --prefix server --silent
npm install --prefix client --silent
echo -e "${GREEN}✓ Dependências instaladas${NC}"

# ── 4. Git init e commit ─────────────────────────────────────
echo -e "${YELLOW}[4/5] Preparando repositório Git...${NC}"

if [ ! -d ".git" ]; then
  git init
  git branch -M main
  echo -e "${GREEN}✓ Repositório Git criado${NC}"
else
  echo -e "${GREEN}✓ Repositório Git já existe${NC}"
fi

git add .
git commit -m "feat: AlphaDocs — deploy inicial" 2>/dev/null || git commit --allow-empty -m "chore: atualizar projeto" 2>/dev/null || true
echo -e "${GREEN}✓ Commit criado${NC}"

# ── 5. Configurar remote ─────────────────────────────────────
echo -e "${YELLOW}[5/5] Configurando GitHub...${NC}"
echo ""

CURRENT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")

if [ -n "$CURRENT_REMOTE" ]; then
  echo -e "${GREEN}✓ Remote já configurado: $CURRENT_REMOTE${NC}"
  echo ""
  echo -e "${CYAN}Enviando para o GitHub...${NC}"
  git push -u origin main --force
else
  echo -e "${YELLOW}Cole a URL do seu repositório GitHub:${NC}"
  echo -e "  (ex: https://github.com/seunome/alphadocs.git)"
  echo ""
  read -p "URL: " REPO_URL

  if [ -z "$REPO_URL" ]; then
    echo -e "${RED}URL não informada. Configure manualmente com:${NC}"
    echo "  git remote add origin SUA_URL"
    echo "  git push -u origin main"
    exit 1
  fi

  git remote add origin "$REPO_URL"
  echo ""
  echo -e "${CYAN}Enviando para o GitHub...${NC}"
  git push -u origin main --force
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Código enviado para o GitHub com sucesso!            ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  PRÓXIMO PASSO: Deploy no Render${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Acesse https://dashboard.render.com"
echo "2. Clique em  New  →  Blueprint"
echo "3. Conecte sua conta GitHub se necessário"
echo "4. Selecione o repositório  alphadocs"
echo "5. O Render vai ler o arquivo render.yaml e criar"
echo "   automaticamente o backend e o frontend"
echo ""
echo -e "${YELLOW}══ Variáveis que você DEVE preencher no Render ══${NC}"
echo ""
echo "  No serviço  alphadocs-api  → Environment:"
echo ""
echo "  SUPABASE_URL              → Supabase > Settings > API > Project URL"
echo "  SUPABASE_ANON_KEY         → Supabase > Settings > API > anon key"
echo "  SUPABASE_SERVICE_ROLE_KEY → Supabase > Settings > API > service_role key"
echo "  JWT_SECRET                → qualquer string longa aleatória (min 64 chars)"
echo "  DOCS_API_KEY              → sua chave no painel do serviço de documentos"
echo "  MP_ACCESS_TOKEN           → Mercado Pago > Credenciais > Produção"
echo "  SMTP_HOST / SMTP_USER / SMTP_PASS → dados do seu e-mail"
echo "  CLIENT_URL                → URL do frontend (preencha depois do deploy do frontend)"
echo ""
echo -e "${YELLOW}══ Depois que os dois serviços estiverem no ar ══${NC}"
echo ""
echo "  1. Copie a URL do alphadocs-frontend"
echo "  2. Cole em CLIENT_URL no alphadocs-api e salve"
echo "  3. Acesse a URL do frontend"
echo "  4. Crie sua conta"
echo "  5. No Supabase SQL Editor, execute:"
echo ""
echo "     insert into admins (user_id)"
echo "     select id from profiles where email = 'SEU_EMAIL';"
echo ""
echo "  6. Faça login e vá em /admin → Módulos → Atualizar catálogo"
echo ""
echo -e "${GREEN}Pronto! 🚀${NC}"
echo ""
