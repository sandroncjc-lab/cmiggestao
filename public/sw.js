/**
 * Service Worker — CMIG Gestão de Obras
 *
 * Objetivo: tornar o app instalável. SEM cache de conteúdo.
 *
 * Só interceptamos GET do mesmo domínio para evitar conflitos com
 * requests cross-origin (Clerk, Google Fonts, APIs externas).
 * POST/PUT/DELETE passam direto pelo browser sem intervenção do SW.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Apaga qualquer cache de versões anteriores
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignora requests cross-origin (Clerk, fontes, APIs externas)
  if (url.origin !== self.location.origin) return

  // Ignora métodos que não são GET (Server Actions, formulários)
  if (event.request.method !== 'GET') return

  // Network Only: sempre vai ao servidor, nunca serve cache
  event.respondWith(
    fetch(event.request).catch(() => {
      // Sem internet: retorna 503 simples (não mostra conteúdo antigo)
      return new Response('Sem conexão com o servidor.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      })
    })
  )
})
