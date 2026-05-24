'use server'

import { db } from '@/app/db'
import { documentos, obras, clientes } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioOuErro } from '@/lib/server/getUsuario'

export async function criarDocumento(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await getUsuarioOuErro()

    const titulo = formData.get('titulo') as string
    const url = formData.get('url') as string
    const obraId = (formData.get('obraId') as string) || null
    const clienteId = (formData.get('clienteId') as string) || null

    if (!titulo) return { success: false, error: 'Campo Título é obrigatório' }
    if (!url) return { success: false, error: 'Campo URL é obrigatório' }

    // Verifica que obraId pertence à empresa do usuário
    if (obraId) {
      const [obraCheck] = await db
        .select({ id: obras.id })
        .from(obras)
        .where(and(eq(obras.id, obraId), eq(obras.empresaId, usuario.empresaId)))
        .limit(1)
      if (!obraCheck) return { success: false, error: 'Obra não encontrada ou acesso negado' }
    }

    // Verifica que clienteId pertence à empresa do usuário
    if (clienteId) {
      const [clienteCheck] = await db
        .select({ id: clientes.id })
        .from(clientes)
        .where(and(eq(clientes.id, clienteId), eq(clientes.empresaId, usuario.empresaId)))
        .limit(1)
      if (!clienteCheck) return { success: false, error: 'Cliente não encontrado ou acesso negado' }
    }

    await db.insert(documentos).values({
      titulo,
      tipo: formData.get('tipo') as 'contrato' | 'alvara' | 'planta' | 'relatorio' | 'outro',
      url,
      obraId,
      clienteId,
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
  const usuario = await getUsuarioOuErro()

  // Verifica ownership: documento deve ter sido enviado pelo mesmo usuário
  // OU pertencer a uma obra/cliente da empresa do usuário
  const [doc] = await db
    .select({ id: documentos.id, obraId: documentos.obraId, clienteId: documentos.clienteId, enviadoPorId: documentos.enviadoPorId })
    .from(documentos)
    .where(eq(documentos.id, id))
    .limit(1)

  if (!doc) return // não existe, nada a fazer

  // Verifica acesso via obra
  if (doc.obraId) {
    const [obraCheck] = await db
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.id, doc.obraId), eq(obras.empresaId, usuario.empresaId)))
      .limit(1)
    if (!obraCheck) throw new Error('Acesso negado')
  } else if (doc.clienteId) {
    // Verifica acesso via cliente
    const [clienteCheck] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, doc.clienteId), eq(clientes.empresaId, usuario.empresaId)))
      .limit(1)
    if (!clienteCheck) throw new Error('Acesso negado')
  } else {
    // Documento sem obra nem cliente: só quem enviou pode excluir
    if (doc.enviadoPorId !== usuario.id) throw new Error('Acesso negado')
  }

  await db.delete(documentos).where(eq(documentos.id, id))
  revalidatePath('/documentos')
}
