'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { criarObra } from '@/lib/actions/obras'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import Link from 'next/link'

type Cliente = { id: string; nome: string }
type Aprovador = { id: string; nome: string; email: string; clienteId: string | null }
type Responsavel = { id: string; nome: string }

export function ObraForm({
  clientes,
  aprovadores,
  responsaveis,
}: {
  clientes: Cliente[]
  aprovadores: Aprovador[]
  responsaveis: Responsavel[]
}) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(criarObra, null)
  const [clienteIdSelecionado, setClienteIdSelecionado] = useState('')

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success('Obra criada com sucesso!')
      router.push('/obras')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  const aprovadoresDoCliente = aprovadores.filter(
    (a) => a.clienteId === clienteIdSelecionado
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input id="nome" name="nome" required placeholder="Nome da obra" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" name="descricao" placeholder="Descrição da obra" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="clienteId">Cliente *</Label>
        <select
          id="clienteId"
          name="clienteId"
          required
          value={clienteIdSelecionado}
          onChange={(e) => setClienteIdSelecionado(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Selecione um cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="aprovadorClienteId">Aprovador do Cliente</Label>
        <select
          id="aprovadorClienteId"
          name="aprovadorClienteId"
          disabled={!clienteIdSelecionado}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <option value="">
            {clienteIdSelecionado
              ? aprovadoresDoCliente.length === 0
                ? 'Nenhum aprovador cadastrado para este cliente'
                : 'Selecione o aprovador'
              : 'Selecione o cliente primeiro'}
          </option>
          {aprovadoresDoCliente.map((a) => (
            <option key={a.id} value={a.id}>{a.nome} — {a.email}</option>
          ))}
        </select>
        {clienteIdSelecionado && aprovadoresDoCliente.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Crie um acesso de aprovação na página do cliente antes de vincular.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="responsavelInternoId">Responsável Interno</Label>
        <select
          id="responsavelInternoId"
          name="responsavelInternoId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Selecione o responsável interno</option>
          {responsaveis.map((r) => (
            <option key={r.id} value={r.id}>{r.nome}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="planejada">Planejada</option>
          <option value="em_andamento">Em Andamento</option>
          <option value="pausada">Pausada</option>
          <option value="concluida">Concluída</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dataInicio">Data de Início</Label>
          <Input id="dataInicio" name="dataInicio" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dataFim">Previsão de Conclusão</Label>
          <Input id="dataFim" name="dataFim" type="date" />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <p className="font-medium text-sm">Endereço da Obra (opcional)</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="logradouro">Logradouro</Label>
            <Input id="logradouro" name="logradouro" placeholder="Rua, Avenida..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input id="numero" name="numero" placeholder="Nº" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input id="bairro" name="bairro" placeholder="Bairro" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" name="cep" placeholder="00000-000" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input id="cidade" name="cidade" placeholder="Cidade" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estado">UF</Label>
            <Input id="estado" name="estado" placeholder="UF" maxLength={2} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar Obra'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/obras">Cancelar</Link>
        </Button>
      </div>
    </form>
  )
}
