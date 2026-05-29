import { db } from '@/app/db'
import { equipamentos, equipamentoMovimentacoes, obras, usuarios } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { moverEquipamento, atualizarEquipamento } from '@/lib/actions/equipamentos'
import { redirect } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

const statusConfig: Record<string, { label: string; variant: string }> = {
  disponivel: { label: 'Disponível', variant: 'success' },
  em_uso:     { label: 'Em Uso',     variant: 'info' },
  manutencao: { label: 'Manutenção', variant: 'warning' },
}

export default async function EquipamentoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const empresaId = await getEmpresaIdOuErro()

  const [equip] = await db
    .select({
      id: equipamentos.id,
      nome: equipamentos.nome,
      tipo: equipamentos.tipo,
      numeroSerie: equipamentos.numeroSerie,
      status: equipamentos.status,
      obraId: equipamentos.obraId,
      obraNome: obras.nome,
    })
    .from(equipamentos)
    .leftJoin(obras, eq(equipamentos.obraId, obras.id))
    .where(and(eq(equipamentos.id, id), eq(equipamentos.empresaId, empresaId)))
    .limit(1)

  if (!equip) notFound()

  const movimentacoes = await db
    .select({
      id: equipamentoMovimentacoes.id,
      tipo: equipamentoMovimentacoes.tipo,
      data: equipamentoMovimentacoes.data,
      observacoes: equipamentoMovimentacoes.observacoes,
      obraNome: obras.nome,
      responsavelNome: usuarios.nome,
    })
    .from(equipamentoMovimentacoes)
    .leftJoin(obras, eq(equipamentoMovimentacoes.obraId, obras.id))
    .leftJoin(usuarios, eq(equipamentoMovimentacoes.responsavelId, usuarios.id))
    .where(eq(equipamentoMovimentacoes.equipamentoId, id))
    .orderBy(equipamentoMovimentacoes.data)

  const obrasList = await db
    .select({ id: obras.id, nome: obras.nome })
    .from(obras)
    .where(eq(obras.empresaId, empresaId))
    .orderBy(obras.nome)

  const responsaveisList = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.empresaId, empresaId))
    .orderBy(usuarios.nome)

  async function actionMover(formData: FormData) {
    'use server'
    await moverEquipamento(formData)
    redirect(`/equipamentos/${id}`)
  }

  async function actionEditar(formData: FormData) {
    'use server'
    await atualizarEquipamento(id, formData)
    redirect(`/equipamentos/${id}`)
  }

  const cfg = statusConfig[equip.status] ?? { label: equip.status, variant: 'secondary' }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/equipamentos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{equip.nome}</h2>
          <p className="text-muted-foreground">{equip.tipo ?? 'Sem tipo'}</p>
        </div>
        <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Número de Série</p>
            <p className="font-medium">{equip.numeroSerie ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Obra Atual</p>
            <p className="font-medium">{equip.obraNome ?? '—'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="font-medium">{cfg.label}</p>
          </CardContent>
        </Card>
      </div>

      {/* Movimentar */}
      <Card>
        <CardHeader><CardTitle>Movimentar Equipamento</CardTitle></CardHeader>
        <CardContent>
          <form action={actionMover} className="space-y-4">
            <input type="hidden" name="equipamentoId" value={id} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select name="tipo" required>
                  <option value="saida">Saída (alocar em obra)</option>
                  <option value="entrada">Entrada (devolver)</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input name="data" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Obra destino</Label>
              <Select name="obraId">
                <option value="">Nenhuma</option>
                {obrasList.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select name="responsavelId">
                <option value="">Nenhum</option>
                {responsaveisList.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input name="observacoes" placeholder="Opcional" />
            </div>
            <Button type="submit">Registrar Movimentação</Button>
          </form>
        </CardContent>
      </Card>

      {/* Editar dados */}
      <Card>
        <CardHeader><CardTitle>Editar Dados</CardTitle></CardHeader>
        <CardContent>
          <form action={actionEditar} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input name="nome" required defaultValue={equip.nome} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Input name="tipo" defaultValue={equip.tipo ?? ''} />
              </div>
              <div className="space-y-2">
                <Label>Número de Série</Label>
                <Input name="numeroSerie" defaultValue={equip.numeroSerie ?? ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={equip.status}>
                <option value="disponivel">Disponível</option>
                <option value="em_uso">Em Uso</option>
                <option value="manutencao">Manutenção</option>
              </Select>
            </div>
            <Button type="submit" variant="outline">Salvar Alterações</Button>
          </form>
        </CardContent>
      </Card>

      {/* Histórico */}
      {movimentacoes.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Histórico de Movimentações</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {movimentacoes.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{m.tipo === 'saida' ? '↗ Saída' : '↙ Entrada'} — {m.data}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.obraNome ?? 'Sem obra'}{m.responsavelNome ? ` · ${m.responsavelNome}` : ''}
                    </p>
                    {m.observacoes && <p className="text-xs text-muted-foreground">{m.observacoes}</p>}
                  </div>
                  <Badge variant={m.tipo === 'saida' ? 'info' : 'success'}>
                    {m.tipo === 'saida' ? 'Saída' : 'Entrada'}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
