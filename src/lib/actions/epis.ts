'use server'

import { db } from '@/app/db'
import { epis } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function criarEpi(formData: FormData) {
  const validade = formData.get('validade') as string
  const hoje = new Date().toISOString().split('T')[0]
  const status = validade < hoje ? 'vencido' : 'ativo'

  await db.insert(epis).values({
    tipo: formData.get('tipo') as string,
    numeroCa: formData.get('numeroCa') as string || null,
    validade,
    funcionarioNome: formData.get('funcionarioNome') as string,
    dataEntrega: formData.get('dataEntrega') as string,
    status,
    obraId: formData.get('obraId') as string || null,
  })
  revalidatePath('/epis')
}

export async function atualizarEpi(id: string, formData: FormData) {
  const validade = formData.get('validade') as string
  const hoje = new Date().toISOString().split('T')[0]
  const status = validade < hoje ? 'vencido' : 'ativo'

  await db.update(epis).set({
    tipo: formData.get('tipo') as string,
    numeroCa: formData.get('numeroCa') as string || null,
    validade,
    funcionarioNome: formData.get('funcionarioNome') as string,
    dataEntrega: formData.get('dataEntrega') as string,
    status,
    atualizadoEm: new Date(),
  }).where(eq(epis.id, id))
  revalidatePath('/epis')
}

export async function excluirEpi(id: string) {
  await db.delete(epis).where(eq(epis.id, id))
  revalidatePath('/epis')
}
