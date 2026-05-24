'use server'

import { db } from '@/app/db'
import { rdo, rdoAtividades, rdoFuncionarios, rdoFotos, rdoServicos, notificacoes, obras } from '@/app/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioAtual, getUsuarioOuErro, isCliente } from '@/lib/server/getUsuario'
import { verificarOwnershipObra } from '@/lib/auth/ownership'

// ─── helpers internos ────────────────────────────────────────────────────────

/**
 * Verifica que o RDO pertence à empresa do usuário (usuários internos)
 * ou ao cliente do usuário (aprovador_cliente).
 * Lança erro se o acesso for negado.
 */
async function verificarOwnershipRdo(rdoId: string, usuario: { id: string; empresaId: string; funcao: string; clienteId: string | null }) {
  if (isCliente(usuario.funcao)) {
    // aprovador_cliente: RDO deve ser de uma obra do seu cliente
    if (!usuario.clienteId) throw new Error('Acesso negado')
    const [row] = await db
      .select({ id: rdo.id })
      .from(rdo)
      .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.clienteId, usuario.clienteId)))
      .where(eq(rdo.id, rdoId))
      .limit(1)
    if (!row) throw new Error('Acesso negado: RDO não pertence ao seu cliente')
    return row
  }
  // usuário interno: RDO deve ser de uma obra da sua empresa
  const [row] = await db
    .select({ id: rdo.id })
    .from(rdo)
    .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.empresaId, usuario.empresaId)))
    .where(eq(rdo.id, rdoId))
    .limit(1)
  if (!row) throw new Error('Acesso negado: RDO não pertence à sua empresa')
  return row
}

// ─── queries ─────────────────────────────────────────────────────────────────

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

// ─── mutations ───────────────────────────────────────────────────────────────

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
    const usuario = await getUsuarioOuErro()
    const { obraId, data, clima, atividades, funcionarios, fotos, assinaturaInterna } = dados

    if (!obraId) return { success: false, error: 'Campo Obra é obrigatório' }
    if (!data) return { success: false, error: 'Campo Data é obrigatório' }
    if (!clima) return { success: false, error: 'Campo Clima é obrigatório' }

    // verifica que a obra pertence à empresa do usuário
    await verificarOwnershipObra(obraId, usuario.empresaId)

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
      const rows = atividades.filter((a) => a.descricao.trim())
      if (rows.length > 0) {
        await db.insert(rdoAtividades).values(rows.map((a) => ({
          rdoId,
          descricao: a.descricao,
          horaInicio: a.horaInicio || null,
          horaFim: a.horaFim || null,
          observacoes: a.observacoes || null,
        })))
      }
    }

    if (funcionarios.length > 0) {
      const rows = funcionarios.filter((f) => f.nome.trim())
      if (rows.length > 0) {
        await db.insert(rdoFuncionarios).values(rows.map((f) => ({
          rdoId,
          nomeFuncionario: f.nome,
          funcao: f.funcao || null,
          horasTrabalhadas: f.horas || '0',
        })))
      }
    }

    if (fotos.length > 0) {
      await db.insert(rdoFotos).values(fotos.map((url) => ({
        rdoId,
        url,
        enviadoPorId: usuario.id,
        tiradaEm: new Date(),
      })))
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

export async function adicionarFotosRdo(rdoId: string, urls: string[], legenda?: string) {
  const usuario = await getUsuarioOuErro()
  // verifica ownership antes de inserir
  await verificarOwnershipRdo(rdoId, usuario)

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
  const usuario = await getUsuarioOuErro()
  // apenas usuários internos podem enviar para aprovação
  if (isCliente(usuario.funcao)) throw new Error('Acesso negado')
  await verificarOwnershipRdo(id, usuario)

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
  const usuario = await getUsuarioOuErro()
  // apenas aprovador_cliente pode aprovar
  if (!isCliente(usuario.funcao)) throw new Error('Acesso negado: somente o aprovador do cliente pode aprovar')
  // verifica que o RDO pertence ao seu cliente
  await verificarOwnershipRdo(id, usuario)

  await db.update(rdo).set({
    status: 'aprovado',
    assinaturaCliente,
    aprovadoPorId: usuario.id,
    aprovadoEm: new Date(),
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  const [rdoData] = await db.select({ criadoPorId: rdo.criadoPorId, data: rdo.data }).from(rdo).where(eq(rdo.id, id)).limit(1)
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
  const usuario = await getUsuarioOuErro()
  // apenas aprovador_cliente pode rejeitar
  if (!isCliente(usuario.funcao)) throw new Error('Acesso negado: somente o aprovador do cliente pode rejeitar')
  await verificarOwnershipRdo(id, usuario)

  const [rdoData] = await db.select({ criadoPorId: rdo.criadoPorId, data: rdo.data }).from(rdo).where(eq(rdo.id, id)).limit(1)

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
