# Agency OS - Progressive Web App (PWA)

## Visão Geral

O Agency OS foi transformado em um PWA profissional, permitindo instalação, funcionamento offline e notificações push.

## Funcionalidades

### ✅ Instalação
- Botão flutuante "Instalar App" aparece após 5 segundos
- Detecta automaticamente se o app já está instalado
- Funciona em desktop e mobile (Chrome, Edge, Safari iOS)

### ✅ Modo Offline
- Banner automático quando offline
- Página de fallback estilizada
- Cache de assets estáticos (fonts, imagens, CSS, JS)
- Cache de dados da API com estratégia NetworkFirst

### ✅ Atualização Automática
- Detecta novas versões do Service Worker
- Modal para atualização imediata
- Reload automático após update

### ✅ Notificações Push
- Botão de ativação no TopBar
- Triggers configurados para:
  - Novo lead no pipeline
  - Tarefa vencida
  - Contrato expirando
  - Pagamento pendente

## Arquitetura

```
src/
├── hooks/
│   ├── usePWA.ts           # Hook principal do PWA
│   └── usePushNotifications.ts  # Hook de notificações
├── components/pwa/
│   ├── PWAInstallPrompt.tsx    # Prompt de instalação
│   ├── PWAUpdatePrompt.tsx     # Modal de atualização
│   ├── OfflineBanner.tsx       # Banner offline
│   └── PushNotificationToggle.tsx  # Toggle de push
├── pages/
│   └── OfflinePage.tsx         # Página offline
└── vite-env.d.ts               # Types do PWA

supabase/functions/
└── send-push/                  # Edge function para push

public/
├── pwa-192x192.png            # Ícone 192x192
├── pwa-512x512.png            # Ícone 512x512
└── apple-touch-icon.png       # Ícone iOS
```

## Configuração

### VAPID Keys (Web Push)
Para habilitar notificações push, configure as chaves VAPID:

1. Gere um par de chaves VAPID:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. Adicione as secrets no Supabase:
   - `VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`

### Manifest
O manifest é gerado automaticamente pelo `vite-plugin-pwa` com:
- Nome: "Agency OS"
- Tema: #10B981 (verde)
- Background: #0B0F14 (escuro)
- Display: standalone

## Debug

### Service Worker
1. Abra DevTools (F12)
2. Vá em Application > Service Workers
3. Verifique status e atualizações

### Cache
1. DevTools > Application > Cache Storage
2. Verifique os caches:
   - `workbox-precache-*` (assets)
   - `supabase-api-cache` (dados)
   - `google-fonts-cache` (fonts)

### Push Notifications
1. DevTools > Application > Push Messaging
2. Verifique subscription endpoint

### Logs
```javascript
// No console, para ver logs do PWA
console.log('[PWA]')
```

## Publicação

### Build para Produção
```bash
npm run build
```

### Checklist Pré-publicação
- [ ] HTTPS habilitado (obrigatório para PWA)
- [ ] Lighthouse PWA score > 90
- [ ] Ícones em todas as resoluções
- [ ] Manifest válido
- [ ] Service Worker registrado
- [ ] Offline funcional

### Teste Local
```bash
npm run preview
```

## Troubleshooting

### App não instala
- Verifique se está em HTTPS
- Verifique se manifest está válido
- Verifique se service worker está registrado

### Notificações não funcionam
- Verifique permissão do navegador
- Verifique VAPID keys configuradas
- Verifique logs da edge function

### Offline não funciona
- Verifique se service worker está ativo
- Limpe cache e recarregue
- Verifique estratégias de cache

## Atualizações

Para atualizar o PWA:
1. Faça as alterações no código
2. Incremente versão no `package.json`
3. Deploy (build automático)
4. Usuários receberão prompt de atualização

## Recursos

- [Vite PWA Plugin](https://vite-plugin-pwa.netlify.app/)
- [Web Push Protocol](https://web.dev/push-notifications/)
- [Workbox](https://developers.google.com/web/tools/workbox)
