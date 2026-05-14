'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UserPlus } from 'lucide-react'
import { criarUsuarioAprovador } from '@/lib/actions/clientes'
import { useRouter } from 'next/navigation'

export function CriarAprovadorDialog({ clienteId, clienteNome }: { clienteId: string; clienteNome: string }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    formData.set('clienteId', clienteId)

    startTransition(async () => {
      const result = await criarUsuarioAprovador(null, formData)
      if (result.success) {
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error ?? 'Erro ao criar acesso')
      }
    })
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4 mr-2" />Criar Acesso de Aprovação
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle>Criar acesso para {clienteNome}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" name="nome" required placeholder="João Silva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="joao@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha (mínimo 8 caracteres)</Label>
              <Input id="senha" name="senha" type="password" required minLength={8} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Criar Acesso</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
