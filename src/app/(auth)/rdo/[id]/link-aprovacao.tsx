'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Copy, Check, ExternalLink } from 'lucide-react'

export function LinkAprovacao({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    await navigator.clipboard.writeText(link)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <Card className="border-amber-200 bg-amber-50/60 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-800 dark:text-amber-300 text-base flex items-center gap-2">
          🔗 Link de Aprovação Remota (Modo B)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Envie este link ao cliente por WhatsApp, e-mail ou outro canal.
          Ele não precisa ter conta no sistema — basta clicar e assinar.
          <span className="font-medium"> Expira em 7 dias.</span>
        </p>
        <div className="flex gap-2">
          <div className="flex-1 font-mono text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap text-slate-600">
            {link}
          </div>
          <Button size="sm" variant="outline" onClick={copiar} className="shrink-0">
            {copiado ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copiado ? 'Copiado!' : 'Copiar'}
          </Button>
          <Button size="sm" variant="outline" asChild className="shrink-0">
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
