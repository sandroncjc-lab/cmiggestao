'use server'

import { db } from '@/app/db'
import { documentos } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioAtual } from '@/lib/server/getUsuario'

export async function criarDocumento(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await getUsuarioAtual()
    if (!usuario) return { success: false, error: 'Não autenticado' }

    const titulo = formData.get('titulo') as string
    const url = formData.get('url') as string
    if (!titulo) return { success: false, error: 'Campo Título é obrigatório' }
    if (!url) return { success: false, error: 'Campo URL é obrigatório' }

    await db.insert(documentos).values({
      titulo,
      tipo: formData.get('tipo') as 'contrato' | 'alvara' | 'planta' | 'relatorio' | 'outro',
      url,
      obraId: (formData.get('obraId') as string) || null,
      clienteId: (formData.get('clienteId') as string) || null,
      enviadoPorId: usuario.id,
    })
    revalidatePath('/documentos')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar documento'
    return { success: false, error: msg }
  }
}

export async function excluirDocumento(id: string) {
  await db.delete(documentos).where(eq(documentos.id, id))
  revalidatePath('/documentos')
}
