import { db } from '@/app/db'
import { contratos, clientes, obras, obraResponsaveis } from '@/app/db/schema'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getUsuarioOuErro, isCliente } from '@/lib/server/getUsuario'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Plus } from 'lucide-react'

const statusConfig: Record<string, { label: string; variant: string }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  ativo: { label: 'Ativo', variant: 'success' },
  suspenso: { label: 'Suspenso', variant: 'warning' },
  encerrado: { label: 'Encerrado', variant: 'outline' },
}

const tipoConfig: Record<string, { label: string; variant: string }> = {
  homem_hora: { label: 'Homem Hora', variant: 'warning' },
  valor_fechado: { label: 'Valor Fechado', variant: 'secondary' },
}

export default async function ContratosPage() {
  const usuario = await getUsuarioOuErro()
  const { empresaId } = usuario
  const clienteVendo = isCliente(usuario.funcao)
  const encarregadoVendo = usuario.funcao === 'encarregado'
  const empresaFilter = eq(clientes.empresaId, empresaId)

  // Para papéis restritos: calcular IDs de obras visíveis
  let obraIdsVisiveis: string[] | null = null
  if (encarregadoVendo || clienteVendo) {
    const atrib = await db
      .select({ obraId: obraResponsaveis.obraId })
      .from(obraResponsaveis)
      .where(eq(obraResponsaveis.usuarioId, usuario.id))
    obraIdsVisiveis = atrib.map((r) => r.obraId)
  }

  // Contratos visíveis para cliente: pelo clienteId legado + obras atribuídas
  let contratosIdsCliente: string[] | null = null
  if (clienteVendo && usuario.clienteId) {
    const cc = await db
      .select({ id: contratos.id })
      .from(contratos)
      .innerJoin(clientes, and(eq(contratos.clienteId, clientes.id), eq(clientes.empresaId, empresaId)))
      .where(eq(contratos.clienteId, usuario.clienteId))
    contratosIdsCliente = cc.map((c) => c.id)
  }

  // Montar lista final de IDs visíveis para restritos
  let contratosIdsFinal: string[] | null = null
  if (clienteVendo || encarregadoVendo) {
    const idsSet = new Set<string>()
    if (contratosIdsCliente) contratosIdsCliente.forEach((id) => idsSet.add(id))
    if (obraIdsVisiveis && obraIdsVisiveis.length > 0) {
      const cc2 = await db
        .select({ id: contratos.id })
        .from(contratos)
        .innerJoin(clientes, and(eq(contratos.clienteId, clientes.id), eq(clientes.empresaId, empresaId)))
        .where(inArray(contratos.obraId, obraIdsVisiveis))
      cc2.forEach((c) => idsSet.add(c.id))
    }
    contratosIdsFinal = [...idsSet]
  }

  // Retorno antecipado para papéis restritos sem contratos
  if (contratosIdsFinal !== null && contratosIdsFinal.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Contratos</h2>
            <p className="text-muted-foreground">0 contratos</p>
          </div>
          {!clienteVendo && (
            <Button asChild>
              <Link href="/contratos/novo"><Plus className="h-4 w-4 mr-2" />Novo Contrato</Link>
            </Button>
          )}
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum contrato atribuído a você
          </CardContent>
        </Card>
      </div>
    )
  }

  const whereContratos = contratosIdsFinal !== null
    ? and(empresaFilter, inArray(contratos.id, contratosIdsFinal))
    : empresaFilter

  const rows = await db
    .select({
      id: contratos.id,
      numero: contratos.numero,
      valorTotal: contratos.valorTotal,
      dataInicio: contratos.dataInicio,
      dataFim: contratos.dataFim,
      status: contratos.status,
      tipo: contratos.tipo,
      percentualExecucao: contratos.percentualExecucao,
      clienteNome: clientes.nome,
      obraNome: obras.nome,
    })
    .from(contratos)
    .innerJoin(clientes, eq(contratos.clienteId, clientes.id))
    .leftJoin(obras, eq(contratos.obraId, obras.id))
    .where(whereContratos)
    .orderBy(contratos.criadoEm)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contratos</h2>
          <p className="text-muted-foreground">{rows.length} contrato{rows.length !== 1 ? 's' : ''}</p>
        </div>
        {!clienteVendo && (
          <Button asChild>
            <Link href="/contratos/novo"><Plus className="h-4 w-4 mr-2" />Novo Contrato</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Tipo</TableHead>
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
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                    Nenhum contrato cadastrado
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => {
                const cfg = statusConfig[c.status] ?? { label: c.status, variant: 'secondary' }
                const tipoCfg = tipoConfig[c.tipo ?? 'valor_fechado'] ?? tipoConfig.valor_fechado
                const pct = Number(c.percentualExecucao)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.numero}</TableCell>
                    <TableCell>{c.clienteNome ?? '—'}</TableCell>
                    <TableCell>{c.obraNome ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={tipoCfg.variant as any}>{tipoCfg.label}</Badge>
                    </TableCell>
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
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/contratos/${c.id}/editar`}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
