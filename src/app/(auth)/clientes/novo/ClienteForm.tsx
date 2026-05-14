'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { criarCliente } from '@/lib/actions/clientes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export function ClienteForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(criarCliente, null)

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success('Cliente criado com sucesso!')
      router.push('/clientes')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" name="nome" required placeholder="Nome do cliente" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="documento">CPF / CNPJ</Label>
          <Input id="documento" name="documento" placeholder="000.000.000-00" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input id="telefone" name="telefone" placeholder="(00) 00000-0000" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="email@empresa.com" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Input id="endereco" name="endereco" placeholder="Rua, número, cidade - UF" />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar Cliente'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/clientes">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
