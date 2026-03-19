#!/usr/bin/env node
// ============================================================
//  Agency OS — Script de Provisionamento (USE: dono do sistema)
//
//  Rode este script quando um novo comprador adquirir o sistema.
//  Ele cria o banco de dados Supabase automaticamente, convida
//  o comprador como membro e gera a chave de licença.
//
//  Configuração (primeira vez):
//    cp owner/.env.example owner/.env
//    # preencha owner/.env com seus dados
//
//  Uso:
//    node owner/provision.js --email=comprador@email.com --name="Nome da Agência"
// ============================================================

const https  = require('https');
const crypto = require('crypto');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const OWNER_ACCESS_TOKEN = process.env.OWNER_SUPABASE_TOKEN;
const OWNER_SUPABASE_URL = process.env.OWNER_SUPABASE_URL;
const OWNER_SERVICE_KEY  = process.env.OWNER_SERVICE_ROLE_KEY;
const OWNER_ORG_ID       = process.env.OWNER_ORG_ID;
const APP_REPO           = process.env.APP_REPO_URL || 'https://github.com/SEU_USUARIO/SEU_REPO.git';
const SUPABASE_API       = 'api.supabase.com';

// ── Parse args ──────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2)
    .filter(a => a.startsWith('--'))
    .map(a => { const [k, ...v] = a.slice(2).split('='); return [k, v.join('=')]; })
);

const buyerEmail = args.email;
const agencyName = args.name || 'Agência';

if (!buyerEmail) {
  console.error('Uso: node owner/provision.js --email=comprador@email.com --name="Nome da Agência"');
  process.exit(1);
}
if (!OWNER_ACCESS_TOKEN || !OWNER_SUPABASE_URL || !OWNER_SERVICE_KEY || !OWNER_ORG_ID) {
  console.error('Configure owner/.env antes de continuar (veja owner/.env.example)');
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const BOLD   = '\x1b[1m';
const NC     = '\x1b[0m';

const ok   = msg => console.log(`${GREEN}✔ ${msg}${NC}`);
const warn = msg => console.log(`${YELLOW}⚠ ${msg}${NC}`);
const step = msg => console.log(`\n${BOLD}▶ ${msg}${NC}`);
const err  = msg => { console.error(`${RED}✖ ${msg}${NC}`); process.exit(1); };

function apiRequest(method, path, body = null, token = OWNER_ACCESS_TOKEN) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: SUPABASE_API,
      path: `/v1${path}`,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function restRequest(method, table, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${OWNER_SUPABASE_URL}/rest/v1/${table}`);
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method,
      headers: {
        'apikey': OWNER_SERVICE_KEY,
        'Authorization': `Bearer ${OWNER_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function generateLicenseKey() {
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `AGC-${seg()}-${seg()}-${seg()}`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ────────────────────────────────────────────────────
(async () => {
  console.log(`\n${BOLD}Agency OS — Provisionando novo comprador${NC}`);
  console.log(`  Agência: ${agencyName}`);
  console.log(`  Email:   ${buyerEmail}\n`);

  // 1. Criar projeto Supabase
  step('Criando projeto no Supabase...');
  const projectName = agencyName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20);
  const dbPassword  = crypto.randomBytes(18).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24);

  const project = await apiRequest('POST', '/projects', {
    name:            projectName,
    organization_id: OWNER_ORG_ID,
    plan:            'free',
    region:          'sa-east-1',
    db_pass:         dbPassword,
  });

  if (!project.id) err(`Falha ao criar projeto: ${JSON.stringify(project)}`);
  const projectRef = project.id;
  ok(`Projeto criado: ${projectRef}`);

  // 2. Aguardar ficar pronto
  step('Aguardando banco de dados ficar pronto');
  process.stdout.write('  ');
  for (let i = 0; i < 60; i++) {
    const info = await apiRequest('GET', `/projects/${projectRef}`);
    if (info.status === 'ACTIVE_HEALTHY') { process.stdout.write('\n'); break; }
    process.stdout.write('.');
    await sleep(5000);
    if (i === 59) { process.stdout.write('\n'); warn('Timeout — continuando mesmo assim'); }
  }
  ok('Banco de dados pronto');

  // 3. Obter chaves da API
  step('Obtendo credenciais do projeto');
  const keys = await apiRequest('GET', `/projects/${projectRef}/api-keys`);
  const anonKey    = keys.find(k => k.name === 'anon')?.api_key;
  const serviceKey = keys.find(k => k.name === 'service_role')?.api_key;
  if (!anonKey) err('Não foi possível obter as chaves do projeto');
  const supabaseUrl = `https://${projectRef}.supabase.co`;
  ok(`URL: ${supabaseUrl}`);

  // 4. Aplicar migrations
  step('Aplicando banco de dados (migrations)');
  const { execSync } = require('child_process');
  try {
    const appDir = require('path').join(__dirname, '..');
    execSync(`supabase db push --project-ref ${projectRef}`, {
      cwd: appDir,
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: OWNER_ACCESS_TOKEN },
      stdio: 'pipe',
    });
    ok('Migrations aplicadas');
  } catch (e) {
    warn('Migrations com aviso: ' + e.stderr?.toString().slice(0, 100));
  }

  // 5. Deploy Edge Functions
  step('Publicando Edge Functions');
  try {
    const appDir = require('path').join(__dirname, '..');
    execSync(`supabase functions deploy --project-ref ${projectRef}`, {
      cwd: appDir,
      env: { ...process.env, SUPABASE_ACCESS_TOKEN: OWNER_ACCESS_TOKEN },
      stdio: 'pipe',
    });
    ok('Edge Functions publicadas');
  } catch (e) {
    warn('Edge Functions com aviso (verifique depois)');
  }

  // 6. Convidar comprador como membro do projeto
  step(`Convidando ${buyerEmail} para o projeto Supabase`);
  try {
    // Primeiro pega o org slug
    const orgs = await apiRequest('GET', '/organizations');
    const org  = orgs.find(o => o.id === OWNER_ORG_ID);
    if (org?.slug) {
      const invite = await apiRequest('POST', `/organizations/${org.slug}/members/invite`, {
        email: buyerEmail,
        role:  'developer',
      });
      if (invite?.id || invite?.email) {
        ok(`Convite enviado para ${buyerEmail} — ele receberá um email do Supabase`);
      } else {
        warn(`Convite não confirmado. Adicione manualmente: supabase.com → org → Members → Invite`);
      }
    }
  } catch {
    warn(`Não foi possível convidar automaticamente. Adicione manualmente em supabase.com`);
  }

  // 7. Gerar chave de licença
  step('Gerando chave de licença');
  const licenseKey = generateLicenseKey();

  // 8. Salvar no banco de licenças (owner's Supabase)
  await restRequest('POST', 'licenses', {
    key:                   licenseKey,
    status:                'active',
    buyer_email:           buyerEmail,
    buyer_name:            agencyName,
    supabase_project_ref:  projectRef,
    supabase_url:          supabaseUrl,
    supabase_anon_key:     anonKey,
    supabase_service_key:  serviceKey,
    supabase_db_password:  dbPassword,
  });
  ok(`Licença gerada e salva`);

  // 9. Exibir resultado final
  console.log(`\n${GREEN}${BOLD}`);
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║         ✔ PROVISIONAMENTO CONCLUÍDO!             ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log(`${NC}`);
  console.log(`  ${BOLD}Envie para o comprador:${NC}`);
  console.log(`  ┌────────────────────────────────────────────────`);
  console.log(`  │  Chave de licença: ${BOLD}${licenseKey}${NC}`);
  console.log(`  │`);
  console.log(`  │  Instruções de instalação:`);
  console.log(`  │  1. Na VPS, rode: curl -fsSL ${APP_REPO.replace('.git','/raw/main/install.sh')} | sudo bash`);
  console.log(`  │  2. Quando pedir, informe a chave: ${licenseKey}`);
  console.log(`  │`);
  console.log(`  │  Acesso ao banco de dados:`);
  console.log(`  │  O comprador receberá um convite por email do Supabase`);
  console.log(`  └────────────────────────────────────────────────`);
  console.log(`\n  ${BOLD}Detalhes internos (guarde em lugar seguro):${NC}`);
  console.log(`  Project Ref:  ${projectRef}`);
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  DB Password:  ${dbPassword}`);
  console.log('');
})();
