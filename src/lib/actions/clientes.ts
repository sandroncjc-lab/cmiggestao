'use server'

import { db } from '@/app/db'
import { clientes, usuarios } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
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
  const data = {
    nome: formData.get('nome') as string,
    documento: (formData.get('documento') as string) || null,
    email: (formData.get('email') as string) || null,
    telefone: (formData.get('telefone') as string) || null,
    endereco: (formData.get('endereco') as string) || null,
    atualizadoEm: new Date(),
  }
  await db.update(clientes).set(data).where(eq(clientes.id, id))
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
}

export async function excluirCliente(id: string) {
  await db.delete(clientes).where(eq(clientes.id, id))
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

    // cria usuário no Clerk
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: senha,
      firstName: nome,
    })

    // cria registro local vinculado ao cliente
    await db.insert(usuarios).values({
      clerkId: clerkUser.id,
      nome,
      email,
      funcao: 'aprovador_cliente',
      empresaId,
      clienteId,
    })

    revalidatePath(`/clientes/${clienteId}`)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar acesso de aprovação'
    return { success: false, error: msg }
  }
}
