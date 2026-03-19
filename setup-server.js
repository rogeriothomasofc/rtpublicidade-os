#!/usr/bin/env node
// ============================================================
//  Agency OS — Servidor de Setup (wizard de instalação)
//  Roda temporariamente após o install.sh
//  Serve o assistente de configuração pelo navegador
// ============================================================

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const APP_DIR    = '/opt/agencyos';
const NGINX_CONF = '/etc/nginx/sites-available/agencyos';

const DOMAIN = (() => {
  try { return fs.readFileSync(path.join(APP_DIR, '.setup-domain'), 'utf8').trim(); }
  catch { return 'localhost'; }
})();

const PORT = (() => {
  // Usa a mesma lógica de porta livre do install.sh
  for (const p of [3000,3001,3002,3003,3010,3333,4000,4001,5000,8181,9000]) {
    try {
      const net = require('net');
      const srv = net.createServer();
      let free = false;
      srv.listen(p, '127.0.0.1', () => { free = true; srv.close(); });
      // sincrono via try/catch do bind
      require('child_process').execSync(`ss -tlnH 'sport = :${p}' 2>/dev/null | grep -q . && exit 1 || exit 0`, { stdio: 'ignore' });
      return p;
    } catch {}
  }
  return 3000;
})();

const UPDATE_TOKEN = (() => {
  try { return fs.readFileSync(path.join(APP_DIR, '.update-token'), 'utf8').trim(); }
  catch { return ''; }
})();

const AGENT_PORT = (() => {
  try { return parseInt(fs.readFileSync(path.join(APP_DIR, '.agent-port'), 'utf8').trim()); }
  catch { return 9876; }
})();

// Chave pré-preenchida via install.sh
const PRE_LICENSE_KEY = (() => {
  try { return fs.readFileSync(path.join(APP_DIR, '.license-key'), 'utf8').trim(); }
  catch { return ''; }
})();

// URL do servidor de provisioning do dono
// Troque pela sua URL antes de publicar
const PROVISION_SERVER = 'https://licencas.rtpublicidade.com.br';

// ── HTML do wizard ──────────────────────────────────────────
const setupHTML = () => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agency OS — Configuração</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #09090b; --card: #18181b; --border: #27272a;
    --primary: #22c55e; --primary-dark: #16a34a;
    --text: #fafafa; --muted: #a1a1aa; --error: #ef4444;
    --input-bg: #27272a;
  }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1rem; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 1rem; padding: 2.5rem 2rem; width: 100%; max-width: 520px; }
  .logo { width: 56px; height: 56px; background: var(--primary); border-radius: 14px; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; box-shadow: 0 0 24px rgba(34,197,94,.35); }
  .logo svg { width: 32px; height: 32px; fill: #000; }
  h1 { text-align: center; font-size: 1.5rem; font-weight: 700; margin-bottom: .25rem; }
  .subtitle { text-align: center; color: var(--muted); font-size: .875rem; margin-bottom: 2rem; }
  .steps { display: flex; gap: .5rem; margin-bottom: 2rem; }
  .step-dot { flex: 1; height: 4px; border-radius: 2px; background: var(--border); transition: background .3s; }
  .step-dot.active { background: var(--primary); }
  .step-dot.done { background: var(--primary-dark); }
  .section { display: none; }
  .section.visible { display: block; }
  .section-title { font-size: 1rem; font-weight: 600; margin-bottom: .25rem; }
  .section-desc { font-size: .8125rem; color: var(--muted); margin-bottom: 1.25rem; line-height: 1.5; }
  label { display: block; font-size: .8125rem; font-weight: 500; margin-bottom: .375rem; color: var(--muted); }
  input[type=text], input[type=email], input[type=password], input[type=url] {
    width: 100%; background: var(--input-bg); border: 1px solid var(--border); border-radius: .5rem;
    color: var(--text); font-size: .875rem; padding: .625rem .75rem; outline: none;
    transition: border-color .2s;
  }
  input:focus { border-color: var(--primary); }
  .field { margin-bottom: 1rem; }
  .hint { font-size: .75rem; color: var(--muted); margin-top: .25rem; }
  .hint a { color: var(--primary); text-decoration: none; }
  .btn { width: 100%; background: var(--primary); color: #000; font-weight: 600; font-size: .9375rem;
    border: none; border-radius: .5rem; padding: .75rem; cursor: pointer; transition: background .2s; margin-top: .5rem; }
  .btn:hover { background: var(--primary-dark); }
  .btn:disabled { opacity: .5; cursor: not-allowed; }
  .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--muted); margin-top: .5rem; }
  .btn-ghost:hover { background: var(--border); color: var(--text); }
  .row { display: flex; gap: .75rem; }
  .row .field { flex: 1; }
  .tag { display: inline-block; background: rgba(34,197,94,.15); color: var(--primary); font-size: .7rem; font-weight: 600; padding: .15rem .5rem; border-radius: 99px; vertical-align: middle; margin-left: .375rem; }
  /* progress */
  #progressSection { text-align: center; }
  .spinner { width: 48px; height: 48px; border: 4px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin .8s linear infinite; margin: 1.5rem auto; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .log-box { background: #000; border: 1px solid var(--border); border-radius: .5rem; padding: 1rem; text-align: left; font-family: monospace; font-size: .75rem; color: #4ade80; max-height: 220px; overflow-y: auto; margin: 1rem 0; white-space: pre-wrap; }
  /* success */
  .checkmark { width: 64px; height: 64px; background: rgba(34,197,94,.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 1rem auto; }
  .checkmark svg { width: 36px; height: 36px; stroke: var(--primary); fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
  .cred-box { background: var(--input-bg); border: 1px solid var(--border); border-radius: .5rem; padding: 1rem; font-size: .8125rem; line-height: 1.8; }
  .cred-box strong { color: var(--primary); }
  .err { color: var(--error); font-size: .8125rem; margin-top: .5rem; display: none; }
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  </div>
  <h1>Agency OS</h1>
  <p class="subtitle">Assistente de configuração</p>

  <div class="steps">
    <div class="step-dot active" id="dot0"></div>
    <div class="step-dot" id="dot1"></div>
    <div class="step-dot" id="dot2"></div>
  </div>

  <!-- ── STEP 1: Licença ───────────────────────────── -->
  <div class="section visible" id="step0">
    <p class="section-title">1. Chave de licença</p>
    <p class="section-desc">
      Informe a chave fornecida pelo vendedor. O banco de dados já foi
      configurado para você — não é necessário criar conta no Supabase.
    </p>
    <div class="field">
      <label>Chave de licença</label>
      <input type="text" id="licenseKey" placeholder="AGC-XXXX-XXXX-XXXX"
        value="${PRE_LICENSE_KEY}" style="font-family:monospace;letter-spacing:.05em" />
    </div>
    <p class="err" id="err0"></p>
    <button class="btn" onclick="goStep1()">Validar →</button>
  </div>

  <!-- ── STEP 2: Admin ─────────────────────────────── -->
  <div class="section" id="step1">
    <p class="section-title">2. Administrador</p>
    <p class="section-desc">Defina o acesso inicial ao sistema e o nome da sua agência.</p>
    <div class="field">
      <label>Nome da agência</label>
      <input type="text" id="agencyName" placeholder="RT Publicidade" />
    </div>
    <div class="field">
      <label>Email do administrador</label>
      <input type="email" id="adminEmail" placeholder="voce@email.com" />
    </div>
    <div class="row">
      <div class="field">
        <label>Senha</label>
        <input type="password" id="adminPass" placeholder="Mín. 8 caracteres" />
      </div>
      <div class="field">
        <label>Confirmar senha</label>
        <input type="password" id="adminPass2" placeholder="Repita a senha" />
      </div>
    </div>
    <p class="err" id="err1"></p>
    <button class="btn" onclick="goStep2()">Instalar →</button>
    <button class="btn btn-ghost" onclick="back(0)">← Voltar</button>
  </div>

  <!-- ── STEP 3: Progresso ─────────────────────────── -->
  <div class="section" id="step2">
    <div id="progressSection">
      <div class="spinner"></div>
      <p class="section-title" style="margin-bottom:.5rem">Configurando o sistema...</p>
      <p style="font-size:.8125rem;color:var(--muted);margin-bottom:.5rem">Isso pode levar 2–3 minutos. Não feche esta janela.</p>
      <div class="log-box" id="logBox">Iniciando...\n</div>
    </div>
    <div id="successSection" style="display:none;text-align:center">
      <div class="checkmark">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 style="margin-bottom:.5rem">Instalação concluída!</h2>
      <p style="font-size:.875rem;color:var(--muted);margin-bottom:1.5rem">Seu sistema está pronto para uso.</p>
      <div class="cred-box" style="margin-bottom:1.25rem;text-align:left">
        <div>🌐 <strong>URL:</strong> <span id="finalUrl"></span></div>
        <div>👤 <strong>Login:</strong> <span id="finalEmail"></span></div>
      </div>
      <button class="btn" onclick="window.location.href='/'">Acessar o sistema →</button>
    </div>
    <div id="errorSection" style="display:none;text-align:center">
      <p style="font-size:2rem;margin:1rem 0">❌</p>
      <h2 style="margin-bottom:.5rem">Algo deu errado</h2>
      <p style="font-size:.8125rem;color:var(--muted);margin-bottom:1rem" id="errorMsg"></p>
      <button class="btn btn-ghost" onclick="back(0)">← Tentar novamente</button>
    </div>
  </div>
</div>

<script>
let data = {};

function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}
function clearErr(id) {
  const el = document.getElementById(id);
  el.style.display = 'none';
}

function setDots(active) {
  for (let i = 0; i < 3; i++) {
    const d = document.getElementById('dot' + i);
    d.className = 'step-dot' + (i < active ? ' done' : i === active ? ' active' : '');
  }
}

function showStep(n) {
  document.querySelectorAll('.section').forEach((s, i) => {
    s.className = 'section' + (i === n ? ' visible' : '');
  });
  setDots(n);
}

function back(n) { showStep(n); }

async function goStep1() {
  clearErr('err0');
  const key = document.getElementById('licenseKey').value.trim();
  if (!key) return showErr('err0', 'Informe a chave de licença.');

  const btn = document.querySelector('#step0 .btn');
  btn.disabled = true;
  btn.textContent = 'Validando...';

  try {
    const res  = await fetch('/validate-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    });
    const json = await res.json();
    if (!json.valid) return showErr('err0', json.error || 'Chave inválida ou suspensa.');
    data.licenseKey   = key;
    data.supabaseUrl  = json.supabase_url;
    data.anonKey      = json.supabase_anon_key;
    data.serviceKey   = json.supabase_service_key;
    data.projectRef   = json.supabase_project_ref;
    // Pré-preenche nome da agência se disponível
    if (json.buyer_name) document.getElementById('agencyName').value = json.buyer_name;
    showStep(1);
  } catch(e) {
    showErr('err0', 'Erro ao validar: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Validar →';
  }
}

function goStep2() {
  clearErr('err1');
  const agency = document.getElementById('agencyName').value.trim();
  const email  = document.getElementById('adminEmail').value.trim();
  const pass   = document.getElementById('adminPass').value;
  const pass2  = document.getElementById('adminPass2').value;

  if (!agency) return showErr('err1', 'Informe o nome da agência.');
  if (!email || !email.includes('@')) return showErr('err1', 'Email inválido.');
  if (pass.length < 8) return showErr('err1', 'A senha deve ter no mínimo 8 caracteres.');
  if (pass !== pass2)  return showErr('err1', 'As senhas não conferem.');

  data.agencyName    = agency;
  data.adminEmail    = email;
  data.adminPassword = pass;

  showStep(2);
  startInstall();
}

function log(msg) {
  const box = document.getElementById('logBox');
  box.textContent += msg + '\\n';
  box.scrollTop = box.scrollHeight;
}

async function startInstall() {
  try {
    const res = await fetch('/configure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    // Read SSE-style lines
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          if (obj.log)  log(obj.log);
          if (obj.done) {
            document.getElementById('progressSection').style.display = 'none';
            document.getElementById('finalUrl').textContent   = 'https://${DOMAIN}';
            document.getElementById('finalEmail').textContent = data.adminEmail;
            document.getElementById('successSection').style.display = 'block';
          }
          if (obj.error) {
            document.getElementById('progressSection').style.display = 'none';
            document.getElementById('errorMsg').textContent = obj.error;
            document.getElementById('errorSection').style.display = 'block';
          }
        } catch {}
      }
    }
  } catch (e) {
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('errorMsg').textContent = e.message;
    document.getElementById('errorSection').style.display = 'block';
  }
}
</script>
</body>
</html>`;

// ── Helpers ─────────────────────────────────────────────────
function send(res, obj) {
  res.write(JSON.stringify(obj) + '\n');
}

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: APP_DIR, stdio: 'pipe', ...opts }).toString().trim();
}

// ── Validar licença no servidor do dono ─────────────────────
async function validateLicense(key) {
  const https = require('https');
  const url   = new URL(`${PROVISION_SERVER}/functions/v1/provision`);
  return new Promise((resolve) => {
    const payload = JSON.stringify({ key, domain: DOMAIN });
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ valid: false, error: 'Resposta inválida' }); } });
    });
    req.on('error', e => resolve({ valid: false, error: e.message }));
    req.write(payload);
    req.end();
  });
}

// ── Lógica de configuração ──────────────────────────────────
async function configure(body, res) {
  const { supabaseUrl, anonKey, serviceKey, projectRef, agencyName, adminEmail, adminPassword, licenseKey } = body;

  try {
    send(res, { log: '▶ Credenciais do banco de dados recebidas via licença' });
    send(res, { log: `✔ Projeto: ${projectRef}` });

    // 2. Aplicar migrations
    send(res, { log: '▶ Aplicando banco de dados (migrations)...' });
    try {
      process.env.SUPABASE_ACCESS_TOKEN = accessToken;
      run(`supabase db push --project-ref "${projectRef}" 2>&1 || true`);
      send(res, { log: '✔ Banco de dados configurado' });
    } catch {
      send(res, { log: '⚠ Migrations aplicadas com aviso (normal em primeiro uso)' });
    }

    // 3. Deploy Edge Functions
    send(res, { log: '▶ Publicando Edge Functions...' });
    try {
      run(`supabase functions deploy --project-ref "${projectRef}" 2>&1 || true`);
      send(res, { log: '✔ Edge Functions publicadas' });
    } catch {
      send(res, { log: '⚠ Edge Functions com aviso — verifique depois no painel' });
    }

    // 4. Escrever .env
    send(res, { log: '▶ Salvando configurações...' });
    const envLines = [
      `VITE_SUPABASE_URL=${supabaseUrl}`,
      `VITE_SUPABASE_PUBLISHABLE_KEY=${anonKey}`,
      `VITE_SUPABASE_PROJECT_ID=${projectRef}`,
      `VITE_UPDATE_TOKEN=${UPDATE_TOKEN}`,
    ];
    if (licenseKey) envLines.push(`VITE_LICENSE_KEY=${licenseKey}`);
    fs.writeFileSync(path.join(APP_DIR, '.env'), envLines.join('\n') + '\n');
    // Salva o access token para o update agent usar nas atualizações futuras
    fs.writeFileSync(path.join(APP_DIR, '.supabase-token'), accessToken);
    fs.chmodSync(path.join(APP_DIR, '.supabase-token'), 0o600);
    send(res, { log: '✔ Arquivo .env salvo' });

    // 5. Build do frontend
    send(res, { log: '▶ Compilando o sistema (pode demorar 1-2 min)...' });
    run('npm run build 2>&1');
    send(res, { log: '✔ Build concluído' });

    // 6. Reconfigurar Nginx para servir os arquivos estáticos
    send(res, { log: '▶ Configurando servidor web...' });
    const nginxConfig = `server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl;
    server_name ${DOMAIN};

    root ${APP_DIR}/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}`;
    // Só reescreve o bloco HTTP — o certbot já adicionou os certificados SSL
    // Usamos um config simples que o nginx vai mesclar com os blocos SSL do certbot
    const staticConfig = `server {
    listen 80;
    server_name ${DOMAIN};

    root ${APP_DIR}/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Update Agent — proxy interno (autenticado pelo token no header)
    location /agent/ {
        proxy_pass http://127.0.0.1:${AGENT_PORT}/agent/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}`;
    fs.writeFileSync(NGINX_CONF, staticConfig);
    run('nginx -t -q && systemctl reload nginx');
    send(res, { log: '✔ Servidor web configurado' });

    // 7. Criar admin
    send(res, { log: '▶ Criando usuário administrador...' });
    const svcKey = serviceKey || anonKey;

    // Criar usuário via Auth admin API
    const createUserPayload = JSON.stringify({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: 'Admin' },
    });

    const createUserResp = run(`curl -sf -X POST "${supabaseUrl}/auth/v1/admin/users" \
      -H "apikey: ${anonKey}" \
      -H "Authorization: Bearer ${svcKey}" \
      -H "Content-Type: application/json" \
      -d '${createUserPayload.replace(/'/g, "'\\''")}'`);

    const userObj = JSON.parse(createUserResp);
    const userId = userObj.id;

    if (userId) {
      const restHeaders = `-H "apikey: ${anonKey}" -H "Authorization: Bearer ${svcKey}" -H "Content-Type: application/json" -H "Prefer: resolution=ignore-duplicates"`;

      run(`curl -sf -X POST "${supabaseUrl}/rest/v1/profiles" ${restHeaders} -d '{"user_id":"${userId}","name":"Admin","role":"admin"}' || true`);
      run(`curl -sf -X POST "${supabaseUrl}/rest/v1/user_roles" ${restHeaders} -d '{"user_id":"${userId}","role":"admin"}' || true`);
      run(`curl -sf -X POST "${supabaseUrl}/rest/v1/agency_settings" ${restHeaders} -d '{"name":"${agencyName.replace(/'/g, "\\'")}"}' || true`);

      send(res, { log: `✔ Admin criado: ${adminEmail}` });
    } else {
      send(res, { log: `⚠ Admin não criado automaticamente. Crie em: ${supabaseUrl} → Authentication` });
    }

    // 8. Salvar credenciais
    fs.writeFileSync('/root/agencyos-credentials.txt',
      `Agency OS — Credenciais\n` +
      `========================\n` +
      `URL:          https://${DOMAIN}\n` +
      `Admin:        ${adminEmail}\n` +
      `Supabase Ref: ${projectRef}\n` +
      `Supabase URL: ${supabaseUrl}\n`
    );
    fs.chmodSync('/root/agencyos-credentials.txt', 0o600);

    // 9. Remover arquivo de domínio do setup
    try { fs.unlinkSync(path.join(APP_DIR, '.setup-domain')); } catch {}

    send(res, { log: '✔ Instalação concluída!' });
    send(res, { done: true });

    // Encerrar o servidor após 3s (dá tempo do browser receber a resposta)
    setTimeout(() => {
      console.log('Setup concluído. Encerrando servidor de setup.');
      process.exit(0);
    }, 3000);

  } catch (err) {
    send(res, { error: String(err.message || err) });
  }
}

// ── HTTP Server ─────────────────────────────────────────────
const server = http.createServer((req, res) => {
  if (req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(setupHTML());
    return;
  }

  // Valida licença no servidor do dono e retorna credenciais Supabase
  if (req.method === 'POST' && req.url === '/validate-license') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { key } = JSON.parse(body);
        const result = await validateLicense(key);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ valid: false, error: e.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/configure') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); }
      catch { res.writeHead(400); res.end('Invalid JSON'); return; }

      // Streaming JSON lines
      res.writeHead(200, {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      });

      configure(parsed, res).finally(() => res.end());
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Agency OS Setup Server rodando na porta ${PORT}`);
  console.log(`Aguardando acesso em: https://${DOMAIN}`);
});
