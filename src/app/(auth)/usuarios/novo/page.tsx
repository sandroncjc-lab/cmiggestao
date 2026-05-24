'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { criarUsuarioInterno } from '@/lib/actions/usuarios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

export default function NovoUsuarioPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(criarUsuarioInterno, null)

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success('Usuário criado com sucesso!')
      router.push('/usuarios')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Novo Usuário</h2>
        <p className="text-muted-foreground">Crie um acesso interno para a equipe</p>
      </div>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome completo *</Label>
          <Input id="nome" name="nome" required placeholder="João Silva" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" required placeholder="joao@empresa.com" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="senha">Senha *</Label>
          <Input id="senha" name="senha" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="funcao">Função *</Label>
          <select
            id="funcao"
            name="funcao"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Selecione a função</option>
            <option value="admin">Administrador</option>
            <option value="engenheiro">Engenheiro</option>
            <option value="encarregado">Encarregado</option>
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvando...' : 'Criar Usuário'}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/usuarios">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
