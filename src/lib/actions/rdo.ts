'use server'

import { db } from '@/app/db'
import { rdo, rdoAtividades, rdoFuncionarios, rdoFotos, rdoServicos, notificacoes, obras, usuarios, clientes, obraResponsaveis } from '@/app/db/schema'
import { and, eq, inArray, ne } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioAtual, getUsuarioOuErro, isCliente } from '@/lib/server/getUsuario'
import { verificarOwnershipObra } from '@/lib/auth/ownership'
import { randomBytes } from 'crypto'

// ─── helpers de permissão ─────────────────────────────────────────────────────

/** Retorna IDs das obras atribuídas ao usuário em `obraResponsaveis` */
async function getObrasAtribuidasIds(usuarioId: string): Promise<string[]> {
  const rows = await db
    .select({ obraId: obraResponsaveis.obraId })
    .from(obraResponsaveis)
    .where(eq(obraResponsaveis.usuarioId, usuarioId))
  return rows.map((r) => r.obraId)
}

/** Verifica se o usuário (encarregado/aprovador) está atribuído à obra */
async function assertAtribuicaoObra(usuarioId: string, obraId: string) {
  const [row] = await db
    .select({ id: obraResponsaveis.id })
    .from(obraResponsaveis)
    .where(and(eq(obraResponsaveis.usuarioId, usuarioId), eq(obraResponsaveis.obraId, obraId)))
    .limit(1)
  if (!row) throw new Error('Acesso negado: você não está atribuído a esta obra')
}

/** Verifica acesso ao RDO considerando o papel do usuário */
async function verificarOwnershipRdo(
  rdoId: string,
  usuario: { id: string; empresaId: string; funcao: string; clienteId: string | null },
) {
  if (isCliente(usuario.funcao)) {
    // Aprovador com clienteId (legado) OU atribuído via obraResponsaveis
    if (usuario.clienteId) {
      const [row] = await db
        .select({ id: rdo.id })
        .from(rdo)
        .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.clienteId, usuario.clienteId)))
        .where(eq(rdo.id, rdoId))
        .limit(1)
      if (row) return row
    }
    // Verifica via obraResponsaveis (sistema novo)
    const obraIds = await getObrasAtribuidasIds(usuario.id)
    if (obraIds.length > 0) {
      const [row] = await db
        .select({ id: rdo.id })
        .from(rdo)
        .where(and(eq(rdo.id, rdoId), inArray(rdo.obraId, obraIds)))
        .limit(1)
      if (row) return row
    }
    // Verifica via obras.aprovadorClienteId (sistema legado)
    const [rowLegado] = await db
      .select({ id: rdo.id })
      .from(rdo)
      .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.aprovadorClienteId, usuario.id)))
      .where(eq(rdo.id, rdoId))
      .limit(1)
    if (rowLegado) return rowLegado
    throw new Error('Acesso negado: RDO não pertence ao seu cliente/atribuição')
  }

  if (usuario.funcao === 'encarregado') {
    // Encarregado só vê RDOs de obras atribuídas a ele
    const obraIds = await getObrasAtribuidasIds(usuario.id)
    if (obraIds.length > 0) {
      const [row] = await db
        .select({ id: rdo.id })
        .from(rdo)
        .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.empresaId, usuario.empresaId)))
        .where(and(eq(rdo.id, rdoId), inArray(rdo.obraId, obraIds)))
        .limit(1)
      if (row) return row
    }
    throw new Error('Acesso negado: você não está atribuído a esta obra')
  }

  // Admin / engenheiro: acesso por empresaId
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

  if (isCliente(usuario.funcao)) {
    // Aprovador_cliente: por clienteId (legado) OU por obraResponsaveis
    let obraIds: string[] = []

    if (usuario.clienteId) {
      const obrasDoCliente = await db
        .select({ id: obras.id })
        .from(obras)
        .where(eq(obras.clienteId, usuario.clienteId))
      obraIds = obrasDoCliente.map((o) => o.id)
    } else {
      obraIds = await getObrasAtribuidasIds(usuario.id)
    }

    if (obraIds.length === 0) return []
    return db
      .select({ id: rdo.id, data: rdo.data, status: rdo.status, clima: rdo.clima, obraId: rdo.obraId, obraNome: obras.nome })
      .from(rdo)
      .leftJoin(obras, eq(rdo.obraId, obras.id))
      .where(inArray(rdo.obraId, obraIds))
      .orderBy(rdo.data)
  }

  if (usuario.funcao === 'encarregado') {
    // Encarregado: só obras atribuídas
    const obraIds = await getObrasAtribuidasIds(usuario.id)
    if (obraIds.length === 0) return []
    return db
      .select({ id: rdo.id, data: rdo.data, status: rdo.status, clima: rdo.clima, obraId: rdo.obraId, obraNome: obras.nome })
      .from(rdo)
      .innerJoin(obras, and(eq(rdo.obraId, obras.id), eq(obras.empresaId, usuario.empresaId)))
      .where(inArray(rdo.obraId, obraIds))
      .orderBy(rdo.data)
  }

  // Admin / engenheiro: tudo da empresa
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
  servicos: { servicoId: string; quantidade: number; observacoes?: string }[]
  fotos: string[]
  assinaturaInterna: string | null   // null = salvar como rascunho
}): Promise<{ success: boolean; error?: string; rdoId?: string }> {
  try {
    const usuario = await getUsuarioOuErro()
    const { obraId, data, clima, atividades, funcionarios, servicos, fotos, assinaturaInterna } = dados

    if (!obraId) return { success: false, error: 'Campo Obra é obrigatório' }
    if (!data)   return { success: false, error: 'Campo Data é obrigatório' }
    if (!clima)  return { success: false, error: 'Campo Clima é obrigatório' }

    await verificarOwnershipObra(obraId, usuario.empresaId)

    // ITEM B: encarregado só pode criar RDO de obras atribuídas
    if (usuario.funcao === 'encarregado') {
      await assertAtribuicaoObra(usuario.id, obraId)
    }

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

    const atividadesValidas = atividades.filter((a) => a.descricao.trim())
    if (atividadesValidas.length > 0) {
      await db.insert(rdoAtividades).values(atividadesValidas.map((a) => ({
        rdoId,
        descricao: a.descricao.trim(),
        horaInicio: a.horaInicio || null,
        horaFim: a.horaFim || null,
        observacoes: a.observacoes?.trim() || null,
      })))
    }

    const funcionariosValidos = funcionarios.filter((f) => f.nome.trim())
    if (funcionariosValidos.length > 0) {
      await db.insert(rdoFuncionarios).values(funcionariosValidos.map((f) => ({
        rdoId,
        nomeFuncionario: f.nome.trim(),
        funcao: f.funcao?.trim() || null,
        horasTrabalhadas: f.horas || '0',
      })))
    }

    const servicosValidos = servicos.filter((s) => s.servicoId && s.quantidade > 0)
    if (servicosValidos.length > 0) {
      await db.insert(rdoServicos).values(servicosValidos.map((s) => ({
        rdoId,
        servicoId: s.servicoId,
        quantidadeExecutada: String(s.quantidade),
        observacoes: s.observacoes?.trim() || null,
      })))
    }

    if (fotos.length > 0) {
      await db.insert(rdoFotos).values(fotos.map((url) => ({
        rdoId,
        url,
        enviadoPorId: usuario.id,
        tiradaEm: new Date(),
      })))
    }

    // Se há assinatura interna, move para pendente_aprovacao
    if (assinaturaInterna) {
      await db
        .update(rdo)
        .set({ status: 'pendente_aprovacao', atualizadoEm: new Date() })
        .where(eq(rdo.id, rdoId))

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
    revalidatePath('/hh')
    return { success: true, rdoId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao criar RDO'
    return { success: false, error: msg }
  }
}

export async function adicionarFotosRdo(rdoId: string, urls: string[], legenda?: string) {
  const usuario = await getUsuarioOuErro()
  await verificarOwnershipRdo(rdoId, usuario)

  await db.insert(rdoFotos).values(urls.map((url) => ({
    rdoId,
    url,
    legenda: legenda ?? null,
    enviadoPorId: usuario.id,
    tiradaEm: new Date(),
  })))
  revalidatePath(`/rdo/${rdoId}`)
}

export async function enviarRdoParaAprovacao(id: string, assinaturaInterna: string) {
  try {
  const usuario = await getUsuarioOuErro()
  if (isCliente(usuario.funcao)) throw new Error('Acesso negado')
  await verificarOwnershipRdo(id, usuario)

  const linkToken = randomBytes(32).toString('hex')
  const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  await db.update(rdo).set({
    status: 'pendente_aprovacao',
    assinaturaInterna,
    linkToken,
    tokenExpiresAt,
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  const [rdoRow] = await db
    .select({ obraId: rdo.obraId, data: rdo.data })
    .from(rdo).where(eq(rdo.id, id)).limit(1)

  if (rdoRow) {
    const [obraData] = await db
      .select({
        aprovadorClienteId: obras.aprovadorClienteId,
        nome: obras.nome,
        clienteId: obras.clienteId,
      })
      .from(obras)
      .where(eq(obras.id, rdoRow.obraId))
      .limit(1)

    if (obraData?.aprovadorClienteId) {
      await db.insert(notificacoes).values({
        usuarioId: obraData.aprovadorClienteId,
        titulo: 'RDO aguardando sua aprovação',
        mensagem: `Um novo RDO da obra "${obraData.nome}" de ${rdoRow.data} foi enviado para sua aprovação.`,
        tipo: 'rdo_pendente',
        referenciaId: id,
        tabelaReferencia: 'rdo',
      })
    }

    // Notifica também aprovadores via obraResponsaveis
    const aprovadoresObra = await db
      .select({ usuarioId: obraResponsaveis.usuarioId })
      .from(obraResponsaveis)
      .where(and(eq(obraResponsaveis.obraId, rdoRow.obraId), eq(obraResponsaveis.papel, 'aprovador')))

    for (const apr of aprovadoresObra) {
      if (apr.usuarioId === obraData?.aprovadorClienteId) continue // já notificado acima
      await db.insert(notificacoes).values({
        usuarioId: apr.usuarioId,
        titulo: 'RDO aguardando sua aprovação',
        mensagem: `RDO da obra "${obraData?.nome ?? ''}" de ${rdoRow.data} aguarda aprovação.`,
        tipo: 'rdo_pendente',
        referenciaId: id,
        tabelaReferencia: 'rdo',
      }).catch(() => {}) // ignora erros individuais
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cmiggestao.vercel.app'
    const linkAprovacao = `${appUrl}/aprovar/${linkToken}`

    if (process.env.RESEND_API_KEY && obraData?.clienteId) {
      try {
        const [clienteData] = await db
          .select({ email: clientes.email, nome: clientes.nome })
          .from(clientes).where(eq(clientes.id, obraData.clienteId)).limit(1)

        if (clienteData?.email) {
          const { Resend } = await import('resend')
          const resend = new Resend(process.env.RESEND_API_KEY)
          await resend.emails.send({
            from: 'CMI Gestão <noreply@cmiggestao.com.br>',
            to: clienteData.email,
            subject: `RDO aguardando aprovação — ${obraData.nome} (${rdoRow.data})`,
            html: emailAprovacaoHtml({
              clienteNome: clienteData.nome,
              obraNome: obraData.nome,
              data: String(rdoRow.data),
              link: linkAprovacao,
            }),
          })
        }
      } catch (e) {
        console.error('Erro ao enviar e-mail de aprovação:', e)
      }
    }
  }

  revalidatePath('/rdo')
  revalidatePath(`/rdo/${id}`)
  revalidatePath('/hh')
  return { success: true as const, linkToken }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao enviar RDO para aprovação'
    console.error('[enviarRdoParaAprovacao] Erro:', err)
    return { success: false as const, error: msg }
  }
}

// ─── ITEM C — Modo 2: Assinatura in loco COM conta ───────────────────────────

/** Aprovação in loco: o aprovador está fisicamente presente e assina no aparelho do encarregado */
export async function assinarInLocoComConta(
  rdoId: string,
  assinaturaCliente: string,
  aprovadorId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await getUsuarioOuErro()

    // Pode ser feito pelo encarregado/engenheiro/admin que está facilitando
    if (isCliente(usuario.funcao)) throw new Error('Acesso negado')
    await verificarOwnershipRdo(rdoId, usuario)

    // Garante que o aprovadorId é de um aprovador atribuído à obra
    const [rdoRow] = await db
      .select({ obraId: rdo.obraId })
      .from(rdo).where(eq(rdo.id, rdoId)).limit(1)

    if (!rdoRow) return { success: false, error: 'RDO não encontrado' }

    const [atribuicao] = await db
      .select({ id: obraResponsaveis.id })
      .from(obraResponsaveis)
      .where(and(
        eq(obraResponsaveis.obraId, rdoRow.obraId),
        eq(obraResponsaveis.usuarioId, aprovadorId),
        eq(obraResponsaveis.papel, 'aprovador'),
      ))
      .limit(1)

    if (!atribuicao) return { success: false, error: 'Aprovador não atribuído a esta obra' }

    await db.update(rdo).set({
      status: 'aprovado',
      assinaturaCliente,
      aprovadoPorId: aprovadorId,
      aprovadoEm: new Date(),
      linkToken: null,
      tokenExpiresAt: null,
      atualizadoEm: new Date(),
    }).where(eq(rdo.id, rdoId))

    const [rdoAtual] = await db.select({ criadoPorId: rdo.criadoPorId, data: rdo.data }).from(rdo).where(eq(rdo.id, rdoId)).limit(1)
    if (rdoAtual) {
      await db.insert(notificacoes).values({
        usuarioId: rdoAtual.criadoPorId,
        titulo: 'RDO Aprovado (in loco)',
        mensagem: `Seu RDO de ${rdoAtual.data} foi aprovado presencialmente.`,
        tipo: 'rdo_aprovado',
        referenciaId: rdoId,
        tabelaReferencia: 'rdo',
      })
    }

    revalidatePath('/rdo')
    revalidatePath(`/rdo/${rdoId}`)
    revalidatePath('/hh')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao registrar assinatura in loco'
    return { success: false, error: msg }
  }
}

// ─── ITEM C — Modo 3: Assinatura in loco SEM conta ───────────────────────────

export async function assinarInLocoSemConta(
  rdoId: string,
  dados: {
    nomeAssinante: string
    cargoAssinante: string
    assinaturaCliente: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const usuario = await getUsuarioOuErro()
    if (isCliente(usuario.funcao)) throw new Error('Acesso negado')
    await verificarOwnershipRdo(rdoId, usuario)

    if (!dados.nomeAssinante.trim()) return { success: false, error: 'Nome do assinante é obrigatório' }
    if (!dados.assinaturaCliente) return { success: false, error: 'Assinatura é obrigatória' }

    await db.update(rdo).set({
      status: 'aprovado',
      assinaturaCliente: dados.assinaturaCliente,
      nomeAssinanteExterno: dados.nomeAssinante.trim(),
      cargoAssinanteExterno: dados.cargoAssinante.trim() || null,
      aprovadoEm: new Date(),
      aprovadoPorId: null,
      linkToken: null,
      tokenExpiresAt: null,
      atualizadoEm: new Date(),
    }).where(eq(rdo.id, rdoId))

    const [rdoAtual] = await db.select({ criadoPorId: rdo.criadoPorId, data: rdo.data }).from(rdo).where(eq(rdo.id, rdoId)).limit(1)
    if (rdoAtual) {
      await db.insert(notificacoes).values({
        usuarioId: rdoAtual.criadoPorId,
        titulo: 'RDO Aprovado (in loco sem conta)',
        mensagem: `Seu RDO de ${rdoAtual.data} foi assinado presencialmente por ${dados.nomeAssinante}.`,
        tipo: 'rdo_aprovado',
        referenciaId: rdoId,
        tabelaReferencia: 'rdo',
      })
    }

    revalidatePath('/rdo')
    revalidatePath(`/rdo/${rdoId}`)
    revalidatePath('/hh')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao registrar assinatura'
    return { success: false, error: msg }
  }
}

// ─── Aprovação via conta do cliente (legado) ─────────────────────────────────

export async function aprovarRdo(id: string, assinaturaCliente: string) {
  const usuario = await getUsuarioOuErro()
  if (!isCliente(usuario.funcao)) throw new Error('Acesso negado: somente o aprovador do cliente pode aprovar')
  await verificarOwnershipRdo(id, usuario)

  await db.update(rdo).set({
    status: 'aprovado',
    assinaturaCliente,
    aprovadoPorId: usuario.id,
    aprovadoEm: new Date(),
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  const [rdoRow] = await db.select({ criadoPorId: rdo.criadoPorId, data: rdo.data }).from(rdo).where(eq(rdo.id, id)).limit(1)
  if (rdoRow) {
    await db.insert(notificacoes).values({
      usuarioId: rdoRow.criadoPorId,
      titulo: 'RDO Aprovado',
      mensagem: `Seu RDO de ${rdoRow.data} foi aprovado.`,
      tipo: 'rdo_aprovado',
      referenciaId: id,
      tabelaReferencia: 'rdo',
    })
  }
  revalidatePath('/rdo')
  revalidatePath(`/rdo/${id}`)
  revalidatePath('/hh')
}

export async function rejeitarRdo(id: string, motivoRejeicao: string) {
  const usuario = await getUsuarioOuErro()
  if (!isCliente(usuario.funcao)) throw new Error('Acesso negado: somente o aprovador do cliente pode rejeitar')
  await verificarOwnershipRdo(id, usuario)

  const [rdoRow] = await db.select({ criadoPorId: rdo.criadoPorId, data: rdo.data }).from(rdo).where(eq(rdo.id, id)).limit(1)

  await db.update(rdo).set({
    status: 'rejeitado',
    motivoRejeicao,
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, id))

  if (rdoRow) {
    await db.insert(notificacoes).values({
      usuarioId: rdoRow.criadoPorId,
      titulo: 'RDO Rejeitado',
      mensagem: `Seu RDO de ${rdoRow.data} foi rejeitado. Motivo: ${motivoRejeicao}`,
      tipo: 'rdo_rejeitado',
      referenciaId: id,
      tabelaReferencia: 'rdo',
    })
  }
  revalidatePath('/rdo')
  revalidatePath(`/rdo/${id}`)
  revalidatePath('/hh')
}

// ─── Aprovação remota por token (Modo 1 — sem login) ────────────────────────

export async function carregarRdoPorToken(token: string) {
  const [rdoRow] = await db
    .select({
      id: rdo.id,
      data: rdo.data,
      clima: rdo.clima,
      status: rdo.status,
      tokenExpiresAt: rdo.tokenExpiresAt,
      obraId: rdo.obraId,
    })
    .from(rdo)
    .where(eq(rdo.linkToken, token))
    .limit(1)

  if (!rdoRow) return null
  if (rdoRow.status !== 'pendente_aprovacao') return { erro: 'JA_PROCESSADO' as const, rdoRow, obraNome: '', clienteNome: null, atividades: [], funcionarios: [], fotos: [] }
  if (rdoRow.tokenExpiresAt && rdoRow.tokenExpiresAt < new Date()) return { erro: 'EXPIRADO' as const, rdoRow, obraNome: '', clienteNome: null, atividades: [], funcionarios: [], fotos: [] }

  const [obraData] = await db
    .select({ nome: obras.nome, clienteNome: clientes.nome })
    .from(obras)
    .leftJoin(clientes, eq(obras.clienteId, clientes.id))
    .where(eq(obras.id, rdoRow.obraId))
    .limit(1)

  const [atividades, funcionarios, fotos] = await Promise.all([
    db.select().from(rdoAtividades).where(eq(rdoAtividades.rdoId, rdoRow.id)),
    db.select().from(rdoFuncionarios).where(eq(rdoFuncionarios.rdoId, rdoRow.id)),
    db.select({ url: rdoFotos.url, legenda: rdoFotos.legenda }).from(rdoFotos).where(eq(rdoFotos.rdoId, rdoRow.id)),
  ])

  return {
    erro: null,
    rdoRow,
    obraNome: obraData?.nome ?? '—',
    clienteNome: obraData?.clienteNome ?? null,
    atividades,
    funcionarios,
    fotos,
  }
}

export async function aprovarRdoPorToken(token: string, assinaturaCliente: string) {
  const [rdoRow] = await db
    .select({ id: rdo.id, status: rdo.status, tokenExpiresAt: rdo.tokenExpiresAt, obraId: rdo.obraId, data: rdo.data, criadoPorId: rdo.criadoPorId })
    .from(rdo)
    .where(eq(rdo.linkToken, token))
    .limit(1)

  if (!rdoRow) throw new Error('Link inválido')
  if (rdoRow.status !== 'pendente_aprovacao') throw new Error('Este RDO já foi processado')
  if (rdoRow.tokenExpiresAt && rdoRow.tokenExpiresAt < new Date()) throw new Error('Link expirado')

  await db.update(rdo).set({
    status: 'aprovado',
    assinaturaCliente,
    aprovadoEm: new Date(),
    // Não limpamos linkToken aqui para evitar 404 no refresh automático do Next.js.
    // O status 'aprovado' já impede qualquer re-aprovação; o token fica inerte.
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, rdoRow.id))

  await db.insert(notificacoes).values({
    usuarioId: rdoRow.criadoPorId,
    titulo: 'RDO Aprovado',
    mensagem: `Seu RDO de ${rdoRow.data} foi aprovado pelo cliente.`,
    tipo: 'rdo_aprovado',
    referenciaId: rdoRow.id,
    tabelaReferencia: 'rdo',
  })

  revalidatePath('/rdo')
  revalidatePath(`/rdo/${rdoRow.id}`)
  revalidatePath('/hh')
}

export async function rejeitarRdoPorToken(token: string, motivoRejeicao: string) {
  const [rdoRow] = await db
    .select({ id: rdo.id, status: rdo.status, tokenExpiresAt: rdo.tokenExpiresAt, data: rdo.data, criadoPorId: rdo.criadoPorId })
    .from(rdo)
    .where(eq(rdo.linkToken, token))
    .limit(1)

  if (!rdoRow) throw new Error('Link inválido')
  if (rdoRow.status !== 'pendente_aprovacao') throw new Error('Este RDO já foi processado')
  if (rdoRow.tokenExpiresAt && rdoRow.tokenExpiresAt < new Date()) throw new Error('Link expirado')

  await db.update(rdo).set({
    status: 'rejeitado',
    motivoRejeicao,
    // Não limpamos linkToken — evita 404 no refresh automático do Next.js.
    atualizadoEm: new Date(),
  }).where(eq(rdo.id, rdoRow.id))

  await db.insert(notificacoes).values({
    usuarioId: rdoRow.criadoPorId,
    titulo: 'RDO Rejeitado',
    mensagem: `Seu RDO de ${rdoRow.data} foi rejeitado pelo cliente. Motivo: ${motivoRejeicao}`,
    tipo: 'rdo_rejeitado',
    referenciaId: rdoRow.id,
    tabelaReferencia: 'rdo',
  })

  revalidatePath('/rdo')
  revalidatePath(`/rdo/${rdoRow.id}`)
  revalidatePath('/hh')
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function emailAprovacaoHtml({ clienteNome, obraNome, data, link }: {
  clienteNome: string; obraNome: string; data: string; link: string
}) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1)">
    <div style="background:#1e40af;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px">CMI Gestão de Obras</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#334155;margin:0 0 16px">Olá, <strong>${clienteNome}</strong>!</p>
      <p style="color:#334155;margin:0 0 24px">
        Um Relatório Diário de Obra está aguardando sua aprovação:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr><td style="padding:8px 12px;background:#f1f5f9;color:#64748b;font-size:13px;border-radius:4px 0 0 4px">Obra</td>
            <td style="padding:8px 12px;font-weight:bold;color:#1e293b;font-size:13px">${obraNome}</td></tr>
        <tr><td style="padding:8px 12px;background:#f1f5f9;color:#64748b;font-size:13px">Data</td>
            <td style="padding:8px 12px;font-weight:bold;color:#1e293b;font-size:13px">${data}</td></tr>
      </table>
      <a href="${link}" style="display:inline-block;background:#1e40af;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px">
        Ver RDO e Aprovar →
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:24px 0 0">
        Este link expira em 7 dias. Se não reconhece este RDO, ignore este e-mail.
      </p>
    </div>
  </div>
</body>
</html>`
}
