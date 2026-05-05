'use server'

import { db } from '@/app/db'
import { documentos } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function criarDocumento(formData: FormData) {
  await db.insert(documentos).values({
    titulo: formData.get('titulo') as string,
    tipo: formData.get('tipo') as 'contrato' | 'alvara' | 'planta' | 'relatorio' | 'outro',
    url: formData.get('url') as string,
    obraId: formData.get('obraId') as string || null,
    clienteId: formData.get('clienteId') as string || null,
    enviadoPorId: formData.get('enviadoPorId') as string,
  })
  revalidatePath('/documentos')
}

export async function excluirDocumento(id: string) {
  await db.delete(documentos).where(eq(documentos.id, id))
  revalidatePath('/documentos')
}
