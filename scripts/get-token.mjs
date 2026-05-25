import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
const rows = await sql`
  SELECT r.id, r.status, r.link_token, o.nome as obra
  FROM rdo r JOIN obras o ON o.id = r.obra_id
  WHERE r.link_token IS NOT NULL AND r.status = 'pendente_aprovacao'
  ORDER BY r.criado_em DESC LIMIT 1
`
if (rows[0]) {
  console.log('TOKEN=' + rows[0].link_token)
  console.log('RDO_ID=' + rows[0].id)
  console.log('OBRA=' + rows[0].obra)
}
