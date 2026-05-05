'use client'

import { Bell, Sun, Moon } from 'lucide-react'
import { UserButton } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function Header({ title }: { title?: string }) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = document.cookie.match(/theme=([^;]+)/)?.[1]
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = stored ? stored === 'dark' : prefersDark
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    document.cookie = `theme=${next ? 'dark' : 'light'};path=/;max-age=31536000`
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" aria-label="Notificações">
          <Bell className="h-4 w-4" />
        </Button>
        <UserButton />
      </div>
    </header>
  )
}
