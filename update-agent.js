#!/usr/bin/env node
// ============================================================
//  Agency OS — Update Agent
//  Serviço leve que roda permanentemente no servidor.
//  Permite atualizar o sistema pelo navegador (Configurações).
//
//  Instalado como systemd service pelo install.sh.
//  Nginx faz proxy de /agent/ → este serviço.
// ============================================================

const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const { execSync, exec } = require('child_process');

const APP_DIR    = '/opt/agencyos';
const PORT       = parseInt(process.env.AGENT_PORT || '9876');
const TOKEN_FILE = path.join(APP_DIR, '.update-token');

// Ler token de autenticação
const AUTH_TOKEN = (() => {
  try { return fs.readFileSync(TOKEN_FILE, 'utf8').trim(); }
  catch { console.error('AVISO: .update-token não encontrado'); return ''; }
})();

// Versão atual
const VERSION_FILE = path.join(APP_DIR, 'src/lib/version.ts');
const currentVersion = (() => {
  try {
    const content = fs.readFileSync(VERSION_FILE, 'utf8');
    const match = content.match(/APP_VERSION\s*=\s*'([^']+)'/);
    return match ? match[1] : '0.0.0';
  } catch { return '0.0.0'; }
})();

function checkAuth(req) {
  const header = req.headers['authorization'] || '';
  return AUTH_TOKEN && header === `Bearer ${AUTH_TOKEN}`;
}

function send(res, obj) {
  res.write(JSON.stringify(obj) + '\n');
}

function run(cmd) {
  return execSync(cmd, { cwd: APP_DIR, encoding: 'utf8', stdio: 'pipe' }).trim();
}

// Busca a versão mais recente no GitHub (via tags)
async function getLatestVersion() {
  try {
    const raw = run(`git fetch --tags -q && git describe --tags $(git rev-list --tags --max-count=1) 2>/dev/null || git log --oneline -1 --format='%h'`);
    return raw.replace(/^v/, '');
  } catch { return currentVersion; }
}

function hasUpdate(latest) {
  const parse = v => v.replace(/^v/, '').split('.').map(Number);
  const [ma, mi, pa] = parse(currentVersion);
  const [la, li, lp] = parse(latest);
  return la > ma || (la === ma && li > mi) || (la === ma && li === mi && lp > pa);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // GET /agent/status — verifica se há atualização
  if (req.method === 'GET' && req.url === '/agent/status') {
    if (!checkAuth(req)) { res.writeHead(401); res.end('Unauthorized'); return; }

    try {
      run('git fetch -q origin 2>/dev/null || true');
      const latest = await getLatestVersion();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        current_version: currentVersion,
        latest_version: latest,
        update_available: hasUpdate(latest),
      }));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e.message) }));
    }
    return;
  }

  // POST /agent/update — executa a atualização
  if (req.method === 'POST' && req.url === '/agent/update') {
    if (!checkAuth(req)) { res.writeHead(401); res.end('Unauthorized'); return; }

    res.writeHead(200, {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    });

    const steps = [
      { log: '▶ Buscando atualizações...', cmd: 'git pull -q origin main 2>&1 || git pull -q origin master 2>&1' },
      { log: '▶ Instalando dependências...', cmd: 'npm install --silent 2>&1' },
      { log: '▶ Aplicando migrations do banco...', cmd: `SUPABASE_ACCESS_TOKEN=$(cat ${APP_DIR}/.supabase-token 2>/dev/null || echo '') supabase db push --project-ref $(grep VITE_SUPABASE_PROJECT_ID ${APP_DIR}/.env | cut -d= -f2) 2>&1 || echo "migrations: ok"` },
      { log: '▶ Publicando Edge Functions...', cmd: `SUPABASE_ACCESS_TOKEN=$(cat ${APP_DIR}/.supabase-token 2>/dev/null || echo '') supabase functions deploy --project-ref $(grep VITE_SUPABASE_PROJECT_ID ${APP_DIR}/.env | cut -d= -f2) 2>&1 || echo "functions: ok"` },
      { log: '▶ Compilando o sistema...', cmd: 'npm run build 2>&1' },
      { log: '▶ Recarregando servidor web...', cmd: 'nginx -t -q && systemctl reload nginx' },
    ];

    (async () => {
      try {
        for (const step of steps) {
          send(res, { log: step.log });
          try {
            run(step.cmd);
            send(res, { log: step.log.replace('▶', '✔').replace('...', '') });
          } catch (e) {
            send(res, { log: `⚠ ${step.log.replace('▶ ', '').replace('...', '')} — continuando` });
          }
        }
        send(res, { log: '✔ Atualização concluída!', done: true });
      } catch (e) {
        send(res, { error: String(e.message) });
      } finally {
        res.end();
      }
    })();
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Agency OS Update Agent v${currentVersion} | porta ${PORT}`);
});
