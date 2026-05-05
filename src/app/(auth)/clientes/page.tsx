import { db } from '@/app/db'
import { clientes, empresas } from '@/app/db/schema'
import { eq, ilike, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>
}

const PER_PAGE = 20

export default async function ClientesPage({ searchParams }: Props) {
  const { q, page } = await searchParams
  const currentPage = Number(page ?? 1)
  const offset = (currentPage - 1) * PER_PAGE

  const whereClause = q ? ilike(clientes.nome, `%${q}%`) : undefined

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: clientes.id,
        nome: clientes.nome,
        documento: clientes.documento,
        email: clientes.email,
        telefone: clientes.telefone,
        criadoEm: clientes.criadoEm,
      })
      .from(clientes)
      .where(whereClause)
      .limit(PER_PAGE)
      .offset(offset)
      .orderBy(clientes.nome),
    db.select({ total: sql<number>`count(*)` }).from(clientes).where(whereClause),
  ])

  const totalPages = Math.ceil(Number(total) / PER_PAGE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Clientes</h2>
          <p className="text-muted-foreground">{Number(total)} cliente{Number(total) !== 1 ? 's' : ''} cadastrado{Number(total) !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild>
          <Link href="/clientes/novo"><Plus className="h-4 w-4 mr-2" />Novo Cliente</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <form method="GET" className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar clientes..."
                className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" variant="secondary">Buscar</Button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Nenhum cliente encontrado
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell>{c.documento ?? '—'}</TableCell>
                  <TableCell>{c.email ?? '—'}</TableCell>
                  <TableCell>{c.telefone ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/clientes/${c.id}`}>Ver</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/clientes/${c.id}/editar`}>Editar</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === currentPage ? 'default' : 'outline'}
              size="sm"
              asChild
            >
              <Link href={`/clientes?page=${p}${q ? `&q=${q}` : ''}`}>{p}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
