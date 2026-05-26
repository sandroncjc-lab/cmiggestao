'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { atribuirResponsavel, atribuirClienteInteiro, removerResponsavel } from '@/lib/actions/responsaveis'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trash2, Users, Building2 } from 'lucide-react'

type ObraRow = { obraId: string; obraNome: string; obraStatus: string; clienteId: string; clienteNome: string }
type ClienteComObras = { clienteId: string; clienteNome: string; obras: ObraRow[] }
type ObraAtual = { id: string; papel: string; obraId: string; obraNome: string; clienteId: string; clienteNome: string }

type Props = {
  usuarioId: string
  usuarioFuncao: string | null
  adminEmpresaId: string
  clientesComObras: ClienteComObras[]
  obrasAtuais: ObraAtual[]
}

const papelLabel: Record<string, string> = {
  encarregado: 'Encarregado',
  aprovador: 'Aprovador',
}

type Modo = 'obras' | 'cliente'

export function AtribuirObrasForm({ usuarioId, usuarioFuncao, adminEmpresaId, clientesComObras, obrasAtuais }: Props) {
  const [isPending, startTransition] = useTransition()

  const [modo, setModo] = useState<Modo>('obras')
  const [clienteSelecionado, setClienteSelecionado] = useState('')
  const [obrasSelecionadas, setObrasSelecionadas] = useState<string[]>([])
  const [papel, setPapel] = useState<'encarregado' | 'aprovador'>('encarregado')

  const obrasDoCliente = clientesComObras.find((c) => c.clienteId === clienteSelecionado)?.obras ?? []

  function toggleObra(obraId: string) {
    setObrasSelecionadas((prev) =>
      prev.includes(obraId) ? prev.filter((id) => id !== obraId) : [...prev, obraId]
    )
  }

  function handleClienteChange(clienteId: string) {
    setClienteSelecionado(clienteId)
    setObrasSelecionadas([])
  }

  const isPendente = !usuarioFuncao || usuarioFuncao === 'pendente'
  const setPayload = isPendente
    ? { setFuncao: papel === 'aprovador' ? 'aprovador_cliente' : 'encarregado', setEmpresaId: adminEmpresaId }
    : {}

  function handleAtribuirObras() {
    if (!obrasSelecionadas.length) {
      toast.error('Selecione ao menos uma obra')
      return
    }
    startTransition(async () => {
      const result = await atribuirResponsavel({
        usuarioId,
        papel,
        obraIds: obrasSelecionadas,
        ...setPayload,
      })
      if (result.success) {
        toast.success('Atribuição salva!')
        setObrasSelecionadas([])
        setClienteSelecionado('')
      } else {
        toast.error(result.error ?? 'Erro ao atribuir')
      }
    })
  }

  function handleAtribuirCliente() {
    if (!clienteSelecionado) {
      toast.error('Selecione um cliente')
      return
    }
    const nomeCliente = clientesComObras.find((c) => c.clienteId === clienteSelecionado)?.clienteNome ?? 'cliente'
    startTransition(async () => {
      const result = await atribuirClienteInteiro({
        usuarioId,
        papel,
        clienteId: clienteSelecionado,
        ...setPayload,
      })
      if (result.success) {
        toast.success(`Atribuído a todas as ${result.count} obra(s) de ${nomeCliente}!`)
        setClienteSelecionado('')
      } else {
        toast.error(result.error ?? 'Erro ao atribuir')
      }
    })
  }

  function handleRemover(responsavelId: string) {
    startTransition(async () => {
      const result = await removerResponsavel(responsavelId)
      if (result.success) toast.success('Atribuição removida')
      else toast.error(result.error ?? 'Erro ao remover')
    })
  }

  return (
    <div className="space-y-6">
      {/* Atribuições existentes */}
      {obrasAtuais.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Atribuições atuais</p>
          <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
            {obrasAtuais.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 bg-background">
                <div>
                  <p className="text-sm font-medium">{o.obraNome}</p>
                  <p className="text-xs text-muted-foreground">{o.clienteNome}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={o.papel === 'aprovador' ? 'outline' : 'secondary'}>
                    {papelLabel[o.papel] ?? o.papel}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => handleRemover(o.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">Nenhuma obra atribuída ainda.</p>
      )}

      {/* Formulário de nova atribuição */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Plus className="h-4 w-4" /> Adicionar atribuição
          </p>

          {/* Papel */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Papel *</label>
            <select
              value={papel}
              onChange={(e) => setPapel(e.target.value as 'encarregado' | 'aprovador')}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="encarregado">Encarregado</option>
              <option value="aprovador">Aprovador</option>
            </select>
          </div>

          {/* Modo de atribuição */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Modo de atribuição</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setModo('obras'); setObrasSelecionadas([]) }}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  modo === 'obras'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                Obras específicas
              </button>
              <button
                type="button"
                onClick={() => { setModo('cliente'); setObrasSelecionadas([]) }}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  modo === 'cliente'
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-input bg-background text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                Cliente inteiro
              </button>
            </div>
            {modo === 'cliente' && (
              <p className="text-xs text-muted-foreground">
                Atribui a pessoa a todas as obras deste cliente (incluindo futuras).
              </p>
            )}
          </div>

          {/* Cliente */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Cliente *</label>
            {clientesComObras.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhum cliente com obras cadastrado.</p>
            ) : (
              <select
                value={clienteSelecionado}
                onChange={(e) => handleClienteChange(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecione um cliente</option>
                {clientesComObras.map((c) => (
                  <option key={c.clienteId} value={c.clienteId}>
                    {c.clienteNome} ({c.obras.length} obra{c.obras.length !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Obras do cliente (modo específico) */}
          {modo === 'obras' && clienteSelecionado && obrasDoCliente.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                Obras de {clientesComObras.find((c) => c.clienteId === clienteSelecionado)?.clienteNome} *
              </label>
              <div className="rounded-md border border-input divide-y divide-border overflow-hidden">
                {obrasDoCliente.map((o) => {
                  const jaAtribuido = obrasAtuais.some((a) => a.obraId === o.obraId && a.papel === papel)
                  return (
                    <label
                      key={o.obraId}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/40 ${jaAtribuido ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={obrasSelecionadas.includes(o.obraId)}
                        disabled={jaAtribuido}
                        onChange={() => toggleObra(o.obraId)}
                        className="rounded border-border"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{o.obraNome}</p>
                        <p className="text-xs text-muted-foreground">{o.obraStatus}</p>
                      </div>
                      {jaAtribuido && <Badge variant="secondary" className="text-xs">Já atribuído</Badge>}
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">{obrasSelecionadas.length} selecionada{obrasSelecionadas.length !== 1 ? 's' : ''}</p>
            </div>
          )}

          {/* Resumo modo cliente inteiro */}
          {modo === 'cliente' && clienteSelecionado && (
            <div className="rounded-md bg-muted/50 border border-border px-4 py-3 text-sm">
              <strong>{obrasDoCliente.length} obra{obrasDoCliente.length !== 1 ? 's' : ''}</strong> serão atribuídas ao usuário como{' '}
              <strong>{papelLabel[papel]}</strong>.
            </div>
          )}

          {modo === 'obras' ? (
            <Button
              onClick={handleAtribuirObras}
              disabled={isPending || !clienteSelecionado || obrasSelecionadas.length === 0}
            >
              {isPending ? 'Salvando...' : 'Atribuir obras selecionadas'}
            </Button>
          ) : (
            <Button
              onClick={handleAtribuirCliente}
              disabled={isPending || !clienteSelecionado}
            >
              {isPending ? 'Salvando...' : 'Atribuir cliente inteiro'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
