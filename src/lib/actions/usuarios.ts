'use server'

import { db } from '@/app/db'
import { usuarios, empresas } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getEmpresaIdOuErro, getUsuarioOuErro } from '@/lib/server/getUsuario'
import { clerkClient } from '@clerk/nextjs/server'

type FuncaoInterna = 'admin' | 'engenheiro' | 'encarregado' | 'aprovador_cliente'

export async function criarUsuarioInterno(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
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

  let clerkUserId: string | null = null
  try {
    const clerk = await clerkClient()
    const clerkUser = await clerk.users.createUser({
      emailAddress: [email],
      password: senha,
      firstName: nome,
    })
    clerkUserId = clerkUser.id

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
    // Rollback: remove usuário do Clerk se o insert no banco falhou
    if (clerkUserId) {
      try {
        const clerk = await clerkClient()
        await clerk.users.deleteUser(clerkUserId)
      } catch {
        console.error('[rollback] falha ao deletar usuário órfão no Clerk:', clerkUserId)
      }
    }
    const msg = err instanceof Error ? err.message : 'Erro ao criar usuário'
    return { success: false, error: msg }
  }
}

export async function carregarUsuarioParaEdicao(id: string) {
  const admin = await getUsuarioOuErro()
  if (admin.funcao !== 'admin' && admin.funcao !== 'engenheiro') {
    throw new Error('Acesso negado')
  }
  const [usuario] = await db
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      email: usuarios.email,
      funcao: usuarios.funcao,
      empresaId: usuarios.empresaId,
    })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1)

  if (!usuario) return null

  const todasEmpresas = await db.select({ id: empresas.id, nome: empresas.nome }).from(empresas)
  return { usuario, empresas: todasEmpresas }
}

export async function atualizarUsuario(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const admin = await getUsuarioOuErro()
  if (admin.funcao !== 'admin' && admin.funcao !== 'engenheiro') {
    return { success: false, error: 'Acesso negado' }
  }

  const id       = (formData.get('id') as string)?.trim()
  const nome     = (formData.get('nome') as string)?.trim()
  const funcao   = (formData.get('funcao') as FuncaoInterna)
  const empresaId = (formData.get('empresaId') as string)?.trim() || null

  if (!id || !nome || !funcao) {
    return { success: false, error: 'Campos obrigatórios ausentes' }
  }
  const funcoesValidas = ['admin', 'engenheiro', 'encarregado', 'aprovador_cliente']
  if (!funcoesValidas.includes(funcao)) {
    return { success: false, error: 'Função inválida' }
  }

  await db.update(usuarios).set({
    nome,
    funcao,
    empresaId: empresaId || null,
    atualizadoEm: new Date(),
  }).where(eq(usuarios.id, id))

  revalidatePath('/usuarios')
  return { success: true }
}
