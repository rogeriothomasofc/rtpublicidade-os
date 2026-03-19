#!/bin/bash
# ============================================================
#  Agency OS — Script de Instalação (Supabase Self-Hosted)
#  Compatível com Ubuntu 20.04+ / Debian 11+
#
#  Uso:
#    curl -fsSL https://REPO_URL/raw/main/install.sh | sudo bash
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

REPO_URL="https://github.com/rogeriothomasofc/rtpublicidade-os.git"
APP_DIR="/opt/agencyos"
NGINX_CONF="/etc/nginx/sites-available/agencyos"
LICENSE_SERVER="https://licencas.rtpublicidade.com.br"

step()       { echo -e "\n${BLUE}${BOLD}▶ $1${NC}"; }
ok()         { echo -e "${GREEN}✔ $1${NC}"; }
warn()       { echo -e "${YELLOW}⚠ $1${NC}"; }
error_exit() { echo -e "${RED}✖ ERRO: $1${NC}"; exit 1; }

# ── Verificar root ──────────────────────────────────────────
[ "$EUID" -ne 0 ] && error_exit "Execute como root: sudo bash install.sh"

# ── Banner ──────────────────────────────────────────────────
echo -e "${GREEN}"
echo "  ╔════════════════════════════════════════════╗"
echo "  ║          Agency OS — Instalação            ║"
echo "  ║     Sistema para Agências de Marketing     ║"
echo "  ╚════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BOLD}Antes de começar, certifique-se de que:${NC}"
echo ""
echo "  ✔ O domínio já está apontando para o IP deste servidor"
echo "  ✔ Você tem a chave de licença fornecida pelo vendedor"
echo ""
read -p "Pressione ENTER para continuar..."

# ── Coletar informações ──────────────────────────────────────
step "Configuração inicial"

read -p "  Domínio do sistema (ex: app.minhaagencia.com.br): " DOMAIN
[ -z "$DOMAIN" ] && error_exit "Domínio é obrigatório"

read -p "  Chave de licença (ex: AGC-XXXX-XXXX-XXXX): " LICENSE_KEY
[ -z "$LICENSE_KEY" ] && error_exit "Chave de licença é obrigatória"

read -p "  Nome da agência: " AGENCY_NAME
[ -z "$AGENCY_NAME" ] && AGENCY_NAME="Minha Agência"

read -p "  E-mail do administrador: " ADMIN_EMAIL
[ -z "$ADMIN_EMAIL" ] && error_exit "E-mail é obrigatório"

read -s -p "  Senha do administrador (mín. 8 caracteres): " ADMIN_PASSWORD
echo ""
[ ${#ADMIN_PASSWORD} -lt 8 ] && error_exit "Senha muito curta (mínimo 8 caracteres)"

echo ""

# ── Validar licença ──────────────────────────────────────────
step "Validando licença"
LICENSE_RESP=$(curl -sf -X POST "$LICENSE_SERVER/functions/v1/validate-license" \
  -H "Content-Type: application/json" \
  -d "{\"key\":\"$LICENSE_KEY\",\"domain\":\"$DOMAIN\"}" 2>/dev/null || echo '{"valid":false}')

LICENSE_VALID=$(echo "$LICENSE_RESP" | grep -o '"valid":true' || true)
if [ -z "$LICENSE_VALID" ]; then
  LICENSE_STATUS=$(echo "$LICENSE_RESP" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  case "$LICENSE_STATUS" in
    suspended) error_exit "Licença suspensa. Entre em contato com o suporte." ;;
    cancelled) error_exit "Licença cancelada." ;;
    *)         error_exit "Chave de licença inválida. Verifique e tente novamente." ;;
  esac
fi
ok "Licença válida"

# ── Atualizar sistema ────────────────────────────────────────
step "Atualizando sistema"
apt-get update -qq
apt-get install -y -qq curl jq git ca-certificates gnupg lsb-release apt-transport-https
ok "Sistema atualizado"

# ── Docker ──────────────────────────────────────────────────
step "Instalando Docker"
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker --now
fi
ok "Docker $(docker --version | grep -o '[0-9.]*' | head -1)"

# ── Node.js 20 ──────────────────────────────────────────────
step "Instalando Node.js 20"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - -q
  apt-get install -y -qq nodejs
fi
ok "Node.js $(node -v)"

# ── Nginx + Certbot ─────────────────────────────────────────
step "Instalando Nginx e Certbot"
if ! command -v nginx &>/dev/null; then
  apt-get install -y -qq nginx
fi
if ! command -v certbot &>/dev/null; then
  apt-get install -y -qq certbot python3-certbot-nginx
fi
ok "Nginx pronto"

# ── Clonar repositório ──────────────────────────────────────
step "Baixando Agency OS"
if [ -d "$APP_DIR/.git" ]; then
  warn "Diretório $APP_DIR já existe. Atualizando..."
  cd "$APP_DIR" && git pull -q
else
  git clone -q "$REPO_URL" "$APP_DIR"
fi
ok "Código em $APP_DIR"

cd "$APP_DIR"

# ── Instalar dependências Node ───────────────────────────────
step "Instalando dependências Node.js"
npm install --silent
ok "Dependências instaladas"

# ── Gerar segredos ──────────────────────────────────────────
step "Gerando segredos do banco de dados"
JWT_SECRET=$(openssl rand -hex 40)
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 24)
DASHBOARD_PASSWORD=$(openssl rand -base64 12 | tr -dc 'a-zA-Z0-9' | head -c 16)

# Gerar ANON_KEY e SERVICE_ROLE_KEY (JWT HS256)
node - <<NODESCRIPT > /tmp/sb_keys.txt
const c = require('crypto');
const secret = '$JWT_SECRET';
const now = Math.floor(Date.now() / 1000);
const exp = now + 315360000; // 10 anos
function makeJWT(payload) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = c.createHmac('sha256', secret).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + sig;
}
const anon    = makeJWT({ role: 'anon',         iss: 'supabase', iat: now, exp });
const service = makeJWT({ role: 'service_role', iss: 'supabase', iat: now, exp });
console.log(anon + '\n' + service);
NODESCRIPT

ANON_KEY=$(sed -n '1p' /tmp/sb_keys.txt)
SERVICE_KEY=$(sed -n '2p' /tmp/sb_keys.txt)
rm -f /tmp/sb_keys.txt
ok "Segredos gerados"

# ── Diretório Supabase ───────────────────────────────────────
SUPABASE_DIR="$APP_DIR/supabase-docker"
mkdir -p "$SUPABASE_DIR"

# ── docker-compose.yml do Supabase ───────────────────────────
step "Configurando Supabase Self-Hosted"
cat > "$SUPABASE_DIR/docker-compose.yml" << 'DCEOF'
version: "3.8"
services:
  db:
    image: supabase/postgres:15.1.1.46
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: postgres
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 20

  vector:
    image: timberio/vector:0.28.1-alpine
    restart: unless-stopped
    volumes:
      - ./volumes/logs/vector.yml:/etc/vector/vector.yml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro

  analytics:
    image: supabase/logflare:1.4.0
    restart: unless-stopped
    ports:
      - "127.0.0.1:4000:4000"
    environment:
      LOGFLARE_NODE_HOST: 127.0.0.1
      DB_USERNAME: supabase_admin
      DB_DATABASE: _supabase
      DB_HOSTNAME: db
      DB_PORT: 5432
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_SCHEMA: _analytics
      LOGFLARE_API_KEY: ${LOGFLARE_API_KEY}
      LOGFLARE_SINGLE_TENANT: "true"
      LOGFLARE_SUPABASE_MODE: "true"
      LOGFLARE_MIN_CLUSTER_SIZE: 1
      RELEASE_COOKIE: cookie
    depends_on:
      db:
        condition: service_healthy

  auth:
    image: supabase/gotrue:v2.151.0
    restart: unless-stopped
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      API_EXTERNAL_URL: ${API_EXTERNAL_URL}
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgresql://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_URI_ALLOW_LIST: ${ADDITIONAL_REDIRECT_URLS}
      GOTRUE_DISABLE_SIGNUP: "false"
      GOTRUE_JWT_ADMIN_ROLES: service_role
      GOTRUE_JWT_AUD: authenticated
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
      GOTRUE_MAILER_AUTOCONFIRM: "true"
      GOTRUE_SMTP_HOST: ${SMTP_HOST}
      GOTRUE_SMTP_PORT: ${SMTP_PORT}
      GOTRUE_SMTP_USER: ${SMTP_USER}
      GOTRUE_SMTP_PASS: ${SMTP_PASS}
      GOTRUE_SMTP_SENDER_NAME: ${SMTP_SENDER_NAME}
      GOTRUE_MAILER_URLPATHS_INVITE: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_CONFIRMATION: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_RECOVERY: /auth/v1/verify
      GOTRUE_MAILER_URLPATHS_EMAIL_CHANGE: /auth/v1/verify
    depends_on:
      db:
        condition: service_healthy

  rest:
    image: postgrest/postgrest:v12.0.2
    restart: unless-stopped
    environment:
      PGRST_DB_URI: postgresql://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres
      PGRST_DB_SCHEMAS: public,storage,graphql_public
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: "false"
      PGRST_APP_SETTINGS_JWT_SECRET: ${JWT_SECRET}
      PGRST_APP_SETTINGS_JWT_EXP: 3600
    depends_on:
      db:
        condition: service_healthy

  realtime:
    image: supabase/realtime:v2.28.32
    restart: unless-stopped
    environment:
      PORT: 4000
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: supabase_admin
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      DB_NAME: postgres
      DB_AFTER_CONNECT_QUERY: 'SET search_path TO _realtime'
      DB_ENC_KEY: supabaseencryptedkey
      API_JWT_SECRET: ${JWT_SECRET}
      FLY_ALLOC_ID: fly123
      FLY_APP_NAME: realtime
      SECRET_KEY_BASE: ${JWT_SECRET}
      ERL_AFLAGS: -proto_dist inet_tcp
      ENABLE_TAILSCALE: "false"
      DNS_NODES: "''"
    depends_on:
      db:
        condition: service_healthy

  storage:
    image: supabase/storage-api:v1.0.6
    restart: unless-stopped
    volumes:
      - storage_data:/var/lib/storage
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      POSTGREST_URL: http://rest:3000
      PGRST_JWT_SECRET: ${JWT_SECRET}
      DATABASE_URL: postgresql://supabase_storage_admin:${POSTGRES_PASSWORD}@db:5432/postgres
      FILE_SIZE_LIMIT: 52428800
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
      TENANT_ID: stub
      REGION: stub
      GLOBAL_S3_BUCKET: stub
      ENABLE_IMAGE_TRANSFORMATION: "true"
      IMGPROXY_URL: http://imgproxy:5001
    depends_on:
      db:
        condition: service_healthy
      rest:
        condition: service_started

  imgproxy:
    image: darthsim/imgproxy:v3.8.0
    restart: unless-stopped
    environment:
      IMGPROXY_BIND: ":5001"
      IMGPROXY_LOCAL_FILESYSTEM_ROOT: /
      IMGPROXY_USE_ETAG: "true"
      IMGPROXY_ENABLE_WEBP_DETECTION: "true"
    volumes:
      - storage_data:/var/lib/storage:ro

  meta:
    image: supabase/postgres-meta:v0.83.2
    restart: unless-stopped
    environment:
      PG_META_PORT: 8080
      PG_META_DB_HOST: db
      PG_META_DB_PORT: 5432
      PG_META_DB_NAME: postgres
      PG_META_DB_USER: supabase_admin
      PG_META_DB_PASSWORD: ${POSTGRES_PASSWORD}
    depends_on:
      db:
        condition: service_healthy

  functions:
    image: supabase/edge-runtime:v1.58.2
    restart: unless-stopped
    volumes:
      - ../supabase/functions:/home/deno/functions:ro
    environment:
      JWT_SECRET: ${JWT_SECRET}
      SUPABASE_URL: http://kong:8000
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY}
      SUPABASE_DB_URL: postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/postgres
      VERIFY_JWT: "false"
    depends_on:
      db:
        condition: service_healthy

  kong:
    image: kong:2.8.1
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"
    environment:
      KONG_DATABASE: "off"
      KONG_DECLARATIVE_CONFIG: /home/kong/kong.yml
      KONG_DNS_ORDER: LAST,A,CNAME
      KONG_PLUGINS: request-transformer,cors,key-auth,acl,basic-auth
      KONG_NGINX_PROXY_PROXY_BUFFER_SIZE: 160k
      KONG_NGINX_PROXY_PROXY_BUFFERS: 64 160k
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY}
    volumes:
      - ./volumes/api/kong.yml:/home/kong/kong.yml:ro
    depends_on:
      db:
        condition: service_healthy

volumes:
  db_data:
  storage_data:
DCEOF

# ── Gerar kong.yml ───────────────────────────────────────────
mkdir -p "$SUPABASE_DIR/volumes/api"
cat > "$SUPABASE_DIR/volumes/api/kong.yml" << KONGYML
_format_version: "1.1"

consumers:
  - username: anon
    keyauth_credentials:
      - key: ${ANON_KEY}
  - username: service_role
    keyauth_credentials:
      - key: ${SERVICE_KEY}

acls:
  - consumer: anon
    group: anon
  - consumer: service_role
    group: admin

services:
  - name: auth-v1-open
    url: http://auth:9999/verify
    routes:
      - name: auth-v1-open
        strip_path: true
        paths:
          - /auth/v1/verify
    plugins:
      - name: cors
  - name: auth-v1-open-callback
    url: http://auth:9999/callback
    routes:
      - name: auth-v1-open-callback
        strip_path: true
        paths:
          - /auth/v1/callback
    plugins:
      - name: cors
  - name: auth-v1-open-user
    url: http://auth:9999/user
    routes:
      - name: auth-v1-open-user
        strip_path: true
        paths:
          - /auth/v1/user
    plugins:
      - name: cors
  - name: auth-v1
    url: http://auth:9999/
    routes:
      - name: auth-v1-all
        strip_path: true
        paths:
          - /auth/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
  - name: rest-v1
    url: http://rest:3000/
    routes:
      - name: rest-v1-all
        strip_path: true
        paths:
          - /rest/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: true
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
  - name: realtime-v1
    url: http://realtime:4000/socket/
    routes:
      - name: realtime-v1-all
        strip_path: true
        paths:
          - /realtime/v1/
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin
            - anon
  - name: storage-v1
    url: http://storage:5000/
    routes:
      - name: storage-v1-all
        strip_path: true
        paths:
          - /storage/v1/
    plugins:
      - name: cors
  - name: functions-v1
    url: http://functions:9000/
    routes:
      - name: functions-v1-all
        strip_path: true
        paths:
          - /functions/v1/
    plugins:
      - name: cors
KONGYML

# ── .env do Docker Compose ───────────────────────────────────
LOGFLARE_API_KEY=$(openssl rand -hex 20)
cat > "$SUPABASE_DIR/.env" << ENVEOF
POSTGRES_PASSWORD=$DB_PASSWORD
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_KEY
SITE_URL=https://$DOMAIN
API_EXTERNAL_URL=https://$DOMAIN
ADDITIONAL_REDIRECT_URLS=
LOGFLARE_API_KEY=$LOGFLARE_API_KEY
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SENDER_NAME=Agency OS
ENVEOF

# ── Arquivo logs/vector ──────────────────────────────────────
mkdir -p "$SUPABASE_DIR/volumes/logs"
cat > "$SUPABASE_DIR/volumes/logs/vector.yml" << 'VCEOF'
api:
  enabled: true
  address: 0.0.0.0:9001

sources:
  docker_host:
    type: docker_logs
    exclude_containers: []

sinks:
  logflare:
    type: http
    inputs: [docker_host]
    encoding:
      codec: json
    method: post
    request:
      retry_max_duration_secs: 10
    uri: http://analytics:4000/api/logs?source_name=docker&api_key=${LOGFLARE_API_KEY}
VCEOF

# ── Subir containers Supabase ────────────────────────────────
step "Subindo banco de dados Supabase (aguarde ~3 min)"
cd "$SUPABASE_DIR"
docker compose up -d db kong auth rest realtime storage functions 2>&1 | tail -5

echo -n "  Aguardando PostgreSQL"
for i in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U postgres &>/dev/null 2>&1; then
    echo ""
    break
  fi
  echo -n "."
  sleep 5
  [ $i -eq 60 ] && { echo ""; warn "Timeout aguardando PostgreSQL — continuando..."; }
done

echo -n "  Aguardando Kong (API gateway)"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/auth/v1/health &>/dev/null 2>&1; then
    echo ""
    break
  fi
  echo -n "."
  sleep 5
  [ $i -eq 30 ] && { echo ""; warn "Timeout aguardando Kong — continuando..."; }
done
ok "Supabase rodando"

# ── Aplicar migrations ───────────────────────────────────────
step "Aplicando banco de dados (migrations)"
cd "$APP_DIR"
MIGRATIONS_DIR="$APP_DIR/supabase/migrations"
if [ -d "$MIGRATIONS_DIR" ]; then
  for SQL_FILE in "$MIGRATIONS_DIR"/*.sql; do
    [ -f "$SQL_FILE" ] || continue
    BASENAME=$(basename "$SQL_FILE")
    docker compose -f "$SUPABASE_DIR/docker-compose.yml" exec -T db \
      psql -U postgres -d postgres -f "/dev/stdin" < "$SQL_FILE" &>/dev/null && \
      ok "Migration: $BASENAME" || warn "Migration com aviso: $BASENAME"
  done
else
  warn "Nenhuma migration encontrada em supabase/migrations/"
fi

# ── .env da aplicação ────────────────────────────────────────
step "Configurando variáveis de ambiente"
UPDATE_TOKEN=$(openssl rand -hex 32)
AGENT_PORT=3737

cat > "$APP_DIR/.env" << APPENV
VITE_SUPABASE_URL=https://$DOMAIN
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=self-hosted
VITE_LICENSE_KEY=$LICENSE_KEY
VITE_UPDATE_TOKEN=$UPDATE_TOKEN
APPENV

echo "$UPDATE_TOKEN" > "$APP_DIR/.update-token"
chmod 600 "$APP_DIR/.update-token"
echo "$AGENT_PORT"   > "$APP_DIR/.agent-port"
ok ".env configurado"

# ── Build do frontend ────────────────────────────────────────
step "Compilando frontend (aguarde)"
cd "$APP_DIR"
npm run build --silent
ok "Frontend compilado em dist/"

# ── Nginx — produção ────────────────────────────────────────
step "Configurando Nginx"
cat > "$NGINX_CONF" << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    # Supabase API paths → Kong
    location ~ ^/(auth|rest|realtime|storage|functions)/v1 {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Update Agent
    location /agent/ {
        proxy_pass http://127.0.0.1:$AGENT_PORT/agent/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 600s;
    }

    # Frontend SPA
    root $APP_DIR/dist;
    index index.html;
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
NGINXEOF

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/agencyos
rm -f /etc/nginx/sites-enabled/default
nginx -t -q && systemctl reload nginx
ok "Nginx configurado"

# ── SSL ──────────────────────────────────────────────────────
step "Configurando HTTPS (Let's Encrypt)"
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos \
  --email "$ADMIN_EMAIL" --redirect -q 2>/dev/null && \
  ok "HTTPS ativo" || warn "SSL não configurado. Continue via HTTP por enquanto."

# ── Criar usuário administrador ──────────────────────────────
step "Criando conta do administrador"
sleep 3
CREATE_RESP=$(curl -sf -X POST "http://127.0.0.1:8000/auth/v1/admin/users" \
  -H "apikey: $SERVICE_KEY" \
  -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true}" \
  2>/dev/null || echo '{}')

USER_ID=$(echo "$CREATE_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$USER_ID" ]; then
  ok "Usuário criado: $ADMIN_EMAIL"
  # Inserir role admin
  docker compose -f "$SUPABASE_DIR/docker-compose.yml" exec -T db \
    psql -U postgres -d postgres -c \
    "INSERT INTO public.user_roles (user_id, role) VALUES ('$USER_ID', 'admin') ON CONFLICT DO NOTHING;" \
    &>/dev/null && ok "Role admin atribuída" || warn "Não foi possível atribuir role admin automaticamente"
else
  warn "Não foi possível criar usuário via API. Você pode criar pelo painel após instalar."
fi

# ── Update Agent (systemd) ───────────────────────────────────
step "Configurando serviço de atualização"
cat > /etc/systemd/system/agencyos-updater.service << SVCEOF
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
SVCEOF

systemctl daemon-reload
systemctl enable agencyos-updater -q
systemctl start  agencyos-updater
ok "Update agent ativo (porta $AGENT_PORT)"

# ── Salvar credenciais ───────────────────────────────────────
CRED_FILE="/root/agencyos-credentials.txt"
cat > "$CRED_FILE" << CREDEOF
======================================================
  Agency OS — Credenciais de Instalação
  GUARDE ESTE ARQUIVO EM LOCAL SEGURO
======================================================

Sistema:
  URL:         https://$DOMAIN
  Admin:       $ADMIN_EMAIL
  Senha admin: $ADMIN_PASSWORD

Banco de dados (Supabase Self-Hosted):
  URL:         https://$DOMAIN
  Anon Key:    $ANON_KEY
  Service Key: $SERVICE_KEY
  DB Password: $DB_PASSWORD
  JWT Secret:  $JWT_SECRET

Licença: $LICENSE_KEY

Gerado em: $(date)
CREDEOF
chmod 600 "$CRED_FILE"
ok "Credenciais salvas em $CRED_FILE"

# ── Resultado final ──────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║          ✔ INSTALAÇÃO CONCLUÍDA!                 ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${BOLD}Acesse o sistema:${NC}"
echo -e "  ${GREEN}https://$DOMAIN${NC}"
echo ""
echo -e "  ${BOLD}Login:${NC}  $ADMIN_EMAIL"
echo -e "  ${BOLD}Senha:${NC}  $ADMIN_PASSWORD"
echo ""
echo -e "  ${YELLOW}Credenciais completas salvas em: $CRED_FILE${NC}"
echo ""
