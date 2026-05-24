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

// ─── helpers internos ────────────────────────────────────────────────────────

function traduzirErroClerk(err: unknown): string {
  const e = err as any
  const code: string = e?.errors?.[0]?.code ?? ''
  const msg: string = e?.errors?.[0]?.message ?? ''

  if (code === 'duplicate_record' || msg.includes('already')) {
    return 'Este email já possui acesso ou convite pendente no sistema.'
  }
  if (e?.status === 422) {
    return 'Este email já possui acesso ou convite pendente no sistema.'
  }
  if (code === 'form_identifier_exists') {
    return 'Este email já possui uma conta cadastrada.'
  }
  return 'Erro ao enviar convite de acesso. Tente novamente.'
}

/**
 * Envia convite Clerk e cria linha local em `usuarios` (clerkId = null).
 * O webhook /api/webhooks/clerk preencherá o clerkId quando o convite for aceito.
 * Idempotente: ignora silenciosamente se o email já tem acesso.
 */
async function convidarAprovador({
  clienteId,
  nome,
  email,
  empresaId,
}: {
  clienteId: string
  nome: string
  email: string
  empresaId: string
}): Promise<{ ok: boolean; error?: string }> {
  // Já existe usuário com esse email? Não duplica.
  const [existente] = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1)
  if (existente) return { ok: true }

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
    // Convite já existe ou email já tem conta → não é erro, apenas não duplica
    if (e?.status === 422 || code === 'duplicate_record' || code === 'form_identifier_exists') {
      // Linha local pode não existir ainda → cria sem clerkId para manter referência
    } else {
      return { ok: false, error: traduzirErroClerk(err) }
    }
  }

  // Cria linha local; clerkId null será preenchido pelo webhook user.created
  await db.insert(usuarios).values({
    clerkId: null,
    nome,
    email,
    funcao: 'aprovador_cliente',
    empresaId,
    clienteId,
  })

  return { ok: true }
}

// ─── mutations ───────────────────────────────────────────────────────────────

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

    const clienteId = crypto.randomUUID()
    await db.insert(clientes).values({
      id: clienteId,
      nome,
      documento: documento || null,
      email: email || null,
      telefone: telefone || null,
      endereco: endereco || null,
      empresaId,
    })

    // Convite automático se email foi fornecido
    if (email) {
      const convite = await convidarAprovador({ clienteId, nome, email, empresaId })
      if (!convite.ok) {
        // Cliente já foi salvo; avisa sobre o convite mas não falha o cadastro
        revalidatePath('/clientes')
        return {
          success: true,
          error: `Cliente salvo, mas não foi possível enviar o convite: ${convite.error}`,
        }
      }
    }

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
  await db.update(clientes).set(data).where(
    and(eq(clientes.id, id), eq(clientes.empresaId, empresaId))
  )
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
}

export async function excluirCliente(id: string) {
  const empresaId = await getEmpresaIdOuErro()
  await db.delete(clientes).where(
    and(eq(clientes.id, id), eq(clientes.empresaId, empresaId))
  )
  revalidatePath('/clientes')
}

/**
 * Reenvia o convite de acesso para o aprovador vinculado ao cliente.
 * Substitui o fluxo antigo de "Criar Aprovador com senha".
 */
export async function reenviarConvite(
  clienteId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const empresaId = await getEmpresaIdOuErro()

    // Verifica que o cliente pertence à empresa
    const [clienteRow] = await db
      .select({ id: clientes.id, nome: clientes.nome, email: clientes.email })
      .from(clientes)
      .where(and(eq(clientes.id, clienteId), eq(clientes.empresaId, empresaId)))
      .limit(1)
    if (!clienteRow) return { success: false, error: 'Cliente não encontrado' }
    if (!clienteRow.email) return { success: false, error: 'Este cliente não tem email cadastrado' }

    const clerk = await clerkClient()

    try {
      await clerk.invitations.createInvitation({
        emailAddress: clienteRow.email,
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
      return { success: false, error: traduzirErroClerk(err) }
    }

    // Garante que existe linha local para este email
    const [jaExiste] = await db
      .select({ id: usuarios.id })
      .from(usuarios)
      .where(eq(usuarios.email, clienteRow.email))
      .limit(1)

    if (!jaExiste) {
      await db.insert(usuarios).values({
        clerkId: null,
        nome: clienteRow.nome,
        email: clienteRow.email,
        funcao: 'aprovador_cliente',
        empresaId,
        clienteId,
      })
    }

    revalidatePath(`/clientes/${clienteId}`)
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao reenviar convite'
    return { success: false, error: msg }
  }
}
