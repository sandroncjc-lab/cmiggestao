import { db } from '@/app/db'
import { obras, clientes, usuarios, servicos, rdo, obrasEnderecos, hhContratos, hhRegistros } from '@/app/db/schema'
import { and, eq, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, MapPin, User, Calendar, UserCheck } from 'lucide-react'
import { Tabs as TabsComponent, TabsContent as TabsContentComponent, TabsList as TabsListComponent, TabsTrigger as TabsTriggerComponent } from '@/components/ui/tabs'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'

const statusConfig: Record<string, { label: string; variant: string }> = {
  planejada: { label: 'Planejada', variant: 'secondary' },
  em_andamento: { label: 'Em Andamento', variant: 'info' },
  pausada: { label: 'Pausada', variant: 'warning' },
  concluida: { label: 'Concluída', variant: 'success' },
}

const statusServicoConfig: Record<string, { label: string; variant: string }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  em_andamento: { label: 'Em Andamento', variant: 'info' },
  concluido: { label: 'Concluído', variant: 'success' },
}

const statusRdoConfig: Record<string, { label: string; variant: string }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente_aprovacao: { label: 'Pendente', variant: 'warning' },
  aprovado: { label: 'Aprovado', variant: 'success' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
}

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuario = await getUsuarioAtual()
  if (!usuario) notFound()
  const clienteVendo = isCliente(usuario.funcao)

  // Filtro multi-tenant: cliente vê via clienteId, interno via empresaId
  const whereClause = clienteVendo && usuario.clienteId
    ? and(eq(obras.id, id), eq(obras.clienteId, usuario.clienteId))
    : and(eq(obras.id, id), eq(obras.empresaId, usuario.empresaId))

  const [obraRow] = await db
    .select({
      id: obras.id,
      nome: obras.nome,
      descricao: obras.descricao,
      status: obras.status,
      dataInicio: obras.dataInicio,
      dataFim: obras.dataFim,
      clienteNome: clientes.nome,
      clienteId: obras.clienteId,
      aprovadorClienteId: obras.aprovadorClienteId,
      responsavelInternoId: obras.responsavelInternoId,
    })
    .from(obras)
    .leftJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(whereClause)
    .limit(1)

  if (!obraRow) notFound()

  const [servicosList, rdoList, enderecoList, hhContrato, hhConsumo] = await Promise.all([
    db.select().from(servicos).where(eq(servicos.obraId, id)),
    db.select().from(rdo).where(eq(rdo.obraId, id)).orderBy(rdo.data),
    db.select().from(obrasEnderecos).where(eq(obrasEnderecos.obraId, id)).limit(1),
    db.select().from(hhContratos).where(eq(hhContratos.obraId, id)).limit(1),
    db.select({ total: sql<number>`coalesce(sum(horas_normais + horas_extras), 0)` }).from(hhRegistros).where(eq(hhRegistros.obraId, id)),
  ])

  // nomes dos responsáveis
  const [aprovadorData, responsavelData] = await Promise.all([
    obraRow.aprovadorClienteId
      ? db.select({ nome: usuarios.nome, email: usuarios.email }).from(usuarios).where(eq(usuarios.id, obraRow.aprovadorClienteId)).limit(1)
      : Promise.resolve([]),
    obraRow.responsavelInternoId
      ? db.select({ nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, obraRow.responsavelInternoId)).limit(1)
      : Promise.resolve([]),
  ])

  const cfg = statusConfig[obraRow.status] ?? { label: obraRow.status, variant: 'secondary' }
  const endereco = enderecoList[0]
  const totalHH = Number(hhContrato[0]?.totalHH ?? 0)
  const consumidoHH = Number(hhConsumo[0]?.total ?? 0)
  const hhPct = totalHH > 0 ? Math.round((consumidoHH / totalHH) * 100) : 0
  const pendentesAprovacao = rdoList.filter((r) => r.status === 'pendente_aprovacao').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/obras"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{obraRow.nome}</h2>
              <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
            </div>
            <p className="text-muted-foreground">{obraRow.clienteNome}</p>
          </div>
        </div>
        {!clienteVendo && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/rdo/novo?obraId=${id}`}>Novo RDO</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/obras/${id}/editar`}>Editar</Link>
            </Button>
          </div>
        )}
      </div>

      {pendentesAprovacao > 0 && clienteVendo && (
        <div className="rounded-md border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
          Você tem <strong>{pendentesAprovacao} RDO{pendentesAprovacao > 1 ? 's' : ''}</strong> aguardando sua aprovação nesta obra.
          <Link href="/rdo" className="ml-2 underline font-medium">Ver RDOs</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {endereco && (
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm font-medium">{endereco.logradouro}{endereco.numero ? `, ${endereco.numero}` : ''}</p>
                <p className="text-xs text-muted-foreground">{endereco.cidade} — {endereco.estado}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Período</p>
              <p className="text-sm font-medium">{obraRow.dataInicio ?? '—'} até {obraRow.dataFim ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">HH Consumido</p>
            <p className="text-lg font-bold">{consumidoHH}h / {totalHH}h</p>
            <Progress value={hhPct} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{hhPct}% utilizado</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Serviços</p>
            <p className="text-lg font-bold">{servicosList.filter((s) => s.status === 'concluido').length} / {servicosList.length}</p>
            <p className="text-xs text-muted-foreground mt-1">concluídos</p>
          </CardContent>
        </Card>
      </div>

      {/* Responsáveis */}
      <div className="grid gap-4 sm:grid-cols-2">
        {aprovadorData[0] && (
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <UserCheck className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Aprovador do Cliente</p>
                <p className="text-sm font-medium">{aprovadorData[0].nome}</p>
                <p className="text-xs text-muted-foreground">{aprovadorData[0].email}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {responsavelData[0] && (
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Responsável Interno</p>
                <p className="text-sm font-medium">{responsavelData[0].nome}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <TabsComponent defaultValue="servicos">
        <TabsListComponent>
          <TabsTriggerComponent value="servicos">Serviços ({servicosList.length})</TabsTriggerComponent>
          <TabsTriggerComponent value="rdo">
            RDOs ({rdoList.length})
            {pendentesAprovacao > 0 && <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-yellow-500 text-[10px] font-bold text-white">{pendentesAprovacao}</span>}
          </TabsTriggerComponent>
        </TabsListComponent>

        <TabsContentComponent value="servicos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Serviços da Obra</CardTitle>
              {!clienteVendo && (
                <Button size="sm" asChild>
                  <Link href={`/obras/${id}/servicos/novo`}>Adicionar Serviço</Link>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {servicosList.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">Nenhum serviço cadastrado</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Serviço</th>
                      <th className="text-left p-4 text-xs font-medium text-muted-foreground uppercase">Unidade</th>
                      <th className="text-right p-4 text-xs font-medium text-muted-foreground uppercase">Preço Unit.</th>
                      <th className="text-center p-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicosList.map((s) => {
                      const sc = statusServicoConfig[s.status] ?? { label: s.status, variant: 'secondary' }
                      return (
                        <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-4 font-medium">{s.nome}</td>
                          <td className="p-4 text-muted-foreground">{s.unidade}</td>
                          <td className="p-4 text-right">R$ {Number(s.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                          <td className="p-4 text-center">
                            <Badge variant={sc.variant as any}>{sc.label}</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContentComponent>

        <TabsContentComponent value="rdo">
          <Card>
            <CardContent className="p-0">
              {rdoList.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">Nenhum RDO registrado</p>
              ) : (
                <ul className="divide-y divide-border">
                  {rdoList.map((r) => {
                    const rc = statusRdoConfig[r.status] ?? { label: r.status, variant: 'secondary' }
                    return (
                      <li key={r.id} className={`flex items-center justify-between p-4 ${r.status === 'pendente_aprovacao' && clienteVendo ? 'bg-yellow-50/50 dark:bg-yellow-950/20' : ''}`}>
                        <div>
                          <p className="font-medium">{r.data}</p>
                          <p className="text-sm text-muted-foreground capitalize">{r.clima}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={rc.variant as any}>{rc.label}</Badge>
                          <Button
                            variant={r.status === 'pendente_aprovacao' && clienteVendo ? 'default' : 'ghost'}
                            size="sm"
                            asChild
                          >
                            <Link href={`/rdo/${r.id}`}>
                              {r.status === 'pendente_aprovacao' && clienteVendo ? 'Aprovar' : 'Ver'}
                            </Link>
                          </Button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContentComponent>
      </TabsComponent>
    </div>
  )
}
