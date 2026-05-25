import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)

// Usuários e suas empresas
const users = await sql`
  SELECT u.id, u.nome, u.email, u.clerk_id, u.funcao, e.nome AS empresa_nome, e.id AS empresa_id
  FROM usuarios u JOIN empresas e ON e.id = u.empresa_id
  ORDER BY u.email
`
console.log('\n== USUÁRIOS ==')
users.forEach(u => console.log(`  ${u.email} | ${u.funcao} | empresa: ${u.empresa_nome} (${u.empresa_id.substring(0,8)}...) | clerkId: ${u.clerk_id?.substring(0,20)}...`))

// Clientes e suas empresas
const cls = await sql`SELECT c.nome, e.nome AS empresa, e.id AS empresa_id FROM clientes c JOIN empresas e ON e.id = c.empresa_id ORDER BY c.nome`
console.log('\n== CLIENTES ==')
cls.forEach(c => console.log(`  ${c.nome} | empresa: ${c.empresa} (${c.empresa_id.substring(0,8)}...)`))

// Contratos existentes
const cts = await sql`SELECT numero, tipo, status FROM contratos ORDER BY criado_em DESC LIMIT 5`
console.log('\n== CONTRATOS (últimos 5) ==')
cts.forEach(c => console.log(`  ${c.numero} | tipo: ${c.tipo} | status: ${c.status}`))
