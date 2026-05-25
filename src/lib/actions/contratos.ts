// CORREÇÃO DE SEGURANÇA - Auditoria
'use server'

import { db } from '@/app/db'
import { contratos, clientes } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getEmpresaIdOuErro } from '@/lib/server/getUsuario'
import { verificarOwnershipContrato } from '@/lib/auth/ownership'

export async function criarContrato(formData: FormData) {
  const empresaId = await getEmpresaIdOuErro()

  const clienteId = formData.get('clienteId') as string

  // verifica que o cliente pertence à empresa do usuário
  const [clienteCheck] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(and(eq(clientes.id, clienteId), eq(clientes.empresaId, empresaId)))
    .limit(1)
  if (!clienteCheck) throw new Error('Acesso negado: cliente não pertence à sua empresa')

  const data = {
    numero: formData.get('numero') as string,
    clienteId,
    obraId: (formData.get('obraId') as string) || null,
    valorTotal: formData.get('valorTotal') as string,
    dataInicio: formData.get('dataInicio') as string,
    dataFim: (formData.get('dataFim') as string) || null,
    status: (formData.get('status') as 'rascunho' | 'ativo' | 'suspenso' | 'encerrado') ?? 'rascunho',
    tipo: (formData.get('tipo') as 'homem_hora' | 'valor_fechado') ?? 'valor_fechado',
    urlPdf: (formData.get('urlPdf') as string) || null,
    observacoes: (formData.get('observacoes') as string) || null,
  }
  if (!data.numero || !data.clienteId || !data.valorTotal || !data.dataInicio) throw new Error('Campos obrigatórios faltando')
  await db.insert(contratos).values(data)
  revalidatePath('/contratos')
}

export async function atualizarContrato(id: string, formData: FormData) {
  const empresaId = await getEmpresaIdOuErro()

  await verificarOwnershipContrato(id, empresaId)

  const data = {
    numero: formData.get('numero') as string,
    valorTotal: formData.get('valorTotal') as string,
    dataFim: (formData.get('dataFim') as string) || null,
    status: formData.get('status') as 'rascunho' | 'ativo' | 'suspenso' | 'encerrado',
    tipo: (formData.get('tipo') as 'homem_hora' | 'valor_fechado') ?? 'valor_fechado',
    percentualExecucao: (formData.get('percentualExecucao') as string) || '0',
    urlPdf: (formData.get('urlPdf') as string) || null,
    observacoes: (formData.get('observacoes') as string) || null,
    atualizadoEm: new Date(),
  }
  await db.update(contratos).set(data).where(eq(contratos.id, id))
  revalidatePath('/contratos')
  revalidatePath(`/contratos/${id}`)
}

export async function excluirContrato(id: string) {
  const empresaId = await getEmpresaIdOuErro()

  await verificarOwnershipContrato(id, empresaId)

  await db.delete(contratos).where(eq(contratos.id, id))
  revalidatePath('/contratos')
}
