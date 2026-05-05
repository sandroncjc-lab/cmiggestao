'use server'

import { db } from '@/app/db'
import { obras, obrasEnderecos } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function criarObra(formData: FormData) {
  const obraId = crypto.randomUUID()
  const data = {
    id: obraId,
    nome: formData.get('nome') as string,
    descricao: formData.get('descricao') as string || null,
    status: (formData.get('status') as 'planejada' | 'em_andamento' | 'pausada' | 'concluida') ?? 'planejada',
    dataInicio: formData.get('dataInicio') as string || null,
    dataFim: formData.get('dataFim') as string || null,
    clienteId: formData.get('clienteId') as string,
    aprovadorClienteId: formData.get('aprovadorClienteId') as string || null,
    responsavelInternoId: formData.get('responsavelInternoId') as string || null,
    empresaId: formData.get('empresaId') as string,
  }
  if (!data.nome || !data.clienteId || !data.empresaId) throw new Error('Campos obrigatórios faltando')

  await db.insert(obras).values(data)

  const logradouro = formData.get('logradouro') as string
  if (logradouro) {
    await db.insert(obrasEnderecos).values({
      obraId,
      logradouro,
      numero: formData.get('numero') as string || null,
      complemento: formData.get('complemento') as string || null,
      bairro: formData.get('bairro') as string || null,
      cidade: formData.get('cidade') as string || null,
      estado: formData.get('estado') as string || null,
      cep: formData.get('cep') as string || null,
    })
  }

  revalidatePath('/obras')
}

export async function atualizarStatusObra(id: string, status: 'planejada' | 'em_andamento' | 'pausada' | 'concluida') {
  await db.update(obras).set({ status, atualizadoEm: new Date() }).where(eq(obras.id, id))
  revalidatePath('/obras')
  revalidatePath(`/obras/${id}`)
}

export async function excluirObra(id: string) {
  await db.delete(obras).where(eq(obras.id, id))
  revalidatePath('/obras')
}
