// CORREÇÃO DE SEGURANÇA - Auditoria
'use server'

import { db } from '@/app/db'
import { hhContratos, hhRegistros, notificacoes, obras, rdo, rdoFuncionarios } from '@/app/db/schema'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioAtual, isCliente } from '@/lib/server/getUsuario'
import { verificarOwnershipObra, verificarOwnershipHHRegistro } from '@/lib/auth/ownership'

export async function listarHHDados() {
  const usuario = await getUsuarioAtual()
  if (!usuario) return { obrasList: [], consumoMap: {} as Record<string, number>, rdosPorObra: {} as Record<string, never[]>, registrosPorObra: {} as Record<string, never[]> }

  // INNER JOIN com hhContratos: só aparecem obras que já têm HH contratado definido
  let obrasQuery
  if (isCliente(usuario.funcao) && usuario.clienteId) {
    obrasQuery = db
      .select({ id: obras.id, nome: obras.nome, totalHH: hhContratos.totalHH, hhId: hhContratos.id })
      .from(hhContratos)
      .innerJoin(obras, eq(obras.id, hhContratos.obraId))
      .where(eq(obras.clienteId, usuario.clienteId))
      .orderBy(obras.nome)
  } else {
    obrasQuery = db
      .select({ id: obras.id, nome: obras.nome, totalHH: hhContratos.totalHH, hhId: hhContratos.id })
      .from(hhContratos)
      .innerJoin(obras, eq(obras.id, hhContratos.obraId))
      .where(eq(obras.empresaId, usuario.empresaId))
      .orderBy(obras.nome)
  }

  const obrasList = await obrasQuery
  const obraIds = obrasList.map((o) => o.id)

  if (obraIds.length === 0) return { obrasList, consumoMap: {} as Record<string, number>, rdosPorObra: {} as Record<string, never[]>, registrosPorObra: {} as Record<string, never[]> }

  // FONTE OFICIAL DE CONSUMO: rdoFuncionarios de RDOs não-rejeitados
  // Estorno automático: RDO rejeitado sai do filtro → horas devolvidas ao saldo
  const [consumoPorObra, lancamentosRdo, registros] = await Promise.all([
    db
      .select({
        obraId: rdo.obraId,
        total: sql<number>`coalesce(sum(${rdoFuncionarios.horasTrabalhadas}), 0)`,
      })
      .from(rdoFuncionarios)
      .innerJoin(rdo, eq(rdo.id, rdoFuncionarios.rdoId))
      .where(and(
        inArray(rdo.obraId, obraIds),
        ne(rdo.status, 'rejeitado'),
      ))
      .groupBy(rdo.obraId),
    db
      .select({
        obraId: rdo.obraId,
        rdoId: rdo.id,
        rdoData: rdo.data,
        nomeFuncionario: rdoFuncionarios.nomeFuncionario,
        funcao: rdoFuncionarios.funcao,
        horas: rdoFuncionarios.horasTrabalhadas,
      })
      .from(rdoFuncionarios)
      .innerJoin(rdo, eq(rdo.id, rdoFuncionarios.rdoId))
      .where(and(
        inArray(rdo.obraId, obraIds),
        ne(rdo.status, 'rejeitado'),
      ))
      .orderBy(rdo.data, rdoFuncionarios.nomeFuncionario),
    db
      .select({
        id: hhRegistros.id,
        obraId: hhRegistros.obraId,
        nomeFuncionario: hhRegistros.nomeFuncionario,
        funcao: hhRegistros.funcao,
        data: hhRegistros.data,
        horasNormais: hhRegistros.horasNormais,
        horasExtras: hhRegistros.horasExtras,
      })
      .from(hhRegistros)
      .where(inArray(hhRegistros.obraId, obraIds))
      .orderBy(hhRegistros.data),
  ])

  const consumoMap: Record<string, number> = Object.fromEntries(consumoPorObra.map((c) => [c.obraId, Number(c.total)]))

  const rdosPorObra: Record<string, typeof lancamentosRdo> = {}
  for (const l of lancamentosRdo) {
    if (!rdosPorObra[l.obraId]) rdosPorObra[l.obraId] = []
    rdosPorObra[l.obraId].push(l)
  }

  const registrosPorObra: Record<string, typeof registros> = {}
  for (const r of registros) {
    if (!registrosPorObra[r.obraId]) registrosPorObra[r.obraId] = []
    registrosPorObra[r.obraId].push(r)
  }

  return { obrasList, consumoMap, rdosPorObra, registrosPorObra }
}

export async function definirHHContratado(formData: FormData) {
  const usuario = await getUsuarioAtual()
  if (!usuario) throw new Error('Não autenticado')

  const obraId = formData.get('obraId') as string
  const totalHH = formData.get('totalHH') as string

  await verificarOwnershipObra(obraId, usuario.empresaId)

  const existing = await db.select().from(hhContratos).where(eq(hhContratos.obraId, obraId)).limit(1)
  if (existing.length > 0) {
    await db.update(hhContratos).set({ totalHH, atualizadoEm: new Date() }).where(eq(hhContratos.obraId, obraId))
  } else {
    await db.insert(hhContratos).values({ obraId, totalHH })
  }
  revalidatePath('/hh')
}

export async function registrarHH(formData: FormData) {
  const usuario = await getUsuarioAtual()
  if (!usuario) throw new Error('Não autenticado')

  const obraId = formData.get('obraId') as string

  await verificarOwnershipObra(obraId, usuario.empresaId)

  await db.insert(hhRegistros).values({
    obraId,
    nomeFuncionario: formData.get('nomeFuncionario') as string,
    funcao: (formData.get('funcao') as string) || null,
    data: formData.get('data') as string,
    horasNormais: (formData.get('horasNormais') as string) || '0',
    horasExtras: (formData.get('horasExtras') as string) || '0',
  })

  const [obraData] = await db.select().from(obras).where(eq(obras.id, obraId)).limit(1)
  const nomeObra = obraData?.nome ?? 'obra'

  if (obraData?.aprovadorClienteId) {
    const horasNormais = Number(formData.get('horasNormais') ?? 0)
    const horasExtras = Number(formData.get('horasExtras') ?? 0)
    const nomeFuncionario = formData.get('nomeFuncionario') as string
    await db.insert(notificacoes).values({
      usuarioId: obraData.aprovadorClienteId,
      titulo: 'Novo registro de HH',
      mensagem: `${nomeFuncionario} registrou ${horasNormais + horasExtras}h na obra "${nomeObra}" em ${formData.get('data')}.`,
      tipo: 'hh_registrado',
      referenciaId: obraId,
      tabelaReferencia: 'obras',
    })
  }

  // alertas de consumo: dispara UMA vez ao cruzar o limiar (verifica notificação existente)
  // Usa rdoFuncionarios como fonte oficial — consistente com o saldo exibido no painel
  const [contrato] = await db.select().from(hhContratos).where(eq(hhContratos.obraId, obraId)).limit(1)
  if (contrato && obraData) {
    const [consumo] = await db
      .select({ total: sql<number>`coalesce(sum(${rdoFuncionarios.horasTrabalhadas}), 0)` })
      .from(rdoFuncionarios)
      .innerJoin(rdo, eq(rdo.id, rdoFuncionarios.rdoId))
      .where(and(eq(rdo.obraId, obraId), ne(rdo.status, 'rejeitado')))

    const pct = (Number(consumo.total) / Number(contrato.totalHH)) * 100
    const responsavelId = obraData.responsavelInternoId ?? null

    if (responsavelId && pct >= 100) {
      // notifica 100% apenas se ainda não notificou
      const [jaNotificado] = await db
        .select({ id: notificacoes.id })
        .from(notificacoes)
        .where(and(
          eq(notificacoes.usuarioId, responsavelId),
          eq(notificacoes.tipo, 'hh_limite_100'),
          eq(notificacoes.referenciaId, obraId),
        ))
        .limit(1)

      if (!jaNotificado) {
        await db.insert(notificacoes).values({
          usuarioId: responsavelId,
          titulo: '100% do HH contratado atingido',
          mensagem: `A obra "${nomeObra}" atingiu 100% das horas contratadas.`,
          tipo: 'hh_limite_100',
          referenciaId: obraId,
          tabelaReferencia: 'obras',
        })
      }
    } else if (responsavelId && pct >= 80) {
      // notifica 80% apenas se ainda não notificou
      const [jaNotificado] = await db
        .select({ id: notificacoes.id })
        .from(notificacoes)
        .where(and(
          eq(notificacoes.usuarioId, responsavelId),
          eq(notificacoes.tipo, 'hh_alerta_80'),
          eq(notificacoes.referenciaId, obraId),
        ))
        .limit(1)

      if (!jaNotificado) {
        await db.insert(notificacoes).values({
          usuarioId: responsavelId,
          titulo: '80% do HH contratado consumido',
          mensagem: `A obra "${nomeObra}" consumiu 80% das horas contratadas.`,
          tipo: 'hh_alerta_80',
          referenciaId: obraId,
          tabelaReferencia: 'obras',
        })
      }
    }
  }

  revalidatePath('/hh')
}

export async function excluirRegistroHH(id: string) {
  const usuario = await getUsuarioAtual()
  if (!usuario) throw new Error('Não autenticado')

  await verificarOwnershipHHRegistro(id, usuario.empresaId)

  await db.delete(hhRegistros).where(eq(hhRegistros.id, id))
  revalidatePath('/hh')
}
