import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
const rows = await sql`SELECT id, data, status FROM rdo ORDER BY criado_em DESC LIMIT 5`
rows.forEach(r => console.log(r.id, r.data, r.status))
