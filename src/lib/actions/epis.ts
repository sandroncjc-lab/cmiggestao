'use server'

import { db } from '@/app/db'
import { epis, epiDistribuicoes, epiMovimentacoes } from '@/app/db/schema'
import { eq, sql, inArray } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getSessionUsuario } from '@/data/session'

// ─── Catálogo ────────────────────────────────────────────────────────────────

export async function criarEpi(data: {
  tipo: string
  ca?: string | null
  descricao?: string | null
  periodicidadeTrocaDias?: number | null
  estoqueMinimo?: number
  fotoUrl?: string | null
}) {
  const usuario = await getSessionUsuario()
  if (!usuario) throw new Error('Não autenticado')

  await db.insert(epis).values({
    empresaId: usuario.empresaId,
    tipo: data.tipo,
    ca: data.ca ?? null,
    descricao: data.descricao ?? null,
    periodicidadeTrocaDias: data.periodicidadeTrocaDias ?? null,
    estoqueMinimo: data.estoqueMinimo ?? 0,
    fotoUrl: data.fotoUrl ?? null,
    quantidadeEstoque: 0,
    ativo: true,
  })
  revalidatePath('/epis')
}

export async function atualizarEpi(id: string, data: {
  tipo: string
  ca?: string | null
  descricao?: string | null
  periodicidadeTrocaDias?: number | null
  estoqueMinimo?: number
  fotoUrl?: string | null
}) {
  const usuario = await getSessionUsuario()
  if (!usuario) throw new Error('Não autenticado')

  await db.update(epis)
    .set({
      tipo: data.tipo,
      ca: data.ca ?? null,
      descricao: data.descricao ?? null,
      periodicidadeTrocaDias: data.periodicidadeTrocaDias ?? null,
      estoqueMinimo: data.estoqueMinimo ?? 0,
      fotoUrl: data.fotoUrl ?? null,
      atualizadoEm: new Date(),
    })
    .where(eq(epis.id, id))
  revalidatePath('/epis')
}

export async function desativarEpi(id: string) {
  await db.update(epis).set({ ativo: false, atualizadoEm: new Date() }).where(eq(epis.id, id))
  revalidatePath('/epis')
}

// ─── Movimentações de estoque ─────────────────────────────────────────────────

export async function registrarMovimentacao(data: {
  epiId: string
  tipo: 'ENTRADA' | 'AJUSTE' | 'DESCARTE'
  quantidade: number
  dataMovimentacao: string
  notaFiscal?: string | null
  observacoes?: string | null
}) {
  const usuario = await getSessionUsuario()
  if (!usuario) throw new Error('Não autenticado')

  await db.transaction(async (tx) => {
    const [epi] = await tx.select({ quantidade: epis.quantidadeEstoque })
      .from(epis).where(eq(epis.id, data.epiId)).limit(1)
    if (!epi) throw new Error('EPI não encontrado')

    let novoEstoque: number
    if (data.tipo === 'ENTRADA') {
      novoEstoque = epi.quantidade + data.quantidade
    } else if (data.tipo === 'AJUSTE') {
      novoEstoque = data.quantidade
    } else {
      // DESCARTE
      novoEstoque = epi.quantidade - data.quantidade
      if (novoEstoque < 0) throw new Error('Estoque insuficiente para descarte')
    }

    await tx.insert(epiMovimentacoes).values({
      empresaId: usuario.empresaId,
      epiId: data.epiId,
      tipo: data.tipo,
      quantidade: data.quantidade,
      dataMovimentacao: data.dataMovimentacao,
      notaFiscal: data.notaFiscal ?? null,
      distribuicaoId: null,
      usuarioResponsavelId: usuario.id,
      observacoes: data.observacoes ?? null,
    })

    await tx.update(epis)
      .set({ quantidadeEstoque: novoEstoque, atualizadoEm: new Date() })
      .where(eq(epis.id, data.epiId))
  })
  revalidatePath('/epis')
}

// ─── Distribuições para obras ─────────────────────────────────────────────────

export async function criarDistribuicao(data: {
  epiId: string
  obraId: string
  encarregadoId: string
  quantidade: number
  dataDistribuicao: string
  assinaturaEncarregadoBase64?: string | null
  observacoes?: string | null
}) {
  const usuario = await getSessionUsuario()
  if (!usuario) throw new Error('Não autenticado')

  await db.transaction(async (tx) => {
    const [epi] = await tx.select({ quantidade: epis.quantidadeEstoque })
      .from(epis).where(eq(epis.id, data.epiId)).limit(1)
    if (!epi) throw new Error('EPI não encontrado')
    if (epi.quantidade < data.quantidade) {
      throw new Error(`Estoque insuficiente: disponível ${epi.quantidade}, solicitado ${data.quantidade}`)
    }

    const [distribuicao] = await tx.insert(epiDistribuicoes).values({
      empresaId: usuario.empresaId,
      epiId: data.epiId,
      obraId: data.obraId,
      encarregadoId: data.encarregadoId,
      quantidade: data.quantidade,
      dataDistribuicao: data.dataDistribuicao,
      assinaturaEncarregadoBase64: data.assinaturaEncarregadoBase64 ?? null,
      observacoes: data.observacoes ?? null,
    }).returning({ id: epiDistribuicoes.id })

    await tx.insert(epiMovimentacoes).values({
      empresaId: usuario.empresaId,
      epiId: data.epiId,
      tipo: 'SAIDA_OBRA',
      quantidade: data.quantidade,
      dataMovimentacao: data.dataDistribuicao,
      notaFiscal: null,
      distribuicaoId: distribuicao.id,
      usuarioResponsavelId: usuario.id,
      observacoes: data.observacoes ?? null,
    })

    await tx.update(epis)
      .set({
        quantidadeEstoque: epi.quantidade - data.quantidade,
        atualizadoEm: new Date(),
      })
      .where(eq(epis.id, data.epiId))
  })
  revalidatePath('/epis')
}

// ─── Queries agregadas (para Server Components) ───────────────────────────────

export async function listarCatalogoComTotais(empresaId: string) {
  const catalogo = await db.select().from(epis)
    .where(eq(epis.empresaId, empresaId))
    .orderBy(epis.tipo)

  if (catalogo.length === 0) return []

  const epiIds = catalogo.map(e => e.id)
  const totais = await db
    .select({
      epiId: epiDistribuicoes.epiId,
      totalDistribuido: sql<number>`cast(sum(${epiDistribuicoes.quantidade}) as int)`,
    })
    .from(epiDistribuicoes)
    .where(inArray(epiDistribuicoes.epiId, epiIds))
    .groupBy(epiDistribuicoes.epiId)

  const totaisMap = Object.fromEntries(totais.map(t => [t.epiId, t.totalDistribuido]))

  return catalogo.map(e => ({
    ...e,
    totalDistribuido: totaisMap[e.id] ?? 0,
  }))
}

export async function listarDistribuicoesPorObra(obraId: string) {
  return db
    .select({
      id: epiDistribuicoes.id,
      quantidade: epiDistribuicoes.quantidade,
      dataDistribuicao: epiDistribuicoes.dataDistribuicao,
      observacoes: epiDistribuicoes.observacoes,
      epiTipo: epis.tipo,
      epiCa: epis.ca,
    })
    .from(epiDistribuicoes)
    .innerJoin(epis, eq(epiDistribuicoes.epiId, epis.id))
    .where(eq(epiDistribuicoes.obraId, obraId))
    .orderBy(epiDistribuicoes.dataDistribuicao)
}

export async function listarEpisAgrupadosPorObra(empresaId: string) {
  return db
    .select({
      obraId: epiDistribuicoes.obraId,
      epiId: epiDistribuicoes.epiId,
      epiTipo: epis.tipo,
      epiCa: epis.ca,
      totalDistribuido: sql<number>`cast(sum(${epiDistribuicoes.quantidade}) as int)`,
    })
    .from(epiDistribuicoes)
    .innerJoin(epis, eq(epiDistribuicoes.epiId, epis.id))
    .where(eq(epiDistribuicoes.empresaId, empresaId))
    .groupBy(epiDistribuicoes.obraId, epiDistribuicoes.epiId, epis.tipo, epis.ca)
    .orderBy(epiDistribuicoes.obraId)
}

export async function listarMovimentacoes(empresaId: string) {
  return db
    .select({
      id: epiMovimentacoes.id,
      tipo: epiMovimentacoes.tipo,
      quantidade: epiMovimentacoes.quantidade,
      dataMovimentacao: epiMovimentacoes.dataMovimentacao,
      notaFiscal: epiMovimentacoes.notaFiscal,
      observacoes: epiMovimentacoes.observacoes,
      distribuicaoId: epiMovimentacoes.distribuicaoId,
      epiTipo: epis.tipo,
      epiCa: epis.ca,
      obraId: epiDistribuicoes.obraId,
      criadoEm: epiMovimentacoes.criadoEm,
    })
    .from(epiMovimentacoes)
    .innerJoin(epis, eq(epiMovimentacoes.epiId, epis.id))
    .leftJoin(epiDistribuicoes, eq(epiMovimentacoes.distribuicaoId, epiDistribuicoes.id))
    .where(eq(epiMovimentacoes.empresaId, empresaId))
    .orderBy(epiMovimentacoes.dataMovimentacao)
}
