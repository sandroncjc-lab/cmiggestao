import { listarHHDados } from '@/lib/actions/hh'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Timer, AlertTriangle, FileDown } from 'lucide-react'

export default async function HhPage() {
  const [{ obrasList, consumoMap, rdosPorObra, registrosPorObra }, usuario] = await Promise.all([
    listarHHDados(),
    getUsuarioAtual(),
  ])
  const clienteVendo = usuario ? isCliente(usuario.funcao) : false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Homem Hora (HH)</h2>
          <p className="text-muted-foreground">Controle de horas por obra e contrato</p>
        </div>
        {!clienteVendo && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/hh/contrato"><Timer className="h-4 w-4 mr-2" />Definir HH Contratado</Link>
            </Button>
            <Button asChild>
              <Link href="/hh/novo"><Plus className="h-4 w-4 mr-2" />Registrar HH</Link>
            </Button>
          </div>
        )}
      </div>

      {obrasList.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma obra com contrato de HH definido.</p>
      )}

      <div className="space-y-6">
        {obrasList.map((o) => {
          const contratado = Number(o.totalHH ?? 0)
          const consumido = consumoMap[o.id] ?? 0
          const saldo = Math.max(0, contratado - consumido)
          const pct = contratado > 0 ? Math.round((consumido / contratado) * 100) : 0
          const alerta = pct >= 100 ? 'destructive' : pct >= 80 ? 'warning' : 'success'
          const rdos = rdosPorObra[o.id] ?? []
          const manuais = registrosPorObra[o.id] ?? []

          return (
            <Card key={o.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base font-semibold">{o.nome}</CardTitle>
                  <div className="flex items-center gap-2 shrink-0">
                    {pct >= 80 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                    <Badge variant={alerta as any}>{pct}% utilizado</Badge>
                    <a
                      href={`/api/hh/pdf?obraId=${o.id}`}
                      download
                      title="Baixar relatório PDF de HH"
                      className="inline-flex items-center justify-center h-7 w-7 rounded hover:bg-muted transition-colors"
                    >
                      <FileDown className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </a>
                  </div>
                </div>
                <div className="flex gap-6 text-sm text-muted-foreground mt-1">
                  <span>Contratado: <span className="font-medium text-foreground">{contratado}h</span></span>
                  <span>Consumido: <span className="font-medium text-foreground">{consumido.toFixed(1)}h</span></span>
                  <span>Saldo: <span className={`font-medium ${saldo <= 0 ? 'text-destructive' : 'text-foreground'}`}>{saldo.toFixed(1)}h</span></span>
                </div>
                <Progress value={pct} className="mt-2 h-2" />
              </CardHeader>

              <CardContent className="pt-0 space-y-4">
                {/* Lançamentos via RDO */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Lançamentos via RDO {rdos.length > 0 ? `(${rdos.length})` : ''}
                  </p>
                  {rdos.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Nenhum lançamento de RDO.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Data</TableHead>
                          <TableHead className="text-xs">Funcionário</TableHead>
                          <TableHead className="text-xs">Função</TableHead>
                          <TableHead className="text-xs text-right">Horas</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rdos.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-sm">{String(r.rdoData)}</TableCell>
                            <TableCell className="text-sm font-medium">{r.nomeFuncionario}</TableCell>
                            <TableCell className="text-sm">{r.funcao ?? '—'}</TableCell>
                            <TableCell className="text-sm text-right">{Number(r.horas)}h</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>

                {/* Registros manuais */}
                {manuais.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Registros Manuais ({manuais.length})
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Data</TableHead>
                          <TableHead className="text-xs">Funcionário</TableHead>
                          <TableHead className="text-xs">Função</TableHead>
                          <TableHead className="text-xs text-right">Normal</TableHead>
                          <TableHead className="text-xs text-right">Extra</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {manuais.map((r) => {
                          const total = Number(r.horasNormais) + Number(r.horasExtras)
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="text-sm">{String(r.data)}</TableCell>
                              <TableCell className="text-sm font-medium">{r.nomeFuncionario}</TableCell>
                              <TableCell className="text-sm">{r.funcao ?? '—'}</TableCell>
                              <TableCell className="text-sm text-right">{Number(r.horasNormais)}h</TableCell>
                              <TableCell className="text-sm text-right">{Number(r.horasExtras)}h</TableCell>
                              <TableCell className="text-sm text-right font-medium">{total.toFixed(1)}h</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
