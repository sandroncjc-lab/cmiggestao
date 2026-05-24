'use client'

import { useRef, useState, useTransition } from 'react'
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
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  // ref no form — imune ao problema do Portal do Radix desconectar e.currentTarget
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = formRef.current
    if (!form) return

    // Lê os valores via elements.namedItem — seguro mesmo dentro de Portal
    const nome = (form.elements.namedItem('nome') as HTMLInputElement).value.trim()
    const email = (form.elements.namedItem('email') as HTMLInputElement).value.trim()
    const senha = (form.elements.namedItem('senha') as HTMLInputElement).value

    // Validação client-side antes de ir ao servidor
    if (!nome) { setError('Nome é obrigatório'); return }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Email inválido'); return }
    if (senha.length < 8) { setError('Senha deve ter mínimo 8 caracteres'); return }

    // Monta FormData manualmente — não usa e.currentTarget nem new FormData(form)
    // para evitar o bug de campos vazios dentro de Portal
    const formData = new FormData()
    formData.set('clienteId', clienteId)
    formData.set('nome', nome)
    formData.set('email', email)
    formData.set('senha', senha)

    startTransition(async () => {
      const result = await criarUsuarioAprovador(null, formData)
      if (result.success) {
        form.reset()
        setOpen(false)
        router.refresh()
      } else {
        setError(result.error ?? 'Erro ao criar acesso')
      }
    })
  }

  return (
    <>
      <Button variant="outline" onClick={() => { setError(''); setOpen(true) }}>
        <UserPlus className="h-4 w-4 mr-2" />Criar Acesso de Aprovação
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogHeader>
          <DialogTitle>Criar acesso para {clienteNome}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ap-nome">Nome completo</Label>
              <Input id="ap-nome" name="nome" required placeholder="João Silva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-email">Email</Label>
              <Input id="ap-email" name="email" type="email" required placeholder="joao@empresa.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-senha">Senha (mínimo 8 caracteres)</Label>
              <Input id="ap-senha" name="senha" type="password" required minLength={8} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Criando...' : 'Criar Acesso'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
