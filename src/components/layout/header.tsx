'use client'

import { Bell, Sun, Moon, X } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { useEffect, useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { listarNotificacoes, marcarComoLida, marcarTodasComoLidas } from '@/lib/actions/notificacoes'
import Link from 'next/link'

type Notificacao = {
  id: string
  titulo: string
  mensagem: string
  lida: boolean
  tipo: string | null
  referenciaId: string | null
  tabelaReferencia: string | null
  criadoEm: Date
}

const tipoLink: Record<string, string> = {
  rdo_pendente: '/rdo',
  rdo_aprovado: '/rdo',
  rdo_rejeitado: '/rdo',
  hh_registrado: '/hh',
  hh_alerta_80: '/hh',
  hh_limite_100: '/hh',
}

export function Header({ title }: { title?: string }) {
  const [dark, setDark] = useState(false)
  const [notifs, setNotifs] = useState<Notificacao[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [, startTransition] = useTransition()
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = document.cookie.match(/theme=([^;]+)/)?.[1]
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored ? stored === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  useEffect(() => {
    listarNotificacoes().then(setNotifs)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    if (showNotifs) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifs])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.cookie = `theme=${next ? 'dark' : 'light'};path=/;max-age=31536000`
  }

  const naoLidas = notifs.filter((n) => !n.lida).length

  function handleMarcarLida(id: string) {
    startTransition(async () => {
      await marcarComoLida(id)
      setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n))
    })
  }

  function handleMarcarTodas() {
    startTransition(async () => {
      await marcarTodasComoLidas()
      setNotifs((prev) => prev.map((n) => ({ ...n, lida: true })))
    })
  }

  function getHref(n: Notificacao) {
    if (n.tabelaReferencia === 'rdo' && n.referenciaId) return `/rdo/${n.referenciaId}`
    if (n.tipo) return tipoLink[n.tipo] ?? null
    return null
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Sino de notificações */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notificações"
            onClick={() => setShowNotifs(!showNotifs)}
          >
            <Bell className="h-4 w-4" />
            {naoLidas > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </Button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-border bg-background shadow-lg z-50">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">Notificações</span>
                <div className="flex items-center gap-2">
                  {naoLidas > 0 && (
                    <button onClick={handleMarcarTodas} className="text-xs text-muted-foreground hover:text-foreground">
                      Marcar todas como lidas
                    </button>
                  )}
                  <button onClick={() => setShowNotifs(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 && (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação</p>
                )}
                {notifs.map((n) => {
                  const href = getHref(n)
                  const content = (
                    <div className={`px-4 py-3 ${!n.lida ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-snug">{n.titulo}</span>
                        {!n.lida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.mensagem}</p>
                    </div>
                  )
                  return (
                    <div
                      key={n.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer"
                      onClick={() => { if (!n.lida) handleMarcarLida(n.id); setShowNotifs(false) }}
                    >
                      {href ? <Link href={href}>{content}</Link> : content}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <UserButton />
      </div>
    </header>
  )
}
