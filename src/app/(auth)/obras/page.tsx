import { db } from '@/app/db'
import { obras, clientes, usuarios } from '@/app/db/schema'
import { eq, ilike, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'
import { type BadgeVariant } from '@/components/ui/badge'

interface Props {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}

const PER_PAGE = 20

const statusConfig: Record<string, { label: string; variant: BadgeVariant; color: string }> = {
  planejada: { label: 'Planejada', variant: 'secondary', color: 'bg-gray-400' },
  em_andamento: { label: 'Em Andamento', variant: 'info', color: 'bg-blue-500' },
  pausada: { label: 'Pausada', variant: 'warning', color: 'bg-yellow-500' },
  concluida: { label: 'Concluída', variant: 'success', color: 'bg-green-500' },
}

export default async function ObrasPage({ searchParams }: Props) {
  const { q, status, page } = await searchParams
  const currentPage = Number(page ?? 1)
  const offset = (currentPage - 1) * PER_PAGE

  const rows = await db
    .select({
      id: obras.id,
      nome: obras.nome,
      status: obras.status,
      dataInicio: obras.dataInicio,
      dataFim: obras.dataFim,
      clienteNome: clientes.nome,
    })
    .from(obras)
    .leftJoin(clientes, eq(obras.clienteId, clientes.id))
    .limit(PER_PAGE)
    .offset(offset)
    .orderBy(obras.criadoEm)

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(obras)
  const totalPages = Math.ceil(Number(total) / PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Obras</h2>
          <p className="text-muted-foreground">{Number(total)} obra{Number(total) !== 1 ? 's' : ''} cadastrada{Number(total) !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild>
          <Link href="/obras/nova"><Plus className="h-4 w-4 mr-2" />Nova Obra</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form method="GET" className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar obras..."
                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <select
              name="status"
              defaultValue={status}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Todos os status</option>
              {Object.entries(statusConfig).map(([v, { label }]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary">Filtrar</Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Previsão Fim</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhuma obra encontrada
                  </TableCell>
                </TableRow>
              )}
              {rows.map((o) => {
                const cfg = statusConfig[o.status] ?? { label: o.status, variant: 'secondary', color: 'bg-gray-400' }
                return (
                  <TableRow key={o.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${cfg.color}`} />
                        <Link href={`/obras/${o.id}`} className="font-medium hover:underline">{o.nome}</Link>
                      </div>
                    </TableCell>
                    <TableCell>{o.clienteNome ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell>{o.dataInicio ?? '—'}</TableCell>
                    <TableCell>{o.dataFim ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/obras/${o.id}`}>Ver</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button key={p} variant={p === currentPage ? 'default' : 'outline'} size="sm" asChild>
              <Link href={`/obras?page=${p}${q ? `&q=${q}` : ''}${status ? `&status=${status}` : ''}`}>{p}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
