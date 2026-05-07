'use client'

import { useState, useTransition, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Plus, Eraser } from 'lucide-react'
import { criarDistribuicao } from '@/lib/actions/epis'

interface DistribuicaoRow {
  id: string
  quantidade: number
  dataDistribuicao: string
  observacoes: string | null
  epiTipo: string
  epiCa: string | null
  obraNome: string
  encarregadoNome: string
}

interface EpiOpcao { id: string; tipo: string; ca: string | null; quantidadeEstoque: number }
interface ObraOpcao { id: string; nome: string }
interface UsuarioOpcao { id: string; nome: string }

interface Props {
  distribuicoes: DistribuicaoRow[]
  epis: EpiOpcao[]
  obras: ObraOpcao[]
  usuarios: UsuarioOpcao[]
  usuarioAtualId: string
  usuarioAtualFuncao: string
}

export function DistribuicoesTab({ distribuicoes, epis, obras, usuarios, usuarioAtualId, usuarioAtualFuncao }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [epiSelecionadoId, setEpiSelecionadoId] = useState('')
  const sigRef = useRef<SignatureCanvas>(null)

  const estoqueEpiSelecionado = epis.find(e => e.id === epiSelecionadoId)?.quantidadeEstoque ?? null
  const [qtdInput, setQtdInput] = useState('')
  const aposDistribuicao = estoqueEpiSelecionado !== null && qtdInput
    ? estoqueEpiSelecionado - Number(qtdInput)
    : null

  const hoje = new Date().toISOString().split('T')[0]

  function fechar() {
    setDialogOpen(false)
    setErro(null)
    setEpiSelecionadoId('')
    setQtdInput('')
    sigRef.current?.clear()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const fd = new FormData(e.currentTarget)

    const assinatura = sigRef.current?.isEmpty() ? null : sigRef.current?.toDataURL() ?? null

    startTransition(async () => {
      try {
        await criarDistribuicao({
          epiId: fd.get('epiId') as string,
          obraId: fd.get('obraId') as string,
          encarregadoId: fd.get('encarregadoId') as string,
          quantidade: Number(fd.get('quantidade')),
          dataDistribuicao: fd.get('data') as string,
          assinaturaEncarregadoBase64: assinatura,
          observacoes: fd.get('observacoes') as string || null,
        })
        fechar()
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao registrar distribuição')
      }
    })
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nova Distribuição
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>EPI</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead>Encarregado</TableHead>
                <TableHead>Observações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribuicoes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhuma distribuição registrada
                  </TableCell>
                </TableRow>
              )}
              {distribuicoes.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    {format(new Date(d.dataDistribuicao + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell>{d.obraNome}</TableCell>
                  <TableCell>
                    {d.epiTipo}
                    {d.epiCa && <span className="ml-1 text-xs text-muted-foreground font-mono">CA {d.epiCa}</span>}
                  </TableCell>
                  <TableCell className="font-medium">{d.quantidade} un.</TableCell>
                  <TableCell>{d.encarregadoNome}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{d.observacoes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={fechar} className="max-w-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Distribuição</DialogTitle>
            <DialogDescription>Registra a saída de EPIs do estoque central para uma obra.</DialogDescription>
          </DialogHeader>
          <DialogContent className="grid gap-4">
            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <div className="grid gap-1.5">
              <Label>Obra *</Label>
              <select name="obraId" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Selecione a obra...</option>
                {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label>EPI *</Label>
              <select name="epiId" required value={epiSelecionadoId}
                onChange={e => { setEpiSelecionadoId(e.target.value); setQtdInput('') }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Selecione o EPI...</option>
                {epis.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.tipo}{e.ca ? ` (CA ${e.ca})` : ''} — Estoque: {e.quantidadeEstoque}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <Label>Encarregado *</Label>
              <select name="encarregadoId" required
                defaultValue={usuarioAtualFuncao === 'encarregado' ? usuarioAtualId : ''}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="">Selecione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Quantidade *</Label>
                <Input name="quantidade" type="number" min="1"
                  max={estoqueEpiSelecionado ?? undefined}
                  required value={qtdInput}
                  onChange={e => setQtdInput(e.target.value)} />
                {aposDistribuicao !== null && (
                  <p className={`text-xs ${aposDistribuicao < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Após distribuição: <strong>{aposDistribuicao} un.</strong>
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label>Data *</Label>
                <Input name="data" type="date" required defaultValue={hoje} />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>Observações</Label>
              <Textarea name="observacoes" rows={2} />
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>Assinatura do encarregado</Label>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => sigRef.current?.clear()}>
                  <Eraser className="h-3 w-3 mr-1" />Limpar
                </Button>
              </div>
              <div className="rounded-md border border-input overflow-hidden bg-white">
                <SignatureCanvas
                  ref={sigRef}
                  penColor="black"
                  canvasProps={{ width: 460, height: 120, className: 'w-full' }}
                />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" disabled={pending || (aposDistribuicao !== null && aposDistribuicao < 0)}>
              Confirmar Distribuição
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  )
}
