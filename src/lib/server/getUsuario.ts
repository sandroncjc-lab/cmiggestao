import { auth } from '@clerk/nextjs/server'
import { db } from '@/app/db'
import { usuarios } from '@/app/db/schema'
import { eq } from 'drizzle-orm'

export async function getUsuarioAtual() {
  const { userId } = await auth()
  if (!userId) return null

  const [usuario] = await db
    .select({
      id: usuarios.id,
      empresaId: usuarios.empresaId,
      funcao: usuarios.funcao,
      clienteId: usuarios.clienteId,
    })
    .from(usuarios)
    .where(eq(usuarios.clerkId, userId))
    .limit(1)

  return usuario ?? null
}

export async function getEmpresaIdOuErro(): Promise<string> {
  const usuario = await getUsuarioAtual()
  if (!usuario) throw new Error('Não autenticado')
  return usuario.empresaId
}

export function isCliente(funcao: string) {
  return funcao === 'aprovador_cliente'
}
