'use server'

import { db } from '@/app/db'
import { rdo, rdoAtividades, rdoFuncionarios, rdoServicos, notificacoes } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function criarRdo(formData: FormData) {
  const rdoId = crypto.randomUUID()
  await db.insert(rdo).values({
    id: rdoId,
    obraId: formData.get('obraId') as string,
    data: formData.get('data') as string,
    criadoPorId: formData.get('criadoPorId') as string,
    clima: formData.get('clima') as 'ensolarado' | 'nublado' | 'chuvoso' | 'tempestade',
    status: 'rascunho',
  })
  revalidatePath('/rdo')
  return rdoId
}

export async function enviarRdoParaAprovacao(id: string, assinaturaInterna: string) {
  await db.update(rdo).set({
    status: 'pendente_aprovacao',
    assinaturaInterna,
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))
  revalidatePath('/rdo')
  revalidatePath(`/rdo/${id}`)
}

export async function aprovarRdo(id: string, aprovadorId: string, assinaturaCliente: string) {
  await db.update(rdo).set({
    status: 'aprovado',
    assinaturaCliente,
    aprovadoPorId: aprovadorId,
    aprovadoEm: new Date(),
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  const rdoData = await db.select().from(rdo).where(eq(rdo.id, id)).limit(1)
  if (rdoData[0]) {
    await db.insert(notificacoes).values({
      usuarioId: rdoData[0].criadoPorId,
      titulo: 'RDO Aprovado',
      mensagem: `Seu RDO de ${rdoData[0].data} foi aprovado.`,
      tipo: 'rdo_aprovado',
      referenciaId: id,
      tabelaReferencia: 'rdo',
    })
  }
  revalidatePath('/rdo')
}

export async function rejeitarRdo(id: string, motivoRejeicao: string) {
  const rdoData = await db.select().from(rdo).where(eq(rdo.id, id)).limit(1)
  await db.update(rdo).set({
    status: 'rejeitado',
    motivoRejeicao,
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  if (rdoData[0]) {
    await db.insert(notificacoes).values({
      usuarioId: rdoData[0].criadoPorId,
      titulo: 'RDO Rejeitado',
      mensagem: `Seu RDO de ${rdoData[0].data} foi rejeitado. Motivo: ${motivoRejeicao}`,
      tipo: 'rdo_rejeitado',
      referenciaId: id,
      tabelaReferencia: 'rdo',
    })
  }
  revalidatePath('/rdo')
}
