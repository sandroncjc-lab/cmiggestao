// CORREÇÃO DE SEGURANÇA - Auditoria
'use server'

import { db } from '@/app/db'
import { servicos } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { verificarOwnershipObra } from '@/lib/auth/ownership'

export async function criarServico(formData: FormData) {
  const empresaId = await getEmpresaIdOuErro()
  const obraId = formData.get('obraId') as string

  await verificarOwnershipObra(obraId, empresaId)

  await db.insert(servicos).values({
    nome: formData.get('nome') as string,
    descricao: (formData.get('descricao') as string) || null,
    unidade: formData.get('unidade') as string,
    precoUnitario: formData.get('precoUnitario') as string,
    status: 'pendente',
    obraId,
  })
  revalidatePath(`/obras/${obraId}`)
}

export async function atualizarServico(id: string, obraId: string, formData: FormData) {
  const empresaId = await getEmpresaIdOuErro()

  await verificarOwnershipObra(obraId, empresaId)

  await db.update(servicos).set({
    nome: formData.get('nome') as string,
    descricao: (formData.get('descricao') as string) || null,
    unidade: formData.get('unidade') as string,
    precoUnitario: formData.get('precoUnitario') as string,
    status: formData.get('status') as 'pendente' | 'em_andamento' | 'concluido',
    atualizadoEm: new Date(),
  }).where(eq(servicos.id, id))
  revalidatePath(`/obras/${obraId}`)
}

export async function excluirServico(id: string, obraId: string) {
  const empresaId = await getEmpresaIdOuErro()

  await verificarOwnershipObra(obraId, empresaId)

  await db.delete(servicos).where(eq(servicos.id, id))
  revalidatePath(`/obras/${obraId}`)
}
