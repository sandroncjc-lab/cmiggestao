// CORREÇÃO DE SEGURANÇA - Auditoria
'use server'

import { db } from '@/app/db'
import { obras, obrasEnderecos, usuarios } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { verificarOwnershipObra } from '@/lib/auth/ownership'
import { clerkClient } from '@clerk/nextjs/server'

export async function criarAprovadorInline(
  clienteId: string,
  nome: string,
  email: string,
  senha: string,
): Promise<{ success: boolean; aprovador?: { id: string; nome: string; email: string }; error?: string }> {
  try {
    const empresaId = await getEmpresaIdOuErro()

    if (!nome || !email || !senha || !clienteId) {
      return { success: false, error: 'Todos os campos são obrigatórios' }
    }
    if (senha.length < 8) {
      return { success: false, error: 'A senha deve ter pelo menos 8 caracteres' }
    }

    const clerk = await clerkClient()
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: senha,
      firstName: nome,
    })

    const [inserido] = await db
      .insert(usuarios)
      .values({
        clerkId: clerkUser.id,
        nome,
        email,
        funcao: 'aprovador_cliente',
        empresaId,
        clienteId,
      })
      .returning({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email })

    return { success: true, aprovador: inserido }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar aprovador'
    return { success: false, error: msg }
  }
}

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
  const empresaId = await getEmpresaIdOuErro()

  await verificarOwnershipObra(id, empresaId)

  await db.update(obras).set({ status, atualizadoEm: new Date() }).where(eq(obras.id, id))
  revalidatePath('/obras')
  revalidatePath(`/obras/${id}`)
}

export async function vincularAprovadorObra(
  obraId: string,
  aprovadorClienteId: string | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const empresaId = await getEmpresaIdOuErro()
    await verificarOwnershipObra(obraId, empresaId)
    await db.update(obras).set({ aprovadorClienteId, atualizadoEm: new Date() }).where(eq(obras.id, obraId))
    revalidatePath('/obras')
    revalidatePath(`/obras/${obraId}`)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao vincular aprovador' }
  }
}

export async function excluirObra(id: string) {
  const empresaId = await getEmpresaIdOuErro()

  await verificarOwnershipObra(id, empresaId)

  await db.delete(obras).where(and(eq(obras.id, id), eq(obras.empresaId, empresaId)))
  revalidatePath('/obras')
}
