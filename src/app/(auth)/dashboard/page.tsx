import { db } from '@/app/db'
import { obras, contratos, rdo, epis, equipamentos, hhContratos, hhRegistros } from '@/app/db/schema'
import { eq, and, sql, gte } from 'drizzle-orm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HardHat, FileText, ClipboardList, ShieldCheck, Timer, Wrench } from 'lucide-react'

async function getDashboardStats() {
  const [
    obrasAtivas,
    contratosAtivos,
    rdosPendentes,
    episVencidos,
    equipamentosEmUso,
    totalHHContratado,
    totalHHConsumido,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(obras).where(eq(obras.status, 'em_andamento')),
    db.select({ count: sql<number>`count(*)` }).from(contratos).where(eq(contratos.status, 'ativo')),
    db.select({ count: sql<number>`count(*)` }).from(rdo).where(eq(rdo.status, 'pendente_aprovacao')),
    db.select({ count: sql<number>`count(*)` }).from(epis).where(eq(epis.status, 'vencido')),
    db.select({ count: sql<number>`count(*)` }).from(equipamentos).where(eq(equipamentos.status, 'em_uso')),
    db.select({ total: sql<number>`coalesce(sum(total_hh), 0)` }).from(hhContratos),
    db.select({ total: sql<number>`coalesce(sum(horas_normais + horas_extras), 0)` }).from(hhRegistros),
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

export default async function DashboardPage() {
  const stats = await getDashboardStats()

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
