'use server'

import { z } from 'zod'
import { updateObra } from '@/data/obras'
import { revalidatePath } from 'next/cache'

const updateObraSchema = z.object({
  id: z.string().uuid(),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().nullable().optional(),
  status: z.enum(['planejada', 'em_andamento', 'pausada', 'concluida']),
  dataInicio: z.string().nullable().optional(),
  dataFim: z.string().nullable().optional(),
})

export type UpdateObraInput = z.infer<typeof updateObraSchema>

export async function updateObraAction(params: UpdateObraInput) {
  const parsed = updateObraSchema.safeParse(params)
  if (!parsed.success) throw new Error(parsed.error.message)

  const { id, ...data } = parsed.data
  const obra = await updateObra(id, data)
  revalidatePath(`/dashboard/serviços-obras/${id}`)
  revalidatePath('/obras')
  return obra
}
