'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { criarObra, criarAprovadorInline } from '@/lib/actions/obras'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserPlus } from 'lucide-react'
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
  const [aprovadoresLocais, setAprovadoresLocais] = useState<Aprovador[]>(aprovadores)
  const [aprovadorSelecionadoId, setAprovadorSelecionadoId] = useState('')

  // Dialog de criar aprovador inline
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogError, setDialogError] = useState('')
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!state) return
    if (state.success) {
      toast.success('Obra criada com sucesso!')
      router.push('/obras')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  const aprovadoresDoCliente = aprovadoresLocais.filter(
    (a) => a.clienteId === clienteIdSelecionado
  )

  function handleClienteChange(id: string) {
    setClienteIdSelecionado(id)
    setAprovadorSelecionadoId('')
  }

  function handleCriarAprovador(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setDialogError('')
    const form = e.currentTarget
    const nome = (form.elements.namedItem('aprovNome') as HTMLInputElement).value
    const email = (form.elements.namedItem('aprovEmail') as HTMLInputElement).value

    startTransition(async () => {
      const result = await criarAprovadorInline(clienteIdSelecionado, nome, email, '')
      if (result.success && result.aprovador) {
        const novo: Aprovador = { ...result.aprovador, clienteId: clienteIdSelecionado }
        setAprovadoresLocais((prev) => [...prev, novo])
        setAprovadorSelecionadoId(result.aprovador!.id)
        setDialogOpen(false)
        toast.success('Aprovador criado e selecionado!')
      } else {
        setDialogError(result.error ?? 'Erro ao criar aprovador')
      }
    })
  }

  return (
    <>
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
            onChange={(e) => handleClienteChange(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Selecione um cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="aprovadorClienteId">Aprovador do Cliente</Label>
            {clienteIdSelecionado && (
              <button
                type="button"
                onClick={() => { setDialogError(''); setDialogOpen(true) }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <UserPlus className="h-3 w-3" />
                Criar aprovador
              </button>
            )}
          </div>
          <select
            id="aprovadorClienteId"
            name="aprovadorClienteId"
            disabled={!clienteIdSelecionado}
            value={aprovadorSelecionadoId}
            onChange={(e) => setAprovadorSelecionadoId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">
              {clienteIdSelecionado
                ? aprovadoresDoCliente.length === 0
                  ? 'Nenhum aprovador — clique em "Criar aprovador" acima'
                  : 'Selecione o aprovador'
                : 'Selecione o cliente primeiro'}
            </option>
            {aprovadoresDoCliente.map((a) => (
              <option key={a.id} value={a.id}>{a.nome} — {a.email}</option>
            ))}
          </select>
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

      {/* Dialog — criar aprovador inline */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Criar Aprovador</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <form onSubmit={handleCriarAprovador} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="aprovNome">Nome completo</Label>
              <Input id="aprovNome" name="aprovNome" required placeholder="João Silva" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="aprovEmail">Email</Label>
              <Input id="aprovEmail" name="aprovEmail" type="email" required placeholder="joao@cliente.com" />
            </div>
            <p className="text-xs text-muted-foreground">
              O aprovador receberá um convite por email para criar a própria senha de acesso.
            </p>
            {dialogError && <p className="text-sm text-destructive">{dialogError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Criar e Selecionar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
