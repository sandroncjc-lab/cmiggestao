'use server'

import { db } from '@/app/db'
import { obras, obrasEnderecos, usuarios, clientes, obraResponsaveis } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getEmpresaIdOuErro, getUsuarioAtual } from '@/lib/server/getUsuario'
import { verificarOwnershipObra } from '@/lib/auth/ownership'
import { clerkClient } from '@clerk/nextjs/server'

/**
 * Cria aprovador via convite Clerk (sem senha manual).
 * O cliente recebe email e define a própria senha.
 * Mantém a mesma assinatura do antigo criarAprovadorInline para não quebrar ObraForm.
 */
export async function criarAprovadorInline(
  clienteId: string,
  nome: string,
  email: string,
  _senha: string, // ignorado — não usamos mais senha manual
): Promise<{ success: boolean; aprovador?: { id: string; nome: string; email: string }; error?: string }> {
  if (!nome || !email || !clienteId) {
    return { success: false, error: 'Nome e email são obrigatórios' }
  }

  const empresaId = await getEmpresaIdOuErro()

  const [clienteRow] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.empresaId, empresaId)))
    .limit(1)
  if (!clienteRow) return { success: false, error: 'Cliente não pertence à sua empresa' }

  // Já existe usuário com esse email?
  const [existente] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1)
  if (existente) {
    return { success: false, error: 'Este email já possui acesso ou convite pendente no sistema.' }
  }

  const clerk = await clerkClient()
  try {
    await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/sign-in`,
      publicMetadata: { role: 'aprovador_cliente' },
      notify: true,
    })
  } catch (err: unknown) {
    const e = err as any
    const code: string = e?.errors?.[0]?.code ?? ''
    if (e?.status === 422 || code === 'duplicate_record' || code === 'form_identifier_exists') {
      return { success: false, error: 'Este email já possui acesso ou convite pendente no sistema.' }
    }
    return { success: false, error: 'Erro ao enviar convite. Tente novamente.' }
  }

  const [inserido] = await db
    .insert(usuarios)
    .values({ clerkId: null, nome, email, funcao: 'aprovador_cliente', empresaId, clienteId })
    .returning({ id: usuarios.id, nome: usuarios.nome, email: usuarios.email })

  return { success: true, aprovador: inserido }
}

export async function criarObra(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await getUsuarioAtual()
    if (!usuario) return { success: false, error: 'Usuário não autenticado' }
    const { empresaId } = usuario
    const obraId = crypto.randomUUID()
    const nome = formData.get('nome') as string
    const clienteId = formData.get('clienteId') as string
    const aprovadorClienteId = (formData.get('aprovadorClienteId') as string) || null

    if (!nome) return { success: false, error: 'Campo Nome é obrigatório' }
    if (!clienteId) return { success: false, error: 'Campo Cliente é obrigatório' }

    // Garante que clienteId pertence à empresa do usuário
    const [clienteCheck] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.empresaId, empresaId)))
      .limit(1)
    if (!clienteCheck) return { success: false, error: 'Cliente não pertence à sua empresa' }

    // Garante que aprovadorClienteId pertence à empresa (se informado)
    const responsavelInternoId = (formData.get('responsavelInternoId') as string) || null
    if (aprovadorClienteId) {
      const [apCheck] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(and(eq(usuarios.id, aprovadorClienteId), eq(usuarios.empresaId, empresaId)))
        .limit(1)
      if (!apCheck) return { success: false, error: 'Aprovador não pertence à sua empresa' }
    }
    if (responsavelInternoId) {
      const [respCheck] = await db
        .select({ id: usuarios.id })
        .from(usuarios)
        .where(and(eq(usuarios.id, responsavelInternoId), eq(usuarios.empresaId, empresaId)))
        .limit(1)
      if (!respCheck) return { success: false, error: 'Responsável interno não pertence à sua empresa' }
    }

    await db.insert(obras).values({
      id: obraId,
      nome,
      descricao: (formData.get('descricao') as string) || null,
      status: (formData.get('status') as 'planejada' | 'em_andamento' | 'pausada' | 'concluida') ?? 'planejada',
      dataInicio: (formData.get('dataInicio') as string) || null,
      dataFim: (formData.get('dataFim') as string) || null,
      clienteId,
      aprovadorClienteId,
      responsavelInternoId,
      empresaId,
    })

    // Auto-atribuição: encarregado que cria vira responsável; aprovador selecionado também
    if (usuario.funcao === 'encarregado') {
      await db.insert(obraResponsaveis).values({ obraId, usuarioId: usuario.id, papel: 'encarregado' })
    }
    if (aprovadorClienteId) {
      await db.insert(obraResponsaveis).values({ obraId, usuarioId: aprovadorClienteId, papel: 'aprovador' })
    }

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
