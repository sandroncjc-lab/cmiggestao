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
    super(`Usuário autenticado no Clerk (${clerkId}) mas sem registro na tabela usuarios.`)
  }
}
export class UsuarioPendenteError extends Error {
  constructor() { super('Usuário pendente de atribuição de papel e empresa.') }
}

// Tipo do usuário ativo (garantidamente com empresa e papel)
export type UsuarioAtivo = {
  id: string
  empresaId: string   // string (não null) — garantido pelo throw
  funcao: string
  clienteId: string | null
}

export async function getUsuarioAtual(): Promise<UsuarioAtivo | null> {
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

  if (!usuario) return null
  // Usuário pendente: sem empresa ou sem papel definido
  if (!usuario.empresaId || usuario.funcao === 'pendente') return null

  return { ...usuario, empresaId: usuario.empresaId }
}

/**
 * Retorna o empresaId do usuário logado.
 * Lança se não houver sessão, se não houver registro, ou se o usuário for pendente.
 */
export async function getEmpresaIdOuErro(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new NaoAutenticadoError()

  const [usuario] = await db
    .select({ id: usuarios.id, empresaId: usuarios.empresaId, funcao: usuarios.funcao })
    .from(usuarios)
    .where(eq(usuarios.clerkId, userId))
    .limit(1)

  if (!usuario) throw new SemRegistroError(userId)
  if (!usuario.empresaId || usuario.funcao === 'pendente') throw new UsuarioPendenteError()

  return usuario.empresaId
}

/**
 * Versão que retorna o usuário completo ou lança erro tipado.
 * Use quando precisar de funcao/clienteId além do empresaId.
 */
export async function getUsuarioOuErro(): Promise<UsuarioAtivo> {
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
  if (!usuario.empresaId || usuario.funcao === 'pendente') throw new UsuarioPendenteError()

  return { ...usuario, empresaId: usuario.empresaId }
}

export function isCliente(funcao: string) {
  return funcao === 'aprovador_cliente'
}
