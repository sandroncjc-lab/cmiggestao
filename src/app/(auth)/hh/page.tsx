import { db } from '@/app/db'
import { hhContratos, hhRegistros, obras } from '@/app/db/schema'
import { eq, sql } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Timer, AlertTriangle } from 'lucide-react'

export default async function HhPage() {
  const obrasList = await db
    .select({
      id: obras.id,
      nome: obras.nome,
      totalHH: hhContratos.totalHH,
      hhId: hhContratos.id,
    })
    .from(obras)
    .leftJoin(hhContratos, eq(hhContratos.obraId, obras.id))
    .orderBy(obras.nome)

  const consumoPorObra = await db
    .select({
      obraId: hhRegistros.obraId,
      total: sql<number>`coalesce(sum(horas_normais + horas_extras), 0)`,
    })
    .from(hhRegistros)
    .groupBy(hhRegistros.obraId)

  const consumoMap = Object.fromEntries(consumoPorObra.map(c => [c.obraId, Number(c.total)]))

  const registros = await db
    .select({
      id: hhRegistros.id,
      obraId: hhRegistros.obraId,
      obraNome: obras.nome,
      nomeFuncionario: hhRegistros.nomeFuncionario,
      funcao: hhRegistros.funcao,
      data: hhRegistros.data,
      horasNormais: hhRegistros.horasNormais,
      horasExtras: hhRegistros.horasExtras,
    })
    .from(hhRegistros)
    .leftJoin(obras, eq(hhRegistros.obraId, obras.id))
    .orderBy(hhRegistros.data)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Homem Hora (HH)</h2>
          <p className="text-muted-foreground">Controle de horas por obra e funcionário</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/hh/contrato"><Timer className="h-4 w-4 mr-2" />Definir HH Contratado</Link>
          </Button>
          <Button asChild>
            <Link href="/hh/novo"><Plus className="h-4 w-4 mr-2" />Registrar HH</Link>
          </Button>
        </div>
      </div>

      {/* Painel por obra */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {obrasList.map((o) => {
          const contratado = Number(o.totalHH ?? 0)
          const consumido = consumoMap[o.id] ?? 0
          const pct = contratado > 0 ? Math.round((consumido / contratado) * 100) : 0
          const alerta = pct >= 100 ? 'destructive' : pct >= 80 ? 'warning' : 'success'

          return (
            <Card key={o.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium truncate">{o.nome}</CardTitle>
                  {pct >= 80 && <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Consumido</span>
                  <span className="font-medium">{consumido}h / {contratado}h</span>
                </div>
                <Progress value={pct} />
                <div className="flex items-center justify-between">
                  <Badge variant={alerta as any}>{pct}% utilizado</Badge>
                  <span className="text-xs text-muted-foreground">Saldo: {Math.max(0, contratado - consumido)}h</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de HH</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>H. Normais</TableHead>
                <TableHead>H. Extras</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                    Nenhum registro de HH
                  </TableCell>
                </TableRow>
              )}
              {registros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nomeFuncionario}</TableCell>
                  <TableCell>{r.funcao ?? '—'}</TableCell>
                  <TableCell>{r.obraNome ?? '—'}</TableCell>
                  <TableCell>{r.data}</TableCell>
                  <TableCell>{Number(r.horasNormais)}h</TableCell>
                  <TableCell>{Number(r.horasExtras)}h</TableCell>
                  <TableCell className="font-medium">
                    {(Number(r.horasNormais) + Number(r.horasExtras)).toFixed(1)}h
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
