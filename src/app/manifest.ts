import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CMIG Gestão de Obras',
    short_name: 'CMIG',
    description: 'Sistema de gestão de obras para empresas de engenharia',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    theme_color: '#1e40af',      // blue-800 — cor primária do app
    background_color: '#f8fafc', // slate-50 — fundo das páginas
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
