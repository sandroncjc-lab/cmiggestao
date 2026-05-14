'use server'

import { db } from '@/app/db'
import { rdo, rdoAtividades, rdoFuncionarios, rdoFotos, notificacoes, obras } from '@/app/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'

export async function listarRdos() {
  const usuario = await getUsuarioAtual()
  if (!usuario) return []

  if (isCliente(usuario.funcao) && usuario.clienteId) {
    // busca apenas obras do cliente
    const obrasDoCliente = await db
      .select({ id: obras.id })
      .from(obras)
      .where(eq(obras.clienteId, usuario.clienteId))
    const obraIds = obrasDoCliente.map((o) => o.id)
    if (obraIds.length === 0) return []
    return db
      .select({ id: rdo.id, data: rdo.data, status: rdo.status, clima: rdo.clima, obraId: rdo.obraId, obraNome: obras.nome })
      .from(rdo)
      .leftJoin(obras, eq(rdo.obraId, obras.id))
      .where(inArray(rdo.obraId, obraIds))
      .orderBy(rdo.data)
  }

  return db
    .select({ id: rdo.id, data: rdo.data, status: rdo.status, clima: rdo.clima, obraId: rdo.obraId, obraNome: obras.nome })
    .from(rdo)
    .leftJoin(obras, eq(rdo.obraId, obras.id))
    .orderBy(rdo.data)
}

export async function criarRdo(
  _prevState: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string; rdoId?: string }> {
  try {
    const usuario = await getUsuarioAtual()
    if (!usuario) return { success: false, error: 'Não autenticado' }

    const obraId = formData.get('obraId') as string
    const data = formData.get('data') as string
    const clima = formData.get('clima') as 'ensolarado' | 'nublado' | 'chuvoso' | 'tempestade'

    if (!obraId) return { success: false, error: 'Campo Obra é obrigatório' }
    if (!data) return { success: false, error: 'Campo Data é obrigatório' }
    if (!clima) return { success: false, error: 'Campo Clima é obrigatório' }

    const rdoId = crypto.randomUUID()
    await db.insert(rdo).values({
      id: rdoId,
      obraId,
      data,
      criadoPorId: usuario.id,
      clima,
      status: 'rascunho',
    })
    revalidatePath('/rdo')
    return { success: true, rdoId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar RDO'
    return { success: false, error: msg }
  }
}

export async function adicionarFotosRdo(rdoId: string, urls: string[], legenda?: string) {
  const usuario = await getUsuarioAtual()
  if (!usuario) return

  await db.insert(rdoFotos).values(
    urls.map((url) => ({
      rdoId,
      url,
      legenda: legenda ?? null,
      enviadoPorId: usuario.id,
      tiradaEm: new Date(),
    }))
  )
  revalidatePath(`/rdo/${rdoId}`)
}

export async function enviarRdoParaAprovacao(id: string, assinaturaInterna: string) {
  await db.update(rdo).set({
    status: 'pendente_aprovacao',
    assinaturaInterna,
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  // notifica o aprovador do cliente da obra
  const [rdoData] = await db
    .select({ obraId: rdo.obraId, data: rdo.data })
    .from(rdo)
    .where(eq(rdo.id, id))
    .limit(1)

  if (rdoData) {
    const [obraData] = await db
      .select({ aprovadorClienteId: obras.aprovadorClienteId, nome: obras.nome })
      .from(obras)
      .where(eq(obras.id, rdoData.obraId))
      .limit(1)

    if (obraData?.aprovadorClienteId) {
      await db.insert(notificacoes).values({
        usuarioId: obraData.aprovadorClienteId,
        titulo: 'RDO aguardando sua aprovação',
        mensagem: `Um novo RDO da obra "${obraData.nome}" de ${rdoData.data} foi enviado para sua aprovação.`,
        tipo: 'rdo_pendente',
        referenciaId: id,
        tabelaReferencia: 'rdo',
      })
    }
  }

  revalidatePath('/rdo')
  revalidatePath(`/rdo/${id}`)
}

export async function aprovarRdo(id: string, assinaturaCliente: string) {
  const usuario = await getUsuarioAtual()
  if (!usuario) throw new Error('Não autenticado')

  await db.update(rdo).set({
    status: 'aprovado',
    assinaturaCliente,
    aprovadoPorId: usuario.id,
    aprovadoEm: new Date(),
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  const [rdoData] = await db.select().from(rdo).where(eq(rdo.id, id)).limit(1)
  if (rdoData) {
    await db.insert(notificacoes).values({
      usuarioId: rdoData.criadoPorId,
      titulo: 'RDO Aprovado',
      mensagem: `Seu RDO de ${rdoData.data} foi aprovado.`,
      tipo: 'rdo_aprovado',
      referenciaId: id,
      tabelaReferencia: 'rdo',
    })
  }
  revalidatePath('/rdo')
  revalidatePath(`/rdo/${id}`)
}

export async function rejeitarRdo(id: string, motivoRejeicao: string) {
  const [rdoData] = await db.select().from(rdo).where(eq(rdo.id, id)).limit(1)
  await db.update(rdo).set({
    status: 'rejeitado',
    motivoRejeicao,
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  if (rdoData) {
    await db.insert(notificacoes).values({
      usuarioId: rdoData.criadoPorId,
      titulo: 'RDO Rejeitado',
      mensagem: `Seu RDO de ${rdoData.data} foi rejeitado. Motivo: ${motivoRejeicao}`,
      tipo: 'rdo_rejeitado',
      referenciaId: id,
      tabelaReferencia: 'rdo',
    })
  }
  revalidatePath('/rdo')
  revalidatePath(`/rdo/${id}`)
}
