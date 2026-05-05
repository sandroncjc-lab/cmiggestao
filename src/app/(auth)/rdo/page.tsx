import { db } from '@/app/db'
import { rdo, obras } from '@/app/db/schema'
import { eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: string }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente_aprovacao: { label: 'Pendente', variant: 'warning' },
  aprovado: { label: 'Aprovado', variant: 'success' },
  rejeitado: { label: 'Rejeitado', variant: 'destructive' },
}

const climaLabel: Record<string, string> = {
  ensolarado: '☀️ Ensolarado',
  nublado: '⛅ Nublado',
  chuvoso: '🌧️ Chuvoso',
  tempestade: '⛈️ Tempestade',
}

export default async function RdoPage() {
  const rows = await db
    .select({
      id: rdo.id,
      data: rdo.data,
      status: rdo.status,
      clima: rdo.clima,
      obraNome: obras.nome,
    })
    .from(rdo)
    .leftJoin(obras, eq(rdo.obraId, obras.id))
    .orderBy(rdo.data)

  const pendentes = rows.filter(r => r.status === 'pendente_aprovacao').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">RDO — Relatório Diário de Obras</h2>
          <p className="text-muted-foreground">
            {rows.length} relatório{rows.length !== 1 ? 's' : ''}
            {pendentes > 0 && <span className="ml-2 text-yellow-600 font-medium">• {pendentes} pendente{pendentes > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <Button asChild>
          <Link href="/rdo/novo"><Plus className="h-4 w-4 mr-2" />Novo RDO</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Clima</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                    Nenhum RDO registrado
                  </TableCell>
                </TableRow>
              )}
              {rows.map((r) => {
                const cfg = statusConfig[r.status] ?? { label: r.status, variant: 'secondary' }
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.data}</TableCell>
                    <TableCell>{r.obraNome ?? '—'}</TableCell>
                    <TableCell>{climaLabel[r.clima] ?? r.clima}</TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/rdo/${r.id}`}>Ver</Link>
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
