'use server'

import { db } from '@/app/db'
import { contratos } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function criarContrato(formData: FormData) {
  const data = {
    numero: formData.get('numero') as string,
    clienteId: formData.get('clienteId') as string,
    obraId: formData.get('obraId') as string || null,
    valorTotal: formData.get('valorTotal') as string,
    dataInicio: formData.get('dataInicio') as string,
    dataFim: formData.get('dataFim') as string || null,
    status: (formData.get('status') as 'rascunho' | 'ativo' | 'suspenso' | 'encerrado') ?? 'rascunho',
    urlPdf: formData.get('urlPdf') as string || null,
    observacoes: formData.get('observacoes') as string || null,
  }
  if (!data.numero || !data.clienteId || !data.valorTotal || !data.dataInicio) throw new Error('Campos obrigatórios faltando')
  await db.insert(contratos).values(data)
  revalidatePath('/contratos')
}

export async function atualizarContrato(id: string, formData: FormData) {
  const data = {
    numero: formData.get('numero') as string,
    valorTotal: formData.get('valorTotal') as string,
    dataFim: formData.get('dataFim') as string || null,
    status: formData.get('status') as 'rascunho' | 'ativo' | 'suspenso' | 'encerrado',
    percentualExecucao: formData.get('percentualExecucao') as string || '0',
    urlPdf: formData.get('urlPdf') as string || null,
    observacoes: formData.get('observacoes') as string || null,
    atualizadoEm: new Date(),
  }
  await db.update(contratos).set(data).where(eq(contratos.id, id))
  revalidatePath('/contratos')
  revalidatePath(`/contratos/${id}`)
}

export async function excluirContrato(id: string) {
  await db.delete(contratos).where(eq(contratos.id, id))
  revalidatePath('/contratos')
}
