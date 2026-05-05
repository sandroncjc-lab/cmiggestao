'use server'

import { db } from '@/app/db'
import { servicos } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function criarServico(formData: FormData) {
  const obraId = formData.get('obraId') as string
  await db.insert(servicos).values({
    nome: formData.get('nome') as string,
    descricao: formData.get('descricao') as string || null,
    unidade: formData.get('unidade') as string,
    precoUnitario: formData.get('precoUnitario') as string,
    status: 'pendente',
    obraId,
  })
  revalidatePath(`/obras/${obraId}`)
}

export async function atualizarServico(id: string, obraId: string, formData: FormData) {
  await db.update(servicos).set({
    nome: formData.get('nome') as string,
    descricao: formData.get('descricao') as string || null,
    unidade: formData.get('unidade') as string,
    precoUnitario: formData.get('precoUnitario') as string,
    status: formData.get('status') as 'pendente' | 'em_andamento' | 'concluido',
    atualizadoEm: new Date(),
  }).where(eq(servicos.id, id))
  revalidatePath(`/obras/${obraId}`)
}

export async function excluirServico(id: string, obraId: string) {
  await db.delete(servicos).where(eq(servicos.id, id))
  revalidatePath(`/obras/${obraId}`)
}
