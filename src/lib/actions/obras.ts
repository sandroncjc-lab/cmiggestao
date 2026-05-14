'use server'

import { db } from '@/app/db'
import { obras, obrasEnderecos } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'

export async function criarObra(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const empresaId = await getEmpresaIdOuErro()
    const obraId = crypto.randomUUID()
    const nome = formData.get('nome') as string
    const clienteId = formData.get('clienteId') as string

    if (!nome) return { success: false, error: 'Campo Nome é obrigatório' }
    if (!clienteId) return { success: false, error: 'Campo Cliente é obrigatório' }

    await db.insert(obras).values({
      id: obraId,
      nome,
      descricao: (formData.get('descricao') as string) || null,
      status: (formData.get('status') as 'planejada' | 'em_andamento' | 'pausada' | 'concluida') ?? 'planejada',
      dataInicio: (formData.get('dataInicio') as string) || null,
      dataFim: (formData.get('dataFim') as string) || null,
      clienteId,
      aprovadorClienteId: (formData.get('aprovadorClienteId') as string) || null,
      responsavelInternoId: (formData.get('responsavelInternoId') as string) || null,
      empresaId,
    })

    const logradouro = formData.get('logradouro') as string
    if (logradouro) {
      await db.insert(obrasEnderecos).values({
        obraId,
        logradouro,
        numero: (formData.get('numero') as string) || null,
        complemento: (formData.get('complemento') as string) || null,
        bairro: (formData.get('bairro') as string) || null,
        cidade: (formData.get('cidade') as string) || null,
        estado: (formData.get('estado') as string) || null,
        cep: (formData.get('cep') as string) || null,
      })
    }

    revalidatePath('/obras')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar obra'
    return { success: false, error: msg }
  }
}

export async function atualizarStatusObra(
  id: string,
  status: 'planejada' | 'em_andamento' | 'pausada' | 'concluida',
) {
  await db.update(obras).set({ status, atualizadoEm: new Date() }).where(eq(obras.id, id))
  revalidatePath('/obras')
  revalidatePath(`/obras/${id}`)
}

export async function excluirObra(id: string) {
  await db.delete(obras).where(eq(obras.id, id))
  revalidatePath('/obras')
}
