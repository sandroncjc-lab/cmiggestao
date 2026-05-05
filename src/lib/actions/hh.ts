'use server'

import { db } from '@/app/db'
import { hhContratos, hhRegistros, notificacoes, obras } from '@/app/db/schema'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function definirHHContratado(formData: FormData) {
  const obraId = formData.get('obraId') as string
  const totalHH = formData.get('totalHH') as string

  const existing = await db.select().from(hhContratos).where(eq(hhContratos.obraId, obraId)).limit(1)
  if (existing.length > 0) {
    await db.update(hhContratos).set({ totalHH, atualizadoEm: new Date() }).where(eq(hhContratos.obraId, obraId))
  } else {
    await db.insert(hhContratos).values({ obraId, totalHH })
  }
  revalidatePath('/hh')
}

export async function registrarHH(formData: FormData) {
  const obraId = formData.get('obraId') as string
  await db.insert(hhRegistros).values({
    obraId,
    nomeFuncionario: formData.get('nomeFuncionario') as string,
    funcao: formData.get('funcao') as string || null,
    data: formData.get('data') as string,
    horasNormais: formData.get('horasNormais') as string || '0',
    horasExtras: formData.get('horasExtras') as string || '0',
  })

  // verifica alertas de 80% e 100%
  const [contrato] = await db.select().from(hhContratos).where(eq(hhContratos.obraId, obraId)).limit(1)
  if (contrato) {
    const [consumo] = await db
      .select({ total: sql<number>`coalesce(sum(horas_normais + horas_extras), 0)` })
      .from(hhRegistros)
      .where(eq(hhRegistros.obraId, obraId))

    const pct = (Number(consumo.total) / Number(contrato.totalHH)) * 100
    const obraData = await db.select().from(obras).where(eq(obras.id, obraId)).limit(1)
    const nomeObra = obraData[0]?.nome ?? 'obra'

    if (pct >= 100 && pct < 110) {
      await db.insert(notificacoes).values({
        usuarioId: obraData[0]?.responsavelInternoId ?? obraData[0]?.id,
        titulo: '100% do HH contratado atingido',
        mensagem: `A obra "${nomeObra}" atingiu 100% das horas contratadas.`,
        tipo: 'hh_limite_100',
        referenciaId: obraId,
        tabelaReferencia: 'obras',
      })
    } else if (pct >= 80 && pct < 81) {
      await db.insert(notificacoes).values({
        usuarioId: obraData[0]?.responsavelInternoId ?? obraData[0]?.id,
        titulo: '80% do HH contratado consumido',
        mensagem: `A obra "${nomeObra}" consumiu 80% das horas contratadas.`,
        tipo: 'hh_alerta_80',
        referenciaId: obraId,
        tabelaReferencia: 'obras',
      })
    }
  }

  revalidatePath('/hh')
}

export async function excluirRegistroHH(id: string) {
  await db.delete(hhRegistros).where(eq(hhRegistros.id, id))
  revalidatePath('/hh')
}
