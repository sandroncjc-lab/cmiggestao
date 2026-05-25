import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)

const rdos = await sql`
  SELECT r.id, r.status, r.data, o.nome as obra, r.criado_em
  FROM rdo r JOIN obras o ON o.id = r.obra_id
  ORDER BY r.criado_em DESC LIMIT 5
`
console.log('== RDOs recentes ==')
rdos.forEach(r => console.log(String(r.criado_em).substring(0,20), '|', r.status, '|', r.obra, '|', r.id.substring(0,8)))

const funcs = await sql`
  SELECT rf.nome_funcionario, rf.funcao, rf.horas_trabalhadas, r.status, o.nome as obra
  FROM rdo_funcionarios rf
  JOIN rdo r ON r.id = rf.rdo_id
  JOIN obras o ON o.id = r.obra_id
  ORDER BY r.criado_em DESC LIMIT 10
`
console.log('\n== Funcionários em RDOs ==')
funcs.forEach(f => console.log(f.nome_funcionario, '|', f.funcao, '|', f.horas_trabalhadas, 'h | obra:', f.obra, '| rdo status:', f.status))

const hh = await sql`SELECT o.nome, hc.total_hh FROM hh_contratos hc JOIN obras o ON o.id = hc.obra_id`
console.log('\n== HH Contratos ==')
hh.forEach(h => console.log(h.nome, '|', h.total_hh, 'h'))
