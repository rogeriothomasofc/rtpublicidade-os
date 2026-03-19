#!/bin/bash
# ============================================================
#  Agency OS — Script de Instalação
#  Compatível com Ubuntu 20.04+ / Debian 11+
#
#  Este script instala as dependências e sobe o assistente
#  de configuração. Você finaliza pelo navegador.
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

REPO_URL="https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git"
APP_DIR="/opt/agencyos"
NGINX_CONF="/etc/nginx/sites-available/agencyos"

# ── Encontrar porta livre automaticamente ───────────────────
find_free_port() {
  for port in 3000 3001 3002 3003 3004 3005 3010 3333 4000 4001 4444 5000 8181 8282 8383 9000 9001; do
    if ! ss -tlnH "sport = :$port" 2>/dev/null | grep -q .; then
      echo "$port"
      return
    fi
  done
  # fallback: pede ao kernel uma porta livre
  python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()" 2>/dev/null || echo 3000
}

SETUP_PORT=$(find_free_port)

print_banner() {
  echo -e "${GREEN}"
  echo "  ╔════════════════════════════════════════════╗"
  echo "  ║          Agency OS — Instalação            ║"
  echo "  ║     Sistema para Agências de Marketing     ║"
  echo "  ╚════════════════════════════════════════════╝"
  echo -e "${NC}"
}

step() { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
error_exit() { echo -e "${RED}✖ ERRO: $1${NC}"; exit 1; }

# ── Verificar root ──────────────────────────────────────────
[ "$EUID" -ne 0 ] && error_exit "Execute como root: sudo bash install.sh"

print_banner

echo -e "${BOLD}Antes de começar, certifique-se de que:${NC}"
echo ""
echo "  ✔ O domínio já está apontando para o IP deste servidor"
echo "  ✔ Você tem uma conta gratuita em supabase.com"
echo ""
read -p "Pressione ENTER para continuar..."

# ── Coletar apenas o domínio ────────────────────────────────
step "Configuração inicial"

read -p "  Domínio do sistema (ex: app.minhaagencia.com.br): " DOMAIN
[ -z "$DOMAIN" ] && error_exit "Domínio é obrigatório"

echo ""
echo -e "${YELLOW}  O restante da configuração será feito pelo navegador.${NC}"
echo ""

# ── Atualizar sistema ───────────────────────────────────────
step "Atualizando sistema"
apt-get update -qq && apt-get upgrade -y -qq
apt-get install -y curl jq git -qq
ok "Sistema atualizado"

# ── Node.js 20 ──────────────────────────────────────────────
step "Instalando Node.js"
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -qq
  apt-get install -y nodejs -qq
fi
ok "Node.js $(node -v)"

# ── Nginx ───────────────────────────────────────────────────
step "Instalando Nginx"
if ! command -v nginx &>/dev/null; then
  apt-get install -y nginx -qq
fi
ok "Nginx $(nginx -v 2>&1 | grep -o '[0-9.]*')"

# ── Certbot ─────────────────────────────────────────────────
if ! command -v certbot &>/dev/null; then
  apt-get install -y certbot python3-certbot-nginx -qq
fi

# ── Supabase CLI ────────────────────────────────────────────
if ! command -v supabase &>/dev/null; then
  step "Instalando Supabase CLI"
  npm install -g supabase --silent
  ok "Supabase CLI instalado"
fi

# ── Clonar repositório ──────────────────────────────────────
step "Baixando Agency OS"
if [ -d "$APP_DIR" ]; then
  warn "Diretório $APP_DIR já existe. Atualizando..."
  cd "$APP_DIR" && git pull -q
else
  git clone -q "$REPO_URL" "$APP_DIR"
fi
ok "Código em $APP_DIR"

# ── Instalar dependências do Node ───────────────────────────
step "Instalando dependências do projeto"
cd "$APP_DIR"
npm install --silent
ok "Dependências instaladas"

# ── Nginx: proxy para o servidor de setup ───────────────────
step "Configurando Nginx (modo setup)"

cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:$SETUP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/agencyos
rm -f /etc/nginx/sites-enabled/default
nginx -t -q && systemctl reload nginx
ok "Nginx configurado (proxy → setup)"

# ── SSL com Let's Encrypt ───────────────────────────────────
step "Configurando SSL (HTTPS)"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
  --email "admin@$DOMAIN" --redirect -q 2>/dev/null && \
  ok "HTTPS ativo" || warn "SSL não configurado. Continuando via HTTP."

# ── Gerar token do update agent ─────────────────────────────
AGENT_PORT=$(find_free_port)
UPDATE_TOKEN=$(openssl rand -hex 32)
echo "$UPDATE_TOKEN" > "$APP_DIR/.update-token"
chmod 600 "$APP_DIR/.update-token"
echo "$AGENT_PORT"   > "$APP_DIR/.agent-port"
ok "Token de atualização gerado"

# ── Instalar update agent como serviço systemd ──────────────
step "Configurando serviço de atualização automática"

cat > /etc/systemd/system/agencyos-updater.service << EOF
[Unit]
Description=Agency OS Update Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=AGENT_PORT=$AGENT_PORT
ExecStart=/usr/bin/node $APP_DIR/update-agent.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable agencyos-updater -q
systemctl start  agencyos-updater
ok "Update agent ativo (porta $AGENT_PORT)"

# ── Salvar domínio e porta para o setup-server ──────────────
echo "$DOMAIN" > "$APP_DIR/.setup-domain"

# ── Iniciar servidor de setup ───────────────────────────────
step "Iniciando assistente de configuração"

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔════════════════════════════════════════════════════════╗"
echo "  ║                                                        ║"
echo "  ║   Abra o navegador e acesse:                          ║"
echo "  ║                                                        ║"
echo -e "  ║   ${BOLD}https://$DOMAIN${GREEN}                              ║"
echo "  ║                                                        ║"
echo "  ║   Siga o assistente para finalizar a instalação.      ║"
echo "  ║                                                        ║"
echo "  ╚════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo "  (Pressione Ctrl+C para cancelar)"
echo ""

node "$APP_DIR/setup-server.js"
