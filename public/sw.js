/**
 * Service Worker — CMIG Gestão de Obras
 *
 * Estratégia: Network Only.
 * O app SEMPRE busca do servidor — nunca serve conteúdo desatualizado.
 * O SW existe apenas para satisfazer o critério de instalabilidade do browser.
 *
 * Ao ativar, apaga qualquer cache de versões anteriores.
 */

const CACHE_NAME = 'cmig-v1'

self.addEventListener('install', () => {
  // Ativa o novo SW imediatamente, sem esperar fechar todas as abas
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Apaga caches antigos (caso uma versão anterior tenha criado algum)
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Network Only: passa direto para o servidor
  // Se o servidor não responder (sem internet), o browser mostra seu erro padrão
  event.respondWith(fetch(event.request))
})
