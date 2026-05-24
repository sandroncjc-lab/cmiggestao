'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle2 } from 'lucide-react'
import { reenviarConvite } from '@/lib/actions/clientes'

export function CriarAprovadorDialog({ clienteId, clienteNome, temEmail }: {
  clienteId: string
  clienteNome: string
  temEmail: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  function handleReenviar() {
    setResult(null)
    startTransition(async () => {
      const res = await reenviarConvite(clienteId)
      setResult(
        res.success
          ? { ok: true, msg: 'Convite enviado! O cliente receberá um email para criar a senha.' }
          : { ok: false, msg: res.error ?? 'Erro ao reenviar convite' }
      )
    })
  }

  if (!temEmail) {
    return (
      <Button variant="outline" disabled title="Cadastre o email do cliente para enviar acesso">
        <Mail className="h-4 w-4 mr-2" />Enviar Acesso
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={handleReenviar} disabled={isPending}>
        <Mail className="h-4 w-4 mr-2" />
        {isPending ? 'Enviando...' : 'Enviar / Reenviar Convite'}
      </Button>
      {result && (
        <p className={`text-xs flex items-center gap-1 ${result.ok ? 'text-green-600' : 'text-destructive'}`}>
          {result.ok && <CheckCircle2 className="h-3 w-3" />}
          {result.msg}
        </p>
      )}
    </div>
  )
}
