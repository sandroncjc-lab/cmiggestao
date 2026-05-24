'use server'

import { db } from '@/app/db'
import { clientes, usuarios } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { clerkClient } from '@clerk/nextjs/server'

const clienteSchema = z.object({
  nome: z.string().min(1, 'Campo Nome é obrigatório'),
  documento: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
})

export async function criarCliente(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const empresaId = await getEmpresaIdOuErro()

    const parsed = clienteSchema.safeParse({
      nome: formData.get('nome') ?? '',
      documento: formData.get('documento') ?? '',
      email: formData.get('email') ?? '',
      telefone: formData.get('telefone') ?? '',
      endereco: formData.get('endereco') ?? '',
    })

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { nome, documento, email, telefone, endereco } = parsed.data

    await db.insert(clientes).values({
      nome,
      documento: documento || null,
      email: email || null,
      telefone: telefone || null,
      endereco: endereco || null,
      empresaId,
    })

    revalidatePath('/clientes')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar cliente'
    return { success: false, error: msg }
  }
}

export async function atualizarCliente(id: string, formData: FormData) {
  const empresaId = await getEmpresaIdOuErro()
  const data = {
    nome: formData.get('nome') as string,
    documento: (formData.get('documento') as string) || null,
    email: (formData.get('email') as string) || null,
    telefone: (formData.get('telefone') as string) || null,
    endereco: (formData.get('endereco') as string) || null,
    atualizadoEm: new Date(),
  }
  // garante que o cliente pertence à empresa do usuário logado
  await db.update(clientes).set(data).where(
    and(eq(clientes.id, id), eq(clientes.empresaId, empresaId))
  )
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
}

export async function excluirCliente(id: string) {
  const empresaId = await getEmpresaIdOuErro()
  // garante que o cliente pertence à empresa do usuário logado
  await db.delete(clientes).where(
    and(eq(clientes.id, id), eq(clientes.empresaId, empresaId))
  )
  revalidatePath('/clientes')
}

export async function criarUsuarioAprovador(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const empresaId = await getEmpresaIdOuErro()
    const clienteId = formData.get('clienteId') as string
    const nome = formData.get('nome') as string
    const email = formData.get('email') as string
    const senha = formData.get('senha') as string

    if (!nome || !email || !senha || !clienteId) {
      return { success: false, error: 'Todos os campos são obrigatórios' }
    }
    if (senha.length < 8) {
      return { success: false, error: 'A senha deve ter pelo menos 8 caracteres' }
    }

    // Garante que o clienteId pertence à empresa do usuário logado (isolamento multi-tenant)
    const [clienteCheck] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.empresaId, empresaId)))
      .limit(1)
    if (!clienteCheck) {
      return { success: false, error: 'Cliente não encontrado' }
    }

    const clerk = await clerkClient()

    // Cria usuário no Clerk primeiro; guarda o ID para rollback se o DB falhar
    let clerkUserId: string | null = null
    try {
      const clerkUser = await clerk.users.createUser({
        emailAddress: [email],
        password: senha,
        firstName: nome,
      })
      clerkUserId = clerkUser.id

      // Cria registro local vinculado ao cliente
      await db.insert(usuarios).values({
        clerkId: clerkUserId,
        nome,
        email,
        funcao: 'aprovador_cliente',
        empresaId,
        clienteId,
      })
    } catch (innerErr) {
      // Rollback: se o DB falhou mas o Clerk já criou o usuário, deletar para evitar órfão
      if (clerkUserId) {
        try {
          await clerk.users.deleteUser(clerkUserId)
        } catch {
          // ignora erro de cleanup — o usuário órfão deverá ser removido manualmente
          console.error('[rollback] falha ao deletar usuário órfão no Clerk:', clerkUserId)
        }
      }
      throw innerErr // re-lança para o catch externo formatar a mensagem
    }

    revalidatePath(`/clientes/${clienteId}`)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar acesso de aprovação'
    return { success: false, error: msg }
  }
}
