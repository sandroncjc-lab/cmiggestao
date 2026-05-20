// CORREÇÃO DE SEGURANÇA - Auditoria
'use server'

import { db } from '@/app/db'
import { rdo, rdoAtividades, rdoFuncionarios, rdoFotos, rdoServicos, notificacoes, obras, servicos } from '@/app/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'

export async function listarRdos() {
  const usuario = await getUsuarioAtual()
  if (!usuario) return []

  if (isCliente(usuario.funcao) && usuario.clienteId) {
    // aprovador_cliente: apenas obras do seu cliente
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

  // usuários internos: filtrar pela empresa — impede cross-tenant
  return db
    .select({ id: rdo.id, data: rdo.data, status: rdo.status, clima: rdo.clima, obraId: rdo.obraId, obraNome: obras.nome })
    .from(rdo)
    .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.empresaId, usuario.empresaId)))
    .orderBy(rdo.data)
}

export async function criarRdoCompleto(dados: {
  obraId: string
  data: string
  clima: 'ensolarado' | 'nublado' | 'chuvoso' | 'tempestade'
  atividades: { descricao: string; horaInicio?: string; horaFim?: string; observacoes?: string }[]
  funcionarios: { nome: string; funcao?: string; horas: string }[]
  fotos: string[]
  assinaturaInterna: string
}): Promise<{ success: boolean; error?: string; rdoId?: string }> {
  try {
    const usuario = await getUsuarioAtual()
    if (!usuario) return { success: false, error: 'Não autenticado' }

    const { obraId, data, clima, atividades, funcionarios, fotos, assinaturaInterna } = dados

    if (!obraId) return { success: false, error: 'Campo Obra é obrigatório' }
    if (!data) return { success: false, error: 'Campo Data é obrigatório' }
    if (!clima) return { success: false, error: 'Campo Clima é obrigatório' }

    // verifica que a obra pertence à empresa do usuário
    const [obraCheck] = await db
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.id, obraId), eq(obras.empresaId, usuario.empresaId)))
      .limit(1)
    if (!obraCheck) return { success: false, error: 'Obra não encontrada ou acesso negado' }

    const rdoId = crypto.randomUUID()

    await db.insert(rdo).values({
      id: rdoId,
      obraId,
      data,
      criadoPorId: usuario.id,
      clima,
      status: 'rascunho',
      assinaturaInterna: assinaturaInterna || null,
    })

    if (atividades.length > 0) {
      await db.insert(rdoAtividades).values(
        atividades
          .filter((a) => a.descricao.trim())
          .map((a) => ({
            rdoId,
            descricao: a.descricao,
            horaInicio: a.horaInicio || null,
            horaFim: a.horaFim || null,
            observacoes: a.observacoes || null,
          }))
      )
    }

    if (funcionarios.length > 0) {
      await db.insert(rdoFuncionarios).values(
        funcionarios
          .filter((f) => f.nome.trim())
          .map((f) => ({
            rdoId,
            nomeFuncionario: f.nome,
            funcao: f.funcao || null,
            horasTrabalhadas: f.horas || '0',
          }))
      )
    }

    if (fotos.length > 0) {
      await db.insert(rdoFotos).values(
        fotos.map((url) => ({
          rdoId,
          url,
          enviadoPorId: usuario.id,
          tiradaEm: new Date(),
        }))
      )
    }

    if (assinaturaInterna) {
      await db.update(rdo).set({ status: 'pendente_aprovacao', atualizadoEm: new Date() }).where(eq(rdo.id, rdoId))

      const [obraData] = await db
        .select({ aprovadorClienteId: obras.aprovadorClienteId, nome: obras.nome })
        .from(obras)
        .where(eq(obras.id, obraId))
        .limit(1)

      if (obraData?.aprovadorClienteId) {
        await db.insert(notificacoes).values({
          usuarioId: obraData.aprovadorClienteId,
          titulo: 'RDO aguardando sua aprovação',
          mensagem: `Um novo RDO da obra "${obraData.nome}" de ${data} foi enviado para sua aprovação.`,
          tipo: 'rdo_pendente',
          referenciaId: rdoId,
          tabelaReferencia: 'rdo',
        })
      }
    }

    revalidatePath('/rdo')
    return { success: true, rdoId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar RDO'
    return { success: false, error: msg }
  }
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

    // verifica que a obra pertence à empresa do usuário
    const [obraCheck] = await db
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.id, obraId), eq(obras.empresaId, usuario.empresaId)))
      .limit(1)
    if (!obraCheck) return { success: false, error: 'Obra não encontrada ou acesso negado' }

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
