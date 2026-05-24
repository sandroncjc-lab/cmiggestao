import { db } from '@/app/db'
import { obras, usuarios, clientes } from '@/app/db/schema'
import { eq, and } from 'drizzle-orm'
import { getUsuarioAtual } from '@/lib/server/getUsuario'
import { notFound } from 'next/navigation'
import { EditarObraClient } from './editar-obra-client'

export default async function EditarObraPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const usuario = await getUsuarioAtual()
  if (!usuario) notFound()

  const [obraRow] = await db
    .select({
      id: obras.id,
      nome: obras.nome,
      clienteId: obras.clienteId,
      clienteNome: clientes.nome,
      aprovadorClienteId: obras.aprovadorClienteId,
    })
    .from(obras)
    .leftJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(and(eq(obras.id, id), eq(obras.empresaId, usuario.empresaId)))
    .limit(1)

  if (!obraRow) notFound()

  // aprovador atual
  const aprovadorAtualRows = obraRow.aprovadorClienteId
    ? await db
        .select({ nome: usuarios.nome, email: usuarios.email })
        .from(usuarios)
        .where(eq(usuarios.id, obraRow.aprovadorClienteId))
        .limit(1)
    : []

  // aprovadores disponíveis para este cliente
  const aprovadoresDisponiveis = obraRow.clienteId
    ? await db
        .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email, clienteId: usuarios.clienteId })
        .from(usuarios)
        .where(and(eq(usuarios.funcao, 'aprovador_cliente'), eq(usuarios.clienteId, obraRow.clienteId)))
    : []

  return (
    <EditarObraClient
      obra={{
        id: obraRow.id,
        nome: obraRow.nome,
        clienteId: obraRow.clienteId ?? null,
        clienteNome: obraRow.clienteNome ?? null,
        aprovadorClienteId: obraRow.aprovadorClienteId ?? null,
        aprovadorNome: aprovadorAtualRows[0]?.nome ?? null,
        aprovadorEmail: aprovadorAtualRows[0]?.email ?? null,
      }}
      aprovadoresIniciais={aprovadoresDisponiveis.map((a) => ({
        ...a,
        clienteId: a.clienteId ?? null,
      }))}
    />
  )
}
