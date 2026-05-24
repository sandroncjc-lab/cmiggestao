'use server'

import { db } from '@/app/db'
import { usuarios } from '@/app/db/schema'
import { revalidatePath } from 'next/cache'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { clerkClient } from '@clerk/nextjs/server'

type FuncaoInterna = 'admin' | 'engenheiro' | 'encarregado'

export async function criarUsuarioInterno(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  try {
    const empresaId = await getEmpresaIdOuErro()

    const nome = (formData.get('nome') as string)?.trim()
    const email = (formData.get('email') as string)?.trim()
    const senha = (formData.get('senha') as string)
    const funcao = (formData.get('funcao') as FuncaoInterna)

    if (!nome || !email || !senha || !funcao) {
      return { success: false, error: 'Todos os campos são obrigatórios' }
    }
    if (senha.length < 8) {
      return { success: false, error: 'A senha deve ter pelo menos 8 caracteres' }
    }
    if (!['admin', 'engenheiro', 'encarregado'].includes(funcao)) {
      return { success: false, error: 'Função inválida' }
    }

    const clerk = await clerkClient()
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: senha,
      firstName: nome,
    })

    await db.insert(usuarios).values({
      clerkId: clerkUser.id,
      nome,
      email,
      funcao,
      empresaId,
    })

    revalidatePath('/usuarios')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar usuário'
    return { success: false, error: msg }
  }
}
