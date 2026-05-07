import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/app/db'
import { usuarios } from '@/app/db/schema'
import { eq } from 'drizzle-orm'

export async function getSessionUsuario() {
  await auth.protect()
  const clerkUser = await currentUser()
  if (!clerkUser) throw new Error('Unauthenticated')

  const email = clerkUser.emailAddresses[0]?.emailAddress
  if (!email) throw new Error('No email on Clerk user')

  const [usuario] = await db
    .select({ id: usuarios.id, nome: usuarios.nome, funcao: usuarios.funcao, empresaId: usuarios.empresaId })
    .from(usuarios)
    .where(eq(usuarios.email, email))
    .limit(1)

  return usuario ?? null
}
