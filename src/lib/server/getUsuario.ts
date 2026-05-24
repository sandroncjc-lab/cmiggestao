import { auth } from '@clerk/nextjs/server'
import { db } from '@/app/db'
import { usuarios } from '@/app/db/schema'
import { eq } from 'drizzle-orm'

// Erros tipados para distinguir as duas situações de falha
export class NaoAutenticadoError extends Error {
  constructor() { super('Usuário não autenticado (sem sessão Clerk)') }
}
export class SemRegistroError extends Error {
  constructor(clerkId: string) {
    super(`Usuário autenticado no Clerk (${clerkId}) mas sem registro na tabela usuarios. Execute o seed ou cadastre o usuário.`)
  }
}

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

/**
 * Retorna o empresaId do usuário logado.
 * Lança NaoAutenticadoError se não houver sessão Clerk.
 * Lança SemRegistroError se o usuário existe no Clerk mas não na tabela usuarios.
 */
export async function getEmpresaIdOuErro(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new NaoAutenticadoError()

  const [usuario] = await db
    .select({ id: usuarios.id, empresaId: usuarios.empresaId })
    .from(usuarios)
    .where(eq(usuarios.clerkId, userId))
    .limit(1)

  if (!usuario) throw new SemRegistroError(userId)

  return usuario.empresaId
}

/**
 * Versão que retorna o usuário completo ou lança erro tipado.
 * Use quando precisar de funcao/clienteId além do empresaId.
 */
export async function getUsuarioOuErro() {
  const { userId } = await auth()
  if (!userId) throw new NaoAutenticadoError()

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

  if (!usuario) throw new SemRegistroError(userId)

  return usuario
}

export function isCliente(funcao: string) {
  return funcao === 'aprovador_cliente'
}
