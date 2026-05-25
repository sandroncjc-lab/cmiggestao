'use client'
/**
 * Registra o Service Worker para tornar o app instalável.
 * Renderiza null — sem UI.
 */
import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] Service Worker registrado:', reg.scope)
        })
        .catch((err) => {
          console.warn('[PWA] Falha ao registrar Service Worker:', err)
        })
    }
  }, [])

  return null
}
