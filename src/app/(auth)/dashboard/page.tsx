import { db } from '@/app/db'
import {
  obras, contratos, rdo, epis, equipamentos,
  hhContratos, hhRegistros, rdoFuncionarios, servicos, clientes, obraResponsaveis,
} from '@/app/db/schema'
import { eq, and, sql, inArray, ne } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { HardHat, FileText, ClipboardList, ShieldCheck, Timer, Wrench, CheckCircle2, Clock } from 'lucide-react'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import Link from 'next/link'
import { notFound } from 'next/navigation'

// ─── Dashboard interno ────────────────────────────────────────────────────────

async function getStatsInterno(empresaId: string, obraIds: string[] | null = null) {
  // Se obraIds fornecido (encarregado), filtra apenas essas obras
  const obraWhereBase = obraIds !== null && obraIds.length > 0
    ? and(eq(obras.empresaId, empresaId), inArray(obras.id, obraIds))
    : obraIds !== null && obraIds.length === 0
      ? and(eq(obras.empresaId, empresaId), eq(obras.id, ''))  // sem obras → retorna zero
      : eq(obras.empresaId, empresaId)

  const rdoWhereBase = obraIds !== null && obraIds.length > 0
    ? and(eq(obras.empresaId, empresaId), inArray(rdo.obraId, obraIds))
    : obraIds !== null && obraIds.length === 0
      ? and(eq(obras.empresaId, empresaId), eq(rdo.obraId, ''))
      : eq(obras.empresaId, empresaId)

  const [
    obrasAtivas,
    contratosAtivos,
    rdosPendentes,
    episVencidos,
    equipamentosEmUso,
    totalHHContratado,
    totalHHConsumido,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` })
      .from(obras)
      .where(and(eq(obras.status, 'em_andamento'), obraWhereBase)),
    db.select({ count: sql<number>`count(*)` })
      .from(contratos)
      .innerJoin(clientes, and(eq(contratos.clienteId, clientes.id), eq(clientes.empresaId, empresaId)))
      .where(
        obraIds !== null && obraIds.length > 0
          ? and(eq(contratos.status, 'ativo'), inArray(contratos.obraId, obraIds))
          : obraIds !== null && obraIds.length === 0
            ? sql`false`
            : eq(contratos.status, 'ativo')
      ),
    db.select({ count: sql<number>`count(*)` })
      .from(rdo)
      .innerJoin(obras, and(eq(rdo.obraId, obras.id), rdoWhereBase))
      .where(eq(rdo.status, 'pendente_aprovacao')),
    db.select({ count: sql<number>`count(*)` })
      .from(epis)
      .where(and(eq(epis.status, 'vencido'), eq(epis.empresaId, empresaId))),
    db.select({ count: sql<number>`count(*)` })
      .from(equipamentos)
      .where(and(eq(equipamentos.status, 'em_uso'), eq(equipamentos.empresaId, empresaId))),
    db.select({ total: sql<number>`coalesce(sum(${hhContratos.totalHH}), 0)` })
      .from(hhContratos)
      .innerJoin(obras, and(eq(hhContratos.obraId, obras.id), obraWhereBase)),
    db.select({ total: sql<number>`coalesce(sum(${rdoFuncionarios.horasTrabalhadas}), 0)` })
      .from(rdoFuncionarios)
      .innerJoin(rdo, eq(rdo.id, rdoFuncionarios.rdoId))
      .innerJoin(obras, and(eq(rdo.obraId, obras.id), obraWhereBase))
      .where(ne(rdo.status, 'rejeitado')),
  ])

  const hhContratado = Number(totalHHContratado[0]?.total ?? 0)
  const hhConsumido = Number(totalHHConsumido[0]?.total ?? 0)
  const hhPct = hhContratado > 0 ? Math.round((hhConsumido / hhContratado) * 100) : 0

  return {
    obrasAtivas: Number(obrasAtivas[0]?.count ?? 0),
    contratosAtivos: Number(contratosAtivos[0]?.count ?? 0),
    rdosPendentes: Number(rdosPendentes[0]?.count ?? 0),
    episVencidos: Number(episVencidos[0]?.count ?? 0),
    equipamentosEmUso: Number(equipamentosEmUso[0]?.count ?? 0),
    hhContratado,
    hhConsumido,
    hhPct,
  }
}

// ─── Dashboard do cliente (aprovador) ────────────────────────────────────────

async function getDashboardCliente(clienteId: string) {
  // Obras do cliente
  const obrasDoCliente = await db
    .select({ id: obras.id, nome: obras.nome, status: obras.status })
    .from(obras)
    .where(eq(obras.clienteId, clienteId))
    .orderBy(obras.nome)

  if (obrasDoCliente.length === 0) {
    return { obrasDoCliente: [], rdosPendentes: [], resumoObras: [] }
  }

  const obraIds = obrasDoCliente.map((o) => o.id)

  // RDOs pendentes de aprovação
  const rdosPendentes = await db
    .select({
      id: rdo.id,
      data: rdo.data,
      clima: rdo.clima,
      obraId: rdo.obraId,
      obraNome: obras.nome,
    })
    .from(rdo)
    .innerJoin(obras, eq(rdo.obraId, obras.id))
    .where(and(inArray(rdo.obraId, obraIds), eq(rdo.status, 'pendente_aprovacao')))
    .orderBy(rdo.data)

  // Progresso de serviços e HH por obra
  const [servicosPorObra, hhContratosPorObra, hhConsumidoPorObra, rdoStats] = await Promise.all([
    db
      .select({
        obraId: servicos.obraId,
        total: sql<number>`count(*)`,
        concluidos: sql<number>`count(*) filter (where ${servicos.status} = 'concluido')`,
      })
      .from(servicos)
      .where(inArray(servicos.obraId, obraIds))
      .groupBy(servicos.obraId),
    db
      .select({ obraId: hhContratos.obraId, totalHH: hhContratos.totalHH })
      .from(hhContratos)
      .where(inArray(hhContratos.obraId, obraIds)),
    db
      .select({
        obraId: rdo.obraId,
        consumido: sql<number>`coalesce(sum(${rdoFuncionarios.horasTrabalhadas}), 0)`,
      })
      .from(rdoFuncionarios)
      .innerJoin(rdo, eq(rdo.id, rdoFuncionarios.rdoId))
      .where(and(inArray(rdo.obraId, obraIds), ne(rdo.status, 'rejeitado')))
      .groupBy(rdo.obraId),
    db
      .select({
        obraId: rdo.obraId,
        total: sql<number>`count(*)`,
        aprovados: sql<number>`count(*) filter (where ${rdo.status} = 'aprovado')`,
        pendentes: sql<number>`count(*) filter (where ${rdo.status} = 'pendente_aprovacao')`,
      })
      .from(rdo)
      .where(inArray(rdo.obraId, obraIds))
      .groupBy(rdo.obraId),
  ])

  const resumoObras = obrasDoCliente.map((obra) => {
    const serv = servicosPorObra.find((s) => s.obraId === obra.id)
    const hhContrato = hhContratosPorObra.find((h) => h.obraId === obra.id)
    const hhConsumido = hhConsumidoPorObra.find((h) => h.obraId === obra.id)
    const rdoStat = rdoStats.find((r) => r.obraId === obra.id)

    const totalServicos = Number(serv?.total ?? 0)
    const concluidosServicos = Number(serv?.concluidos ?? 0)
    const pctServicos = totalServicos > 0 ? Math.round((concluidosServicos / totalServicos) * 100) : 0

    const hhContratadoN = Number(hhContrato?.totalHH ?? 0)
    const hhConsumidoN = Number(hhConsumido?.consumido ?? 0)
    const hhRestante = Math.max(0, hhContratadoN - hhConsumidoN)
    const pctHH = hhContratadoN > 0 ? Math.round((hhConsumidoN / hhContratadoN) * 100) : 0

    return {
      ...obra,
      totalServicos,
      concluidosServicos,
      pctServicos,
      hhContratado: hhContratadoN,
      hhConsumido: hhConsumidoN,
      hhRestante,
      pctHH,
      totalRdos: Number(rdoStat?.total ?? 0),
      rdosAprovados: Number(rdoStat?.aprovados ?? 0),
      rdosPendentes: Number(rdoStat?.pendentes ?? 0),
    }
  })

  return { obrasDoCliente, rdosPendentes, resumoObras }
}

// ─── Componentes ──────────────────────────────────────────────────────────────

const statusObraConfig: Record<string, { label: string; variant: string }> = {
  planejada: { label: 'Planejada', variant: 'secondary' },
  em_andamento: { label: 'Em Andamento', variant: 'info' },
  pausada: { label: 'Pausada', variant: 'warning' },
  concluida: { label: 'Concluída', variant: 'success' },
}

const climaLabel: Record<string, string> = {
  ensolarado: '☀️ Ensolarado',
  nublado: '⛅ Nublado',
  chuvoso: '🌧️ Chuvoso',
  tempestade: '⛈️ Tempestade',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const usuario = await getUsuarioAtual()
  if (!usuario) notFound()

  // ── Dashboard do aprovador do cliente ──────────────────────────────────────
  if (isCliente(usuario.funcao)) {
    if (!usuario.clienteId) {
      return (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Sua conta não está vinculada a nenhum cliente. Contate o administrador.</p>
          <p className="text-sm text-muted-foreground">Se precisar sair, use o menu de usuário no canto superior direito.</p>
        </div>
      )
    }

    const { rdosPendentes, resumoObras } = await getDashboardCliente(usuario.clienteId)

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Acompanhamento das obras e RDOs</p>
        </div>

        {/* Cards resumo */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Obras</CardTitle>
              <HardHat className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{resumoObras.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">vinculadas ao seu acesso</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">RDOs Pendentes</CardTitle>
              <ClipboardList className={`h-5 w-5 ${rdosPendentes.length > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${rdosPendentes.length > 0 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                {rdosPendentes.length}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">aguardando sua assinatura</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Serviços Concluídos</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {resumoObras.reduce((s, o) => s + o.concluidosServicos, 0)}
                <span className="text-lg text-muted-foreground font-normal">
                  /{resumoObras.reduce((s, o) => s + o.totalServicos, 0)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">em todas as obras</p>
            </CardContent>
          </Card>
        </div>

        {/* RDOs pendentes de aprovação */}
        {rdosPendentes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              RDOs aguardando sua aprovação
            </h3>
            <div className="rounded-md border divide-y divide-border">
              {rdosPendentes.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-4 py-3 bg-yellow-50/50 dark:bg-yellow-950/20">
                  <div>
                    <p className="font-medium">{r.obraNome}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.data} · {climaLabel[r.clima] ?? r.clima}
                    </p>
                  </div>
                  <Button size="sm" asChild>
                    <Link href={`/rdo/${r.id}`}>Aprovar / Ver</Link>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumo por obra */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Progresso por obra</h3>
          {resumoObras.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma obra vinculada.</p>
          )}
          {resumoObras.map((obra) => {
            const sc = statusObraConfig[obra.status] ?? { label: obra.status, variant: 'secondary' }
            return (
              <Card key={obra.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{obra.nome}</CardTitle>
                    <Badge variant={sc.variant as any}>{sc.label}</Badge>
                    {obra.rdosPendentes > 0 && (
                      <Badge variant="warning" className="text-xs">
                        {obra.rdosPendentes} RDO{obra.rdosPendentes > 1 ? 's' : ''} pendente{obra.rdosPendentes > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/obras/${obra.id}`}>Ver obra →</Link>
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {/* Serviços */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Serviços executados</span>
                      <span className="font-medium">{obra.concluidosServicos}/{obra.totalServicos} ({obra.pctServicos}%)</span>
                    </div>
                    <Progress value={obra.pctServicos} className="h-2" />
                  </div>
                  {/* HH */}
                  {obra.hhContratado > 0 ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">HH consumido</span>
                        <span className={`font-medium ${obra.pctHH >= 100 ? 'text-red-600' : obra.pctHH >= 80 ? 'text-yellow-600' : ''}`}>
                          {obra.hhConsumido}h / {obra.hhContratado}h ({obra.pctHH}%)
                        </span>
                      </div>
                      <Progress
                        value={Math.min(obra.pctHH, 100)}
                        className={`h-2 ${obra.pctHH >= 100 ? '[&>div]:bg-red-500' : obra.pctHH >= 80 ? '[&>div]:bg-yellow-500' : ''}`}
                      />
                      <p className="text-xs text-muted-foreground">
                        {obra.hhRestante}h restantes
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">HH não configurado</p>
                    </div>
                  )}
                  {/* RDOs */}
                  <div className="text-sm text-muted-foreground col-span-full">
                    <span className="font-medium text-foreground">{obra.totalRdos}</span> RDOs registrados ·{' '}
                    <span className="font-medium text-green-600">{obra.rdosAprovados}</span> aprovados
                    {obra.rdosPendentes > 0 && (
                      <>
                        {' '}·{' '}
                        <Link href="/rdo" className="font-medium text-yellow-600 hover:underline">
                          {obra.rdosPendentes} pendente{obra.rdosPendentes > 1 ? 's' : ''}
                        </Link>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Link para lista de RDOs */}
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href="/rdo">Ver todos os RDOs</Link>
          </Button>
        </div>
      </div>
    )
  }

  // ── Dashboard interno (admin / engenheiro / encarregado) ───────────────────
  // Encarregado: restringe às obras atribuídas a ele
  let obraIdsEncarregado: string[] | null = null
  if (usuario.funcao === 'encarregado') {
    const atrib = await db
      .select({ obraId: obraResponsaveis.obraId })
      .from(obraResponsaveis)
      .where(and(eq(obraResponsaveis.usuarioId, usuario.id), eq(obraResponsaveis.papel, 'encarregado')))
    obraIdsEncarregado = atrib.map((a) => a.obraId)
  }
  const stats = await getStatsInterno(usuario.empresaId, obraIdsEncarregado)

  const cards = [
    {
      title: 'Obras Ativas',
      value: stats.obrasAtivas,
      icon: HardHat,
      description: 'em andamento',
      color: 'text-blue-600',
    },
    {
      title: 'Contratos Ativos',
      value: stats.contratosAtivos,
      icon: FileText,
      description: 'em vigor',
      color: 'text-green-600',
    },
    {
      title: 'RDOs Pendentes',
      value: stats.rdosPendentes,
      icon: ClipboardList,
      description: 'aguardando aprovação',
      color: stats.rdosPendentes > 0 ? 'text-yellow-600' : 'text-muted-foreground',
    },
    {
      title: 'Alertas de EPIs',
      value: stats.episVencidos,
      icon: ShieldCheck,
      description: 'EPIs vencidos',
      color: stats.episVencidos > 0 ? 'text-red-600' : 'text-muted-foreground',
    },
    {
      title: 'Equipamentos em Uso',
      value: stats.equipamentosEmUso,
      icon: Wrench,
      description: 'alocados em obras',
      color: 'text-purple-600',
    },
    {
      title: 'HH Consumido',
      value: `${stats.hhPct}%`,
      icon: Timer,
      description: `${stats.hhConsumido}h de ${stats.hhContratado}h contratadas`,
      color: stats.hhPct >= 100 ? 'text-red-600' : stats.hhPct >= 80 ? 'text-yellow-600' : 'text-green-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral das operações</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, description, color }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className={`h-5 w-5 ${color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats.hhPct >= 80 && (
        <Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="flex items-center gap-3 py-4">
            <Timer className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {stats.hhPct >= 100 ? 'Limite de HH atingido!' : 'Atenção: 80% do HH contratado consumido'}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {stats.hhConsumido}h consumidas de {stats.hhContratado}h contratadas ({stats.hhPct}%)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.episVencidos > 0 && (
        <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="flex items-center gap-3 py-4">
            <ShieldCheck className="h-5 w-5 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {stats.episVencidos} EPI{stats.episVencidos > 1 ? 's' : ''} vencido{stats.episVencidos > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Verifique o módulo de EPIs para regularizar
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
