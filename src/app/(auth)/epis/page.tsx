import { db } from '@/app/db'
import { epis, obras } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, AlertTriangle } from 'lucide-react'

function getEpiVariant(validade: string | null, status: string): { label: string; variant: string } {
  if (status === 'vencido') return { label: 'Vencido', variant: 'destructive' }
  if (!validade) return { label: 'Ativo', variant: 'success' }
  const diasParaVencer = Math.ceil((new Date(validade).getTime() - Date.now()) / 86400000)
  if (diasParaVencer <= 30) return { label: `Vence em ${diasParaVencer}d`, variant: 'warning' }
  return { label: 'Ativo', variant: 'success' }
}

export default async function EpisPage() {
  const rows = await db
    .select({
      id: epis.id,
      tipo: epis.tipo,
      numeroCa: epis.numeroCa,
      validade: epis.validade,
      funcionarioNome: epis.funcionarioNome,
      dataEntrega: epis.dataEntrega,
      status: epis.status,
      obraNome: obras.nome,
    })
    .from(epis)
    .leftJoin(obras, eq(epis.obraId, obras.id))
    .orderBy(epis.validade)

  const vencidos = rows.filter(e => e.status === 'vencido').length
  const proximos = rows.filter(e => {
    if (e.status === 'vencido' || !e.validade) return false
    const dias = Math.ceil((new Date(e.validade).getTime() - Date.now()) / 86400000)
    return dias <= 30
  }).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">EPIs</h2>
          <p className="text-muted-foreground">
            {rows.length} EPI{rows.length !== 1 ? 's' : ''}
            {vencidos > 0 && <span className="ml-2 text-red-600 font-medium">• {vencidos} vencido{vencidos > 1 ? 's' : ''}</span>}
            {proximos > 0 && <span className="ml-2 text-yellow-600 font-medium">• {proximos} vencendo em 30d</span>}
          </p>
        </div>
        <Button asChild>
          <Link href="/epis/novo"><Plus className="h-4 w-4 mr-2" />Novo EPI</Link>
        </Button>
      </div>

      {(vencidos > 0 || proximos > 0) && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950">
          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {vencidos > 0 && `${vencidos} EPI${vencidos > 1 ? 's' : ''} vencido${vencidos > 1 ? 's' : ''}. `}
            {proximos > 0 && `${proximos} EPI${proximos > 1 ? 's' : ''} vencendo nos próximos 30 dias.`}
          </p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>CA</TableHead>
                <TableHead>Funcionário</TableHead>
                <TableHead>Data Entrega</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                    Nenhum EPI cadastrado
                  </TableCell>
                </TableRow>
              )}
              {rows.map((e) => {
                const { label, variant } = getEpiVariant(e.validade, e.status)
                return (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.tipo}</TableCell>
                    <TableCell className="font-mono text-xs">{e.numeroCa ?? '—'}</TableCell>
                    <TableCell>{e.funcionarioNome}</TableCell>
                    <TableCell>{e.dataEntrega}</TableCell>
                    <TableCell>{e.validade}</TableCell>
                    <TableCell>{e.obraNome ?? '—'}</TableCell>
                    <TableCell><Badge variant={variant as any}>{label}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/epis/${e.id}/editar`}>Editar</Link>
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
