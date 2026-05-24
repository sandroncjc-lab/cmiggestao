import { db } from '@/app/db'
import { obras, clientes, usuarios, servicos } from '@/app/db/schema'
import { eq, and } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { RdoForm } from './rdo-form'
import { getUsuarioAtual } from '@/lib/server/getUsuario'

export default async function NovoRdoPage({
  searchParams,
}: {
  searchParams: Promise<{ obraId?: string }>
}) {
  const { obraId } = await searchParams
  const usuario = await getUsuarioAtual()

  const obrasList = usuario
    ? await db
        .select({
          id: obras.id,
          nome: obras.nome,
          aprovadorClienteId: obras.aprovadorClienteId,
          aprovadorNome: usuarios.nome,
          clienteNome: clientes.nome,
        })
        .from(obras)
        .leftJoin(usuarios, eq(obras.aprovadorClienteId, usuarios.id))
        .leftJoin(clientes, eq(obras.clienteId, clientes.id))
        .where(eq(obras.empresaId, usuario.empresaId))
        .orderBy(obras.nome)
    : []

  // Carrega serviços de todas as obras da empresa, agrupados por obraId
  const servicosList = usuario
    ? await db
        .select({
          id: servicos.id,
          nome: servicos.nome,
          unidade: servicos.unidade,
          obraId: servicos.obraId,
        })
        .from(servicos)
        .innerJoin(obras, and(eq(servicos.obraId, obras.id), eq(obras.empresaId, usuario.empresaId)))
        .orderBy(servicos.nome)
    : []

  const servicosPorObra = servicosList.reduce<Record<string, typeof servicosList>>((acc, s) => {
    if (!acc[s.obraId]) acc[s.obraId] = []
    acc[s.obraId].push(s)
    return acc
  }, {})

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rdo"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold">Novo RDO</h2>
          <p className="text-muted-foreground">Relatório Diário de Obras</p>
        </div>
      </div>
      <RdoForm obras={obrasList} servicosPorObra={servicosPorObra} defaultObraId={obraId} />
    </div>
  )
}
