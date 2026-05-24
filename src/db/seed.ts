import 'dotenv/config'
import { drizzle } from 'drizzle-orm/neon-http'
import { createClerkClient } from '@clerk/backend'
import { empresas, usuarios } from '../app/db/schema'
import { eq } from 'drizzle-orm'

// ─── Admin principal ─────────────────────────────────────────────────────────
const CLERK_ADMIN_ID = process.env.CLERK_ADMIN_ID
const CLERK_ADMIN_EMAIL = process.env.CLERK_ADMIN_EMAIL

// ─── Admin secundário (opcional — criado via Clerk se não existir) ────────────
const ADMIN_2_EMAIL = process.env.CLERK_ADMIN_2_EMAIL     // sandronc.jc@gmail.com
const ADMIN_2_NAME = process.env.CLERK_ADMIN_2_NAME ?? 'Sandro Nascimento'
const ADMIN_2_PASSWORD = process.env.CLERK_ADMIN_2_PASSWORD

if (!CLERK_ADMIN_ID || !CLERK_ADMIN_EMAIL) {
  console.error('❌ CLERK_ADMIN_ID e CLERK_ADMIN_EMAIL devem estar no .env')
  process.exit(1)
}

const db = drizzle(process.env.DATABASE_URL!)
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

async function ensureAdmin(clerkId: string, email: string, nome: string, empresaId: string) {
  const existing = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.clerkId, clerkId))
    .limit(1)

  if (existing.length > 0) {
    console.log(`✅ Admin já existe (${email}):`, existing[0].id)
    return
  }

  const [inserido] = await db
    .insert(usuarios)
    .values({ clerkId, email, nome, funcao: 'admin', empresaId })
    .returning({ id: usuarios.id })
  console.log(`✅ Admin criado (${email}):`, inserido.id)
}

async function seed() {
  console.log('🌱 Iniciando seed...')

  // ─── Empresa ──────────────────────────────────────────────────────────────
  const empresaData = {
    nome: 'CMIG MONTAGEM INDUSTRIAL',
    documento: '49.670.347/0001-30',
    endereco: 'Lucas do Rio Verde - MT',
  }

  let empresaId: string
  const existente = await db
    .select({ id: empresas.id })
    .from(empresas)
    .where(eq(empresas.documento, empresaData.documento))
    .limit(1)

  if (existente.length > 0) {
    empresaId = existente[0].id
    console.log('✅ Empresa já existe, reutilizando:', empresaId)
  } else {
    const [inserida] = await db.insert(empresas).values(empresaData).returning({ id: empresas.id })
    empresaId = inserida.id
    console.log('✅ Empresa criada:', empresaId)
  }

  // ─── Admin principal (CLERK_ADMIN_ID já existe no Clerk) ──────────────────
  await ensureAdmin(CLERK_ADMIN_ID!, CLERK_ADMIN_EMAIL!, 'ADMINISTRAÇÃO', empresaId)

  // ─── Admin secundário (cria no Clerk se necessário) ───────────────────────
  if (ADMIN_2_EMAIL) {
    if (!ADMIN_2_PASSWORD) {
      console.warn('⚠️  CLERK_ADMIN_2_EMAIL definido mas CLERK_ADMIN_2_PASSWORD ausente — pulando admin 2')
    } else {
      // Verifica se já existe no banco pelo email
      const existeNoBanco = await db
        .select({ id: usuarios.id, clerkId: usuarios.clerkId })
        .from(usuarios)
        .where(eq(usuarios.email, ADMIN_2_EMAIL))
        .limit(1)

      if (existeNoBanco.length > 0) {
        console.log(`✅ Admin 2 já existe no banco (${ADMIN_2_EMAIL}):`, existeNoBanco[0].id)
      } else {
        // Verifica se já existe no Clerk
        const clerkUsers = await clerk.users.getUserList({ emailAddress: [ADMIN_2_EMAIL] })
        let clerkId: string

        if (clerkUsers.data.length > 0) {
          clerkId = clerkUsers.data[0].id
          console.log(`✅ Usuário já existe no Clerk (${ADMIN_2_EMAIL}):`, clerkId)
        } else {
          const novoClerkUser = await clerk.users.createUser({
            emailAddress: [ADMIN_2_EMAIL],
            password: ADMIN_2_PASSWORD,
            firstName: ADMIN_2_NAME.split(' ')[0],
            lastName: ADMIN_2_NAME.split(' ').slice(1).join(' ') || undefined,
          })
          clerkId = novoClerkUser.id
          console.log(`✅ Usuário criado no Clerk (${ADMIN_2_EMAIL}):`, clerkId)
        }

        await ensureAdmin(clerkId, ADMIN_2_EMAIL, ADMIN_2_NAME, empresaId)
      }
    }
  }

  console.log('🎉 Seed concluído com sucesso!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
