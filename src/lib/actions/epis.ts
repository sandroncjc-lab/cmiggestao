'use server'

import { db } from '@/app/db'
import { epis } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioOuErro } from '@/lib/server/getUsuario'
import { verificarOwnershipObra } from '@/lib/auth/ownership'

export async function criarEpi(formData: FormData) {
  const usuario = await getUsuarioOuErro()
  const validade = formData.get('validade') as string
  const hoje = new Date().toISOString().split('T')[0]
  const status = validade < hoje ? 'vencido' : 'ativo'
  const obraId = (formData.get('obraId') as string) || null

  // Verifica que a obra pertence à empresa (se informada)
  if (obraId) await verificarOwnershipObra(obraId, usuario.empresaId)

  await db.insert(epis).values({
    tipo: formData.get('tipo') as string,
    numeroCa: (formData.get('numeroCa') as string) || null,
    validade,
    funcionarioNome: formData.get('funcionarioNome') as string,
    dataEntrega: formData.get('dataEntrega') as string,
    status,
    obraId,
    empresaId: usuario.empresaId,
  })
  revalidatePath('/epis')
}

export async function atualizarEpi(id: string, formData: FormData) {
  const usuario = await getUsuarioOuErro()
  const validade = formData.get('validade') as string
  const hoje = new Date().toISOString().split('T')[0]
  const status = validade < hoje ? 'vencido' : 'ativo'

  await db.update(epis).set({
    tipo: formData.get('tipo') as string,
    numeroCa: (formData.get('numeroCa') as string) || null,
    validade,
    funcionarioNome: formData.get('funcionarioNome') as string,
    dataEntrega: formData.get('dataEntrega') as string,
    status,
    atualizadoEm: new Date(),
  }).where(and(eq(epis.id, id), eq(epis.empresaId, usuario.empresaId)))
  revalidatePath('/epis')
}

export async function excluirEpi(id: string) {
  const usuario = await getUsuarioOuErro()
  await db.delete(epis).where(
    and(eq(epis.id, id), eq(epis.empresaId, usuario.empresaId))
  )
  revalidatePath('/epis')
}
