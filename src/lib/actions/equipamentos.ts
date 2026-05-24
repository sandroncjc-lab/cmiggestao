'use server'

import { db } from '@/app/db'
import { equipamentos, equipamentoMovimentacoes, obras } from '@/app/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioOuErro } from '@/lib/server/getUsuario'
import { verificarOwnershipObra } from '@/lib/auth/ownership'

export async function criarEquipamento(formData: FormData) {
  const usuario = await getUsuarioOuErro()
  await db.insert(equipamentos).values({
    nome: formData.get('nome') as string,
    tipo: (formData.get('tipo') as string) || null,
    numeroSerie: (formData.get('numeroSerie') as string) || null,
    status: 'disponivel',
    empresaId: usuario.empresaId,
  })
  revalidatePath('/equipamentos')
}

export async function moverEquipamento(formData: FormData) {
  const usuario = await getUsuarioOuErro()
  const equipamentoId = formData.get('equipamentoId') as string
  const tipo = formData.get('tipo') as 'entrada' | 'saida'
  const obraId = (formData.get('obraId') as string) || null

  // Verifica ownership do equipamento
  const [equip] = await db
    .select({ id: equipamentos.id })
    .from(equipamentos)
    .where(and(eq(equipamentos.id, equipamentoId), eq(equipamentos.empresaId, usuario.empresaId)))
    .limit(1)
  if (!equip) throw new Error('Acesso negado: equipamento não pertence à sua empresa')

  // Verifica ownership da obra destino (se informada)
  if (obraId) await verificarOwnershipObra(obraId, usuario.empresaId)

  await db.insert(equipamentoMovimentacoes).values({
    equipamentoId,
    tipo,
    obraId,
    responsavelId: (formData.get('responsavelId') as string) || null,
    data: formData.get('data') as string,
    observacoes: (formData.get('observacoes') as string) || null,
  })

  const novoStatus = tipo === 'saida' ? 'em_uso' : 'disponivel'
  await db.update(equipamentos).set({
    status: novoStatus,
    obraId: tipo === 'saida' ? obraId : null,
    atualizadoEm: new Date(),
  }).where(and(eq(equipamentos.id, equipamentoId), eq(equipamentos.empresaId, usuario.empresaId)))

  revalidatePath('/equipamentos')
}

export async function atualizarEquipamento(id: string, formData: FormData) {
  const usuario = await getUsuarioOuErro()
  await db.update(equipamentos).set({
    nome: formData.get('nome') as string,
    tipo: (formData.get('tipo') as string) || null,
    numeroSerie: (formData.get('numeroSerie') as string) || null,
    status: formData.get('status') as 'disponivel' | 'em_uso' | 'manutencao',
    atualizadoEm: new Date(),
  }).where(and(eq(equipamentos.id, id), eq(equipamentos.empresaId, usuario.empresaId)))
  revalidatePath('/equipamentos')
}

export async function excluirEquipamento(id: string) {
  const usuario = await getUsuarioOuErro()
  await db.delete(equipamentos).where(
    and(eq(equipamentos.id, id), eq(equipamentos.empresaId, usuario.empresaId))
  )
  revalidatePath('/equipamentos')
}
