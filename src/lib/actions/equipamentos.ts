'use server'

import { db } from '@/app/db'
import { equipamentos, equipamentoMovimentacoes } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function criarEquipamento(formData: FormData) {
  await db.insert(equipamentos).values({
    nome: formData.get('nome') as string,
    tipo: formData.get('tipo') as string || null,
    numeroSerie: formData.get('numeroSerie') as string || null,
    status: 'disponivel',
  })
  revalidatePath('/equipamentos')
}

export async function moverEquipamento(formData: FormData) {
  const equipamentoId = formData.get('equipamentoId') as string
  const tipo = formData.get('tipo') as 'entrada' | 'saida'
  const obraId = formData.get('obraId') as string || null

  await db.insert(equipamentoMovimentacoes).values({
    equipamentoId,
    tipo,
    obraId,
    responsavelId: formData.get('responsavelId') as string || null,
    data: formData.get('data') as string,
    observacoes: formData.get('observacoes') as string || null,
  })

  const novoStatus = tipo === 'saida' ? 'em_uso' : 'disponivel'
  await db.update(equipamentos).set({
    status: novoStatus,
    obraId: tipo === 'saida' ? obraId : null,
    atualizadoEm: new Date(),
  }).where(eq(equipamentos.id, equipamentoId))

  revalidatePath('/equipamentos')
}

export async function atualizarEquipamento(id: string, formData: FormData) {
  await db.update(equipamentos).set({
    nome: formData.get('nome') as string,
    tipo: formData.get('tipo') as string || null,
    numeroSerie: formData.get('numeroSerie') as string || null,
    status: formData.get('status') as 'disponivel' | 'em_uso' | 'manutencao',
    atualizadoEm: new Date(),
  }).where(eq(equipamentos.id, id))
  revalidatePath('/equipamentos')
}

export async function excluirEquipamento(id: string) {
  await db.delete(equipamentos).where(eq(equipamentos.id, id))
  revalidatePath('/equipamentos')
}
