'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { registrarMovimentacao } from '@/lib/actions/epis'

type TipoMov = 'ENTRADA' | 'SAIDA_OBRA' | 'AJUSTE' | 'DESCARTE'

const tipoConfig: Record<TipoMov, { label: string; variant: BadgeVariant }> = {
  ENTRADA: { label: 'ENTRADA', variant: 'success' },
  SAIDA_OBRA: { label: 'SAÍDA OBRA', variant: 'info' },
  AJUSTE: { label: 'AJUSTE', variant: 'secondary' },
  DESCARTE: { label: 'DESCARTE', variant: 'destructive' },
}

interface MovimentacaoRow {
  id: string
  tipo: TipoMov
  quantidade: number
  dataMovimentacao: string
  notaFiscal: string | null
  observacoes: string | null
  distribuicaoId: string | null
  epiTipo: string
  epiCa: string | null
  obraId: string | null
  obraNome: string | null
  criadoEm: Date
}

interface EpiOpcao { id: string; tipo: string; ca: string | null }

interface Props {
  movimentacoes: MovimentacaoRow[]
  epis: EpiOpcao[]
}

export function MovimentacoesTab({ movimentacoes, epis }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  const hoje = new Date().toISOString().split('T')[0]

  function fechar() { setDialogOpen(false); setErro(null) }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await registrarMovimentacao({
          epiId: fd.get('epiId') as string,
          tipo: fd.get('tipo') as 'ENTRADA' | 'AJUSTE' | 'DESCARTE',
          quantidade: Number(fd.get('quantidade')),
          dataMovimentacao: fd.get('data') as string,
          notaFiscal: fd.get('notaFiscal') as string || null,
          observacoes: fd.get('observacoes') as string || null,
        })
        fechar()
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao registrar')
      }
    })
  }

  function referencia(mov: MovimentacaoRow) {
    if (mov.tipo === 'ENTRADA') return mov.notaFiscal ? `NF ${mov.notaFiscal}` : '—'
    if (mov.tipo === 'SAIDA_OBRA') return mov.obraNome ?? 'Obra'
    return mov.observacoes ?? '—'
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nova Movimentação
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>EPI</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Referência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentacoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Nenhuma movimentação registrada
                  </TableCell>
                </TableRow>
              )}
              {movimentacoes.map((m) => {
                const cfg = tipoConfig[m.tipo]
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {format(new Date(m.dataMovimentacao + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {m.epiTipo}
                      {m.epiCa && <span className="ml-1 text-xs text-muted-foreground font-mono">CA {m.epiCa}</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.quantidade} un.</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{referencia(m)}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={fechar}>
        <form onSubmit={handleSubmit}>
          <DialogHeader><DialogTitle>Nova Movimentação</DialogTitle></DialogHeader>
          <DialogContent className="grid gap-4">
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <div className="grid gap-1.5">
              <Label>EPI *</Label>
              <select name="epiId" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Selecione o EPI...</option>
                {epis.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.tipo}{e.ca ? ` (CA ${e.ca})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Tipo *</Label>
              <select name="tipo" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="ENTRADA">ENTRADA — adicionar ao estoque</option>
                <option value="DESCARTE">DESCARTE — baixar do estoque</option>
                <option value="AJUSTE">AJUSTE — corrigir para valor absoluto</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Quantidade *</Label>
                <Input name="quantidade" type="number" min="1" required />
              </div>
              <div className="grid gap-1.5">
                <Label>Data *</Label>
                <Input name="data" type="date" required defaultValue={hoje} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Nota Fiscal (para ENTRADA)</Label>
              <Input name="notaFiscal" placeholder="ex: NF-12345" />
            </div>
            <div className="grid gap-1.5">
              <Label>Observações</Label>
              <Textarea name="observacoes" rows={2} />
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" disabled={pending}>Registrar</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  )
}
