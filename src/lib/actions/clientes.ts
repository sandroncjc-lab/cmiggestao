'use server'

import { db } from '@/app/db'
import { clientes } from '@/app/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function criarCliente(formData: FormData) {
  const data = {
    nome: formData.get('nome') as string,
    documento: formData.get('documento') as string || null,
    email: formData.get('email') as string || null,
    telefone: formData.get('telefone') as string || null,
    endereco: formData.get('endereco') as string || null,
    empresaId: formData.get('empresaId') as string,
  }
  if (!data.nome || !data.empresaId) throw new Error('Campos obrigatórios faltando')
  await db.insert(clientes).values(data)
  revalidatePath('/clientes')
}

export async function atualizarCliente(id: string, formData: FormData) {
  const data = {
    nome: formData.get('nome') as string,
    documento: formData.get('documento') as string || null,
    email: formData.get('email') as string || null,
    telefone: formData.get('telefone') as string || null,
    endereco: formData.get('endereco') as string || null,
    atualizadoEm: new Date(),
  }
  await db.update(clientes).set(data).where(eq(clientes.id, id))
  revalidatePath('/clientes')
  revalidatePath(`/clientes/${id}`)
}

export async function excluirCliente(id: string) {
  await db.delete(clientes).where(eq(clientes.id, id))
  revalidatePath('/clientes')
}
