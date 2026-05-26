'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { atualizarUsuario } from '@/lib/actions/usuarios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

type Props = {
  usuario: {
    id: string
    nome: string
    email: string
    funcao: string | null
    empresaId: string | null
  }
  empresas: { id: string; nome: string }[]
}

export function EditarUsuarioForm({ usuario, empresas }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(atualizarUsuario, null)

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success('Usuário atualizado com sucesso!')
      router.push('/usuarios')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  const isPendente = !usuario.funcao || usuario.funcao === 'pendente'

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={usuario.id} />

      <div className="space-y-2">
        <Label htmlFor="nome">Nome completo *</Label>
        <Input id="nome" name="nome" required defaultValue={usuario.nome} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={usuario.email} disabled className="opacity-60" />
        <p className="text-xs text-muted-foreground">Email não pode ser alterado aqui</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="funcao">Função *</Label>
        <select
          id="funcao"
          name="funcao"
          required
          defaultValue={isPendente ? '' : (usuario.funcao ?? '')}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isPendente && <option value="">Selecione uma função</option>}
          <option value="admin">Administrador</option>
          <option value="engenheiro">Engenheiro</option>
          <option value="encarregado">Encarregado</option>
          <option value="aprovador_cliente">Aprovador Cliente</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="empresaId">Empresa</Label>
        <select
          id="empresaId"
          name="empresaId"
          defaultValue={usuario.empresaId ?? ''}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Sem empresa (manter pendente)</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>{e.nome}</option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Sem empresa → usuário continua pendente até ser atribuído
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : isPendente ? 'Atribuir Usuário' : 'Salvar'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/usuarios">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
