import { db } from '@/app/db'
import { documentos, obras, clientes, obraResponsaveis } from '@/app/db/schema'
import { and, eq, inArray, or } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, FileText, ExternalLink } from 'lucide-react'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { redirect } from 'next/navigation'

const tipoConfig: Record<string, { label: string; variant: string }> = {
  contrato:  { label: 'Contrato',   variant: 'default' },
  alvara:    { label: 'Alvará',     variant: 'info' },
  planta:    { label: 'Planta',     variant: 'secondary' },
  relatorio: { label: 'Relatório',  variant: 'outline' },
  outro:     { label: 'Outro',      variant: 'secondary' },
}

export default async function DocumentosPage() {
  const usuario = await getUsuarioAtual()
  if (!usuario) redirect('/aguardando')

  let rows: {
    id: string
    titulo: string
    tipo: string
    url: string
    criadoEm: Date
    obraNome: string | null
    clienteNome: string | null
  }[] = []

  if (isCliente(usuario.funcao)) {
    // Aprovador_cliente: só documentos do seu clienteId ou das obras do seu cliente
    if (usuario.clienteId) {
      const obrasDoCliente = await db
        .select({ id: obras.id })
        .from(obras)
        .where(eq(obras.clienteId, usuario.clienteId))
      const obraIds = obrasDoCliente.map((o) => o.id)

      rows = await db
        .select({
          id: documentos.id,
          titulo: documentos.titulo,
          tipo: documentos.tipo,
          url: documentos.url,
          criadoEm: documentos.criadoEm,
          obraNome: obras.nome,
          clienteNome: clientes.nome,
        })
        .from(documentos)
        .leftJoin(obras, eq(documentos.obraId, obras.id))
        .leftJoin(clientes, eq(documentos.clienteId, clientes.id))
        .where(
          obraIds.length > 0
            ? or(eq(documentos.clienteId, usuario.clienteId), inArray(documentos.obraId, obraIds))
            : eq(documentos.clienteId, usuario.clienteId)
        )
        .orderBy(documentos.criadoEm)
    }
  } else if (usuario.funcao === 'encarregado') {
    // Encarregado: só documentos das obras atribuídas a ele
    const atribuicoes = await db
      .select({ obraId: obraResponsaveis.obraId })
      .from(obraResponsaveis)
      .where(and(eq(obraResponsaveis.usuarioId, usuario.id), eq(obraResponsaveis.papel, 'encarregado')))
    const obraIds = atribuicoes.map((a) => a.obraId)

    if (obraIds.length > 0) {
      rows = await db
        .select({
          id: documentos.id,
          titulo: documentos.titulo,
          tipo: documentos.tipo,
          url: documentos.url,
          criadoEm: documentos.criadoEm,
          obraNome: obras.nome,
          clienteNome: clientes.nome,
        })
        .from(documentos)
        .leftJoin(obras, eq(documentos.obraId, obras.id))
        .leftJoin(clientes, eq(documentos.clienteId, clientes.id))
        .where(inArray(documentos.obraId, obraIds))
        .orderBy(documentos.criadoEm)
    }
  } else {
    // Admin / engenheiro: todos os documentos da empresa
    const obrasEmpresa = await db
      .select({ id: obras.id })
      .from(obras)
      .where(eq(obras.empresaId, usuario.empresaId))
    const obraIds = obrasEmpresa.map((o) => o.id)

    const clientesEmpresa = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.empresaId, usuario.empresaId))
    const clienteIds = clientesEmpresa.map((c) => c.id)

    const conditions = []
    if (obraIds.length > 0) conditions.push(inArray(documentos.obraId, obraIds))
    if (clienteIds.length > 0) conditions.push(inArray(documentos.clienteId, clienteIds))
    conditions.push(eq(documentos.enviadoPorId, usuario.id))

    rows = await db
      .select({
        id: documentos.id,
        titulo: documentos.titulo,
        tipo: documentos.tipo,
        url: documentos.url,
        criadoEm: documentos.criadoEm,
        obraNome: obras.nome,
        clienteNome: clientes.nome,
      })
      .from(documentos)
      .leftJoin(obras, eq(documentos.obraId, obras.id))
      .leftJoin(clientes, eq(documentos.clienteId, clientes.id))
      .where(or(...conditions))
      .orderBy(documentos.criadoEm)
  }

  const podeEnviar = !isCliente(usuario.funcao)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documentos</h2>
          <p className="text-muted-foreground">{rows.length} documento{rows.length !== 1 ? 's' : ''}</p>
        </div>
        {podeEnviar && (
          <Button asChild>
            <Link href="/documentos/novo"><Plus className="h-4 w-4 mr-2" />Novo Documento</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Obra</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                    Nenhum documento encontrado
                  </TableCell>
                </TableRow>
              )}
              {rows.map((d) => {
                const cfg = tipoConfig[d.tipo] ?? { label: d.tipo, variant: 'secondary' }
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        {d.titulo}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant={cfg.variant as any}>{cfg.label}</Badge></TableCell>
                    <TableCell>{d.obraNome ?? '—'}</TableCell>
                    <TableCell>{d.clienteNome ?? '—'}</TableCell>
                    <TableCell>{d.criadoEm.toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="text-right">
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4 mr-1" />Abrir
                        </Button>
                      </a>
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
