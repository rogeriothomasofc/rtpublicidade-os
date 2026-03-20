/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();

// Workbox precache (injetado pelo vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST);

// Supabase REST — NetworkFirst (dados sempre frescos)
registerRoute(
  ({ url }) => /supabase\.co\/rest\/v1\//i.test(url.href),
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Supabase Edge Functions — sempre rede
registerRoute(
  ({ url }) => /supabase\.co\/functions\/v1\//i.test(url.href),
  new NetworkOnly()
);

// Google Fonts — CacheFirst (raramente mudam)
registerRoute(
  ({ url }) => /fonts\.googleapis\.com/i.test(url.href),
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);
registerRoute(
  ({ url }) => /fonts\.gstatic\.com/i.test(url.href),
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Push Notifications ────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: { title: string; body: string; url: string | null; tag?: string } = {
    title: 'Agency OS',
    body: '',
    url: null,
  };

  try {
    const data = event.data.json();
    payload = {
      title: data.title ?? payload.title,
      body:  data.body  ?? payload.body,
      url:   data.url   ?? null,
      tag:   data.tag   ?? undefined,
    };
  } catch {
    try { payload.body = event.data.text(); } catch { /* ignore */ }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body:  payload.body,
      icon:  '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag:   payload.tag || payload.url || 'agency-os-push',
      data:  { url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url as string | null;
  if (!url) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const base = url.split('?')[0];
        for (const client of clientList) {
          if (client.url === url || client.url.startsWith(base)) {
            return (client as WindowClient).focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
