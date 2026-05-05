import { db } from '@/app/db'
import { contratos, clientes, obras } from '@/app/db/schema'
import { eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: string }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  ativo: { label: 'Ativo', variant: 'success' },
  suspenso: { label: 'Suspenso', variant: 'warning' },
  encerrado: { label: 'Encerrado', variant: 'outline' },
}

export default async function ContratosPage() {
  const rows = await db
    .select({
      id: contratos.id,
      numero: contratos.numero,
      valorTotal: contratos.valorTotal,
      dataInicio: contratos.dataInicio,
      dataFim: contratos.dataFim,
      status: contratos.status,
      percentualExecucao: contratos.percentualExecucao,
      clienteNome: clientes.nome,
      obraNome: obras.nome,
    })
    .from(contratos)
    .leftJoin(clientes, eq(contratos.clienteId, clientes.id))
    .leftJoin(obras, eq(contratos.obraId, obras.id))
    .orderBy(contratos.criadoEm)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contratos</h2>
          <p className="text-muted-foreground">{rows.length} contrato{rows.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild>
          <Link href="/contratos/novo"><Plus className="h-4 w-4 mr-2" />Novo Contrato</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Execução</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    Nenhum contrato cadastrado
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => {
                const cfg = statusConfig[c.status] ?? { label: c.status, variant: 'secondary' }
                const pct = Number(c.percentualExecucao)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.numero}</TableCell>
                    <TableCell>{c.clienteNome ?? '—'}</TableCell>
                    <TableCell>{c.obraNome ?? '—'}</TableCell>
                    <TableCell className="font-medium">
                      R$ {Number(c.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="min-w-32">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant as any}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.dataInicio} → {c.dataFim ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/contratos/${c.id}`}>Ver</Link>
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
