import { db } from '@/app/db'
import { equipamentos, obras } from '@/app/db/schema'
import { eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: string }> = {
  disponivel: { label: 'Disponível', variant: 'success' },
  em_uso: { label: 'Em Uso', variant: 'info' },
  manutencao: { label: 'Manutenção', variant: 'warning' },
}

export default async function EquipamentosPage() {
  const rows = await db
    .select({
      id: equipamentos.id,
      nome: equipamentos.nome,
      tipo: equipamentos.tipo,
      numeroSerie: equipamentos.numeroSerie,
      status: equipamentos.status,
      obraNome: obras.nome,
    })
    .from(equipamentos)
    .leftJoin(obras, eq(equipamentos.obraId, obras.id))
    .orderBy(equipamentos.nome)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Equipamentos</h2>
          <p className="text-muted-foreground">{rows.length} equipamento{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild>
          <Link href="/equipamentos/novo"><Plus className="h-4 w-4 mr-2" />Novo Equipamento</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Nº Série</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Obra Atual</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhum equipamento cadastrado
                  </TableCell>
                </TableRow>
              )}
              {rows.map((e) => {
                const cfg = statusConfig[e.status] ?? { label: e.status, variant: 'secondary' }
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell>{e.tipo ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{e.numeroSerie ?? '—'}</TableCell>
                    <TableCell><Badge variant={cfg.variant as any}>{cfg.label}</Badge></TableCell>
                    <TableCell>{e.obraNome ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/equipamentos/${e.id}`}>Ver</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/equipamentos/${e.id}/mover`}>Movimentar</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
