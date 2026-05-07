'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeVariant } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, PackageOpen, Trash2, AlertTriangle, Ban } from 'lucide-react'
import { criarEpi, atualizarEpi, desativarEpi, registrarMovimentacao } from '@/lib/actions/epis'

interface EpiRow {
  id: string
  tipo: string
  ca: string | null
  descricao: string | null
  periodicidadeTrocaDias: number | null
  quantidadeEstoque: number
  estoqueMinimo: number
  totalDistribuido: number
  ativo: boolean
}

interface Props {
  epis: EpiRow[]
}

type DialogMode = 'novo' | 'editar' | 'movimentar' | null

export function CatalogoTab({ epis }: Props) {
  const [dialog, setDialog] = useState<{ mode: DialogMode; epi?: EpiRow }>({ mode: null })
  const [pending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)

  function fechar() { setDialog({ mode: null }); setErro(null) }

  function estoqueVariant(epi: EpiRow): { variant: BadgeVariant; icon: React.ReactNode } {
    if (epi.quantidadeEstoque === 0) return { variant: 'destructive', icon: <Ban className="h-3 w-3" /> }
    if (epi.quantidadeEstoque < epi.estoqueMinimo) return { variant: 'warning', icon: <AlertTriangle className="h-3 w-3" /> }
    return { variant: 'success', icon: null }
  }

  async function handleNovoEpi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await criarEpi({
          tipo: fd.get('tipo') as string,
          ca: fd.get('ca') as string || null,
          descricao: fd.get('descricao') as string || null,
          periodicidadeTrocaDias: fd.get('periodicidade') ? Number(fd.get('periodicidade')) : null,
          estoqueMinimo: fd.get('estoqueMinimo') ? Number(fd.get('estoqueMinimo')) : 0,
        })
        fechar()
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  async function handleEditarEpi(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dialog.epi) return
    setErro(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await atualizarEpi(dialog.epi!.id, {
          tipo: fd.get('tipo') as string,
          ca: fd.get('ca') as string || null,
          descricao: fd.get('descricao') as string || null,
          periodicidadeTrocaDias: fd.get('periodicidade') ? Number(fd.get('periodicidade')) : null,
          estoqueMinimo: fd.get('estoqueMinimo') ? Number(fd.get('estoqueMinimo')) : 0,
        })
        fechar()
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao salvar')
      }
    })
  }

  async function handleMovimentar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!dialog.epi) return
    setErro(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await registrarMovimentacao({
          epiId: dialog.epi!.id,
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

  async function handleDesativar(id: string) {
    if (!confirm('Desativar este EPI do catálogo?')) return
    startTransition(async () => { await desativarEpi(id) })
  }

  const hoje = new Date().toISOString().split('T')[0]

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setDialog({ mode: 'novo' })}>
          <Plus className="h-4 w-4 mr-2" />Novo EPI
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>CA</TableHead>
                <TableHead>Estoque Central</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Distribuído</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {epis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhum EPI no catálogo
                  </TableCell>
                </TableRow>
              )}
              {epis.map((epi) => {
                const { variant, icon } = estoqueVariant(epi)
                return (
                  <TableRow key={epi.id} className={!epi.ativo ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      {epi.tipo}
                      {epi.descricao && <p className="text-xs text-muted-foreground">{epi.descricao}</p>}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{epi.ca ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={variant} className="gap-1">
                        {icon}{epi.quantidadeEstoque} un.
                      </Badge>
                    </TableCell>
                    <TableCell>{epi.estoqueMinimo} un.</TableCell>
                    <TableCell>{epi.totalDistribuido} un.</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Editar"
                          onClick={() => setDialog({ mode: 'editar', epi })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Movimentar estoque"
                          onClick={() => setDialog({ mode: 'movimentar', epi })}>
                          <PackageOpen className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Desativar"
                          onClick={() => handleDesativar(epi.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog: Novo EPI */}
      <Dialog open={dialog.mode === 'novo'} onClose={fechar}>
        <form onSubmit={handleNovoEpi}>
          <DialogHeader><DialogTitle>Novo EPI</DialogTitle></DialogHeader>
          <DialogContent className="grid gap-4">
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <div className="grid gap-1.5">
              <Label htmlFor="tipo">Tipo *</Label>
              <Input id="tipo" name="tipo" required placeholder="ex: Capacete de segurança" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ca">Número CA</Label>
              <Input id="ca" name="ca" placeholder="ex: 12345" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea id="descricao" name="descricao" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="periodicidade">Periodicidade de troca (dias)</Label>
                <Input id="periodicidade" name="periodicidade" type="number" min="1" placeholder="ex: 365" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="estoqueMinimo">Estoque mínimo</Label>
                <Input id="estoqueMinimo" name="estoqueMinimo" type="number" min="0" defaultValue="0" />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" disabled={pending}>Salvar</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Dialog: Editar EPI */}
      <Dialog open={dialog.mode === 'editar'} onClose={fechar}>
        <form key={dialog.epi?.id} onSubmit={handleEditarEpi}>
          <DialogHeader><DialogTitle>Editar EPI</DialogTitle></DialogHeader>
          <DialogContent className="grid gap-4">
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <div className="grid gap-1.5">
              <Label>Tipo *</Label>
              <Input name="tipo" required defaultValue={dialog.epi?.tipo} />
            </div>
            <div className="grid gap-1.5">
              <Label>Número CA</Label>
              <Input name="ca" defaultValue={dialog.epi?.ca ?? ''} />
            </div>
            <div className="grid gap-1.5">
              <Label>Descrição</Label>
              <Textarea name="descricao" rows={2} defaultValue={dialog.epi?.descricao ?? ''} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label>Periodicidade (dias)</Label>
                <Input name="periodicidade" type="number" min="1"
                  defaultValue={dialog.epi?.periodicidadeTrocaDias ?? ''} />
              </div>
              <div className="grid gap-1.5">
                <Label>Estoque mínimo</Label>
                <Input name="estoqueMinimo" type="number" min="0"
                  defaultValue={dialog.epi?.estoqueMinimo ?? 0} />
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
            <Button type="submit" disabled={pending}>Salvar</Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Dialog: Movimentar estoque */}
      <Dialog open={dialog.mode === 'movimentar'} onClose={fechar}>
        <form key={`mov-${dialog.epi?.id}`} onSubmit={handleMovimentar}>
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
            {dialog.epi && (
              <p className="text-sm text-muted-foreground pt-1">
                {dialog.epi.tipo} — Estoque atual: <strong>{dialog.epi.quantidadeEstoque} un.</strong>
              </p>
            )}
          </DialogHeader>
          <DialogContent className="grid gap-4">
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <div className="grid gap-1.5">
              <Label>Tipo *</Label>
              <select name="tipo" required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="ENTRADA">ENTRADA — acréscimo ao estoque</option>
                <option value="DESCARTE">DESCARTE — baixa do estoque</option>
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
              <Label>Nota Fiscal (opcional)</Label>
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
