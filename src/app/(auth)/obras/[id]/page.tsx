import { db } from '@/app/db'
import { obras, clientes, usuarios, servicos, rdo, documentos, obrasEnderecos, hhContratos, hhRegistros } from '@/app/db/schema'
import { eq, sql } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, MapPin, Calendar } from 'lucide-react'
import { type BadgeVariant } from '@/components/ui/badge'
import { Tabs as TabsComponent, TabsContent as TabsContentComponent, TabsList as TabsListComponent, TabsTrigger as TabsTriggerComponent } from '@/components/ui/tabs'

const statusConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  planejada: { label: 'Planejada', variant: 'secondary' },
  em_andamento: { label: 'Em Andamento', variant: 'info' },
  pausada: { label: 'Pausada', variant: 'warning' },
  concluida: { label: 'Concluída', variant: 'success' },
}

const statusServicoConfig: Record<string, { label: string; variant: BadgeVariant }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  em_andamento: { label: 'Em Andamento', variant: 'info' },
  concluido: { label: 'Concluído', variant: 'success' },
}

export default async function ObraDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [obra] = await db
    .select({
      id: obras.id,
      nome: obras.nome,
      descricao: obras.descricao,
      status: obras.status,
      dataInicio: obras.dataInicio,
      dataFim: obras.dataFim,
      clienteNome: clientes.nome,
    })
    .from(obras)
    .leftJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(eq(obras.id, id))
    .limit(1)

  if (!obra) notFound()

  const [servicosList, rdoList, enderecoList, hhContrato, hhConsumo] = await Promise.all([
    db.select().from(servicos).where(eq(servicos.obraId, id)),
    db.select().from(rdo).where(eq(rdo.obraId, id)).orderBy(rdo.data),
    db.select().from(obrasEnderecos).where(eq(obrasEnderecos.obraId, id)).limit(1),
    db.select().from(hhContratos).where(eq(hhContratos.obraId, id)).limit(1),
    db.select({ total: sql<number>`coalesce(sum(horas_normais + horas_extras), 0)` }).from(hhRegistros).where(eq(hhRegistros.obraId, id)),
  ])

  const cfg = statusConfig[obra.status] ?? { label: obra.status, variant: 'secondary' }
  const endereco = enderecoList[0]
  const totalHH = Number(hhContrato[0]?.totalHH ?? 0)
  const consumidoHH = Number(hhConsumo[0]?.total ?? 0)
  const hhPct = totalHH > 0 ? Math.round((consumidoHH / totalHH) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/obras"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{obra.nome}</h2>
              <Badge variant={cfg.variant}>{cfg.label}</Badge>
            </div>
            <p className="text-muted-foreground">{obra.clienteNome}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/rdo/novo?obraId=${id}`}>Novo RDO</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/obras/${id}/editar`}>Editar</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {endereco && (
          <Card>
            <CardContent className="flex items-start gap-3 pt-6">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm font-medium">{endereco.logradouro}{endereco.numero ? `, ${endereco.numero}` : ''}</p>
                <p className="text-xs text-muted-foreground">{endereco.cidade} - {endereco.estado}</p>
              </div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Período</p>
              <p className="text-sm font-medium">{obra.dataInicio ?? '—'} até {obra.dataFim ?? '—'}</p>
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
            <p className="text-lg font-bold">{servicosList.filter(s => s.status === 'concluido').length} / {servicosList.length}</p>
            <p className="text-xs text-muted-foreground mt-1">concluídos</p>
          </CardContent>
        </Card>
      </div>

      <TabsComponent defaultValue="servicos">
        <TabsListComponent>
          <TabsTriggerComponent value="servicos">Serviços ({servicosList.length})</TabsTriggerComponent>
          <TabsTriggerComponent value="rdo">RDOs ({rdoList.length})</TabsTriggerComponent>
        </TabsListComponent>

        <TabsContentComponent value="servicos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Serviços da Obra</CardTitle>
              <Button size="sm" asChild>
                <Link href={`/obras/${id}/servicos/novo`}>Adicionar Serviço</Link>
              </Button>
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
                            <Badge variant={sc.variant}>{sc.label}</Badge>
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
                  {rdoList.map((r) => (
                    <li key={r.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium">{r.data}</p>
                        <p className="text-sm text-muted-foreground capitalize">{r.clima}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={r.status === 'aprovado' ? 'success' : r.status === 'rejeitado' ? 'destructive' : 'secondary'}>
                          {r.status}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/rdo/${r.id}`}>Ver</Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContentComponent>
      </TabsComponent>
    </div>
  )
}
