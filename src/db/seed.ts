import 'dotenv/config'
import { drizzle } from 'drizzle-orm/neon-http'
import { empresas, usuarios } from '../app/db/schema'
import { eq } from 'drizzle-orm'

const CLERK_ADMIN_ID = process.env.CLERK_ADMIN_ID
const CLERK_ADMIN_EMAIL = process.env.CLERK_ADMIN_EMAIL

if (!CLERK_ADMIN_ID || !CLERK_ADMIN_EMAIL) {
  console.error('❌ CLERK_ADMIN_ID e CLERK_ADMIN_EMAIL devem estar no .env')
  process.exit(1)
}

const db = drizzle(process.env.DATABASE_URL!)

async function seed() {
  console.log('🌱 Iniciando seed...')

  // Empresa
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

  // Usuário admin
  const adminExistente = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .where(eq(usuarios.clerkId, CLERK_ADMIN_ID!))
    .limit(1)

  if (adminExistente.length > 0) {
    console.log('✅ Usuário admin já existe, reutilizando:', adminExistente[0].id)
  } else {
    const [adminInserido] = await db
      .insert(usuarios)
      .values({
        clerkId: CLERK_ADMIN_ID,
        email: CLERK_ADMIN_EMAIL!,
        nome: 'ADMINISTRAÇÃO',
        funcao: 'admin',
        empresaId,
      })
      .returning({ id: usuarios.id })
    console.log('✅ Usuário admin criado:', adminInserido.id)
  }

  console.log('🎉 Seed concluído com sucesso!')
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌ Erro no seed:', err)
  process.exit(1)
})
