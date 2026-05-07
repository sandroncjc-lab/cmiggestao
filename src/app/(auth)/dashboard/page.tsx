import { getDashboardStats } from '@/data/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { HardHat, FileText, ClipboardList, ShieldCheck, Timer, Wrench } from 'lucide-react'

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  if (!stats) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <Card className="border-yellow-300 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
          <CardContent className="py-6">
            <p className="font-medium text-yellow-800 dark:text-yellow-200">
              Conta não vinculada
            </p>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              Seu login não está associado a nenhum usuário cadastrado no sistema. Peça ao administrador para criar seu acesso.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
      description: 'abaixo do estoque mínimo',
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
        <h2 className="text-2xl font-bold tracking-tight">
          Olá, {stats.usuario.nome.split(' ')[0]}
        </h2>
        <p className="text-muted-foreground">Visão geral das operações da sua empresa</p>
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
                {stats.episVencidos} EPI{stats.episVencidos > 1 ? 's' : ''} abaixo do estoque mínimo
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                Verifique o módulo de EPIs e registre uma entrada de estoque
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
