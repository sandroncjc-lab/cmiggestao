import { db } from '@/app/db'
import { obras, contratos, rdo, epis, equipamentos, hhContratos, hhRegistros } from '@/app/db/schema'
import { eq, sql, inArray, and } from 'drizzle-orm'
import { getSessionUsuario } from './session'

export async function getDashboardStats() {
  const usuario = await getSessionUsuario()
  if (!usuario) return null
  const { empresaId } = usuario

  const obrasEmpresa = await db
    .select({ id: obras.id })
    .from(obras)
    .where(eq(obras.empresaId, empresaId))

  const obraIds = obrasEmpresa.map((o) => o.id)

  const noData = { count: 0 } as const
  const noHH = { total: 0 } as const

  const [
    obrasAtivas,
    contratosAtivos,
    rdosPendentes,
    episVencidos,
    equipamentosEmUso,
    totalHHContratado,
    totalHHConsumido,
  ] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(obras)
      .where(and(eq(obras.empresaId, empresaId), eq(obras.status, 'em_andamento'))),

    obraIds.length > 0
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(contratos)
          .where(and(eq(contratos.status, 'ativo'), inArray(contratos.obraId, obraIds)))
      : [noData],

    obraIds.length > 0
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(rdo)
          .where(and(eq(rdo.status, 'pendente_aprovacao'), inArray(rdo.obraId, obraIds)))
      : [noData],

    db
      .select({ count: sql<number>`count(*)` })
      .from(epis)
      .where(and(
        eq(epis.empresaId, empresaId),
        eq(epis.ativo, true),
        sql`${epis.quantidadeEstoque} < ${epis.estoqueMinimo}`,
      )),

    obraIds.length > 0
      ? db
          .select({ count: sql<number>`count(*)` })
          .from(equipamentos)
          .where(and(eq(equipamentos.status, 'em_uso'), inArray(equipamentos.obraId, obraIds)))
      : [noData],

    obraIds.length > 0
      ? db
          .select({ total: sql<number>`coalesce(sum(total_hh), 0)` })
          .from(hhContratos)
          .where(inArray(hhContratos.obraId, obraIds))
      : [noHH],

    obraIds.length > 0
      ? db
          .select({ total: sql<number>`coalesce(sum(horas_normais + horas_extras), 0)` })
          .from(hhRegistros)
          .where(inArray(hhRegistros.obraId, obraIds))
      : [noHH],
  ])

  const hhContratado = Number(totalHHContratado[0]?.total ?? 0)
  const hhConsumido = Number(totalHHConsumido[0]?.total ?? 0)
  const hhPct = hhContratado > 0 ? Math.round((hhConsumido / hhContratado) * 100) : 0

  return {
    usuario,
    obrasAtivas: Number(obrasAtivas[0]?.count ?? 0),
    contratosAtivos: Number(contratosAtivos[0]?.count ?? 0),
    rdosPendentes: Number(rdosPendentes[0]?.count ?? 0),
    episVencidos: Number(episVencidos[0]?.count ?? 0),
    equipamentosEmUso: Number(equipamentosEmUso[0]?.count ?? 0),
    hhContratado,
    hhConsumido,
    hhPct,
  }
}
