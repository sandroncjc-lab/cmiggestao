// CORREÇÃO DE SEGURANÇA - Auditoria
import { db } from '@/app/db'
import { obras, clientes, hhRegistros } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'

/**
 * Lança erro 403 se a obra não pertencer à empresa do usuário.
 * Retorna os dados da obra para reuso.
 */
export async function verificarOwnershipObra(obraId: string, empresaId: string) {
  const [obra] = await db
    .select({ id: obras.id, empresaId: obras.empresaId })
    .from(obras)
    .where(and(eq(obras.id, obraId), eq(obras.empresaId, empresaId)))
    .limit(1)

  if (!obra) throw new Error('Acesso negado: obra não pertence à sua empresa')
  return obra
}

/**
 * Lança erro 403 se o contrato (vinculado via cliente) não pertencer à empresa.
 * Retorna o clienteId do contrato para reuso.
 */
export async function verificarOwnershipContrato(contratoId: string, empresaId: string) {
  const { contratos } = await import('@/app/db/schema')
  const [row] = await db
    .select({ contratoId: contratos.id, clienteEmpresaId: clientes.empresaId })
    .from(contratos)
    .innerJoin(clientes, eq(contratos.clienteId, clientes.id))
    .where(and(eq(contratos.id, contratoId), eq(clientes.empresaId, empresaId)))
    .limit(1)

  if (!row) throw new Error('Acesso negado: contrato não pertence à sua empresa')
  return row
}

/**
 * Lança erro 403 se o registro de HH não pertencer à empresa (via obra).
 */
export async function verificarOwnershipHHRegistro(registroId: string, empresaId: string) {
  const [row] = await db
    .select({ id: hhRegistros.id })
    .from(hhRegistros)
    .innerJoin(obras, and(eq(hhRegistros.obraId, obras.id), eq(obras.empresaId, empresaId)))
    .where(eq(hhRegistros.id, registroId))
    .limit(1)

  if (!row) throw new Error('Acesso negado: registro de HH não pertence à sua empresa')
  return row
}
