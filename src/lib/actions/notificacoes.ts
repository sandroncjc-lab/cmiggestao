'use server'

import { db } from '@/app/db'
import { notificacoes } from '@/app/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { getUsuarioAtual } from '@/lib/server/getUsuario'

export async function listarNotificacoes() {
  const usuario = await getUsuarioAtual()
  if (!usuario) return []

  return db
    .select()
    .from(notificacoes)
    .where(eq(notificacoes.usuarioId, usuario.id))
    .orderBy(desc(notificacoes.criadoEm))
    .limit(20)
}

export async function contarNaoLidas() {
  const usuario = await getUsuarioAtual()
  if (!usuario) return 0

  const rows = await db
    .select({ id: notificacoes.id })
    .from(notificacoes)
    .where(and(eq(notificacoes.usuarioId, usuario.id), eq(notificacoes.lida, false)))

  return rows.length
}

export async function marcarComoLida(id: string) {
  await db.update(notificacoes).set({ lida: true }).where(eq(notificacoes.id, id))
  revalidatePath('/')
}

export async function marcarTodasComoLidas() {
  const usuario = await getUsuarioAtual()
  if (!usuario) return
  await db.update(notificacoes).set({ lida: true }).where(eq(notificacoes.usuarioId, usuario.id))
  revalidatePath('/')
}
