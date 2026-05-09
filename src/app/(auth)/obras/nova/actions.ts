'use server'

import { z } from 'zod'
import { createObra } from '@/data/obras'
import { getSessionUsuario } from '@/data/session'
import { revalidatePath } from 'next/cache'

const createObraSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().nullable().optional(),
  status: z.enum(['planejada', 'em_andamento', 'pausada', 'concluida']),
  dataInicio: z.string().nullable().optional(),
  dataFim: z.string().nullable().optional(),
  clienteId: z.string().uuid('Cliente é obrigatório'),
})

export type CreateObraInput = z.infer<typeof createObraSchema>

export async function createObraAction(params: CreateObraInput) {
  const usuario = await getSessionUsuario()
  if (!usuario) throw new Error('Unauthenticated')

  const parsed = createObraSchema.safeParse(params)
  if (!parsed.success) throw new Error(parsed.error.message)

  const obra = await createObra({ ...parsed.data, empresaId: usuario.empresaId })
  revalidatePath('/obras')
  return obra
}
