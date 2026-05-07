import { db } from '@/app/db'
import { obras } from '@/app/db/schema'
import { eq } from 'drizzle-orm'

export async function getObraById(id: string) {
  const [obra] = await db.select().from(obras).where(eq(obras.id, id)).limit(1)
  return obra ?? null
}

export async function updateObra(
  id: string,
  data: {
    nome?: string
    descricao?: string | null
    status?: 'planejada' | 'em_andamento' | 'pausada' | 'concluida'
    dataInicio?: string | null
    dataFim?: string | null
  },
) {
  const [updated] = await db
    .update(obras)
    .set({ ...data, atualizadoEm: new Date() })
    .where(eq(obras.id, id))
    .returning()
  return updated
}
