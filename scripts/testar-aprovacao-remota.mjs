/**
 * Testa aprovação remota (Modo B) usando token já existente no DB.
 * 1. Abre /aprovar/[token] em contexto anônimo (sem login)
 * 2. Verifica conteúdo do RDO
 * 3. Assina e clica em Aprovar
 * 4. Verifica confirmação + status no app interno
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const BASE      = 'https://cmiggestao.vercel.app'
const SS        = 'scripts/screenshots'
const AUTH_FILE = 'scripts/auth-state.json'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })
const ss = (n) => `${SS}/apr-${n}.png`

const step = (m) => console.log(`\n→ ${m}`)
const ok   = (m) => console.log(`  ✅ ${m}`)
const fail = (m) => console.log(`  ❌ ${m}`)
const info = (m) => console.log(`  ℹ️  ${m}`)

// ── Pega token do DB ──────────────────────────────────────────────────────────
step('Buscando RDO pendente com token no DB...')
const sql = neon(process.env.DATABASE_URL)
const rows = await sql`
  SELECT r.id, r.link_token, o.nome as obra
  FROM rdo r JOIN obras o ON o.id = r.obra_id
  WHERE r.link_token IS NOT NULL AND r.status = 'pendente_aprovacao'
  ORDER BY r.criado_em DESC LIMIT 1
`
if (!rows[0]?.link_token) {
  fail('Nenhum RDO pendente com token. Envie um RDO para aprovação primeiro.')
  process.exit(1)
}
const { id: rdoId, link_token: token, obra } = rows[0]
const linkAprovacao = `${BASE}/aprovar/${token}`
ok(`RDO: ${rdoId.substring(0,8)} | Obra: ${obra}`)
info(`Link: ${linkAprovacao}`)

const browser = await chromium.launch({
  headless: false, slowMo: 200,
  executablePath: 'C:\\Users\\Usuario\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--start-maximized'],
})

// ── Contexto anônimo (sem sessão Clerk) ───────────────────────────────────────
step('Abrindo link em contexto anônimo (sem login)...')
const ctxAnon = await browser.newContext({ viewport: { width: 390, height: 844 } })
const anon = await ctxAnon.newPage()
anon.setDefaultTimeout(30000)

await anon.goto(linkAprovacao)
await anon.waitForLoadState('networkidle')
await anon.screenshot({ path: ss('01-pagina-publica') })

const url = anon.url()
info(`URL carregada: ${url}`)

// Verifica que NÃO redirecionou para login
if (url.includes('/sign-in') || url.includes('sign-in')) {
  fail('❌ Redirecionou para login — /aprovar/* ainda está protegido no middleware')
  await browser.close(); process.exit(1)
}
ok('Rota pública — sem redirecionamento para login ✓')

// Verifica conteúdo
const bodyTxt = await anon.locator('body').innerText()
info(`Conteúdo (200 chars): ${bodyTxt.substring(0, 200).replace(/\n+/g, ' ')}`)

const h1 = await anon.locator('h1').first().innerText().catch(() => '')
ok(`Título da página: "${h1.trim()}"`)

// Verifica se há conteúdo do RDO (obra, atividades, funcionários)
const temObra  = bodyTxt.toLowerCase().includes(obra.toLowerCase()) || bodyTxt.toLowerCase().includes('obra')
const temEquipe = bodyTxt.toLowerCase().includes('equipe') || bodyTxt.toLowerCase().includes('funcionário') || bodyTxt.toLowerCase().includes('carlos')
info(`Obra visível: ${temObra} | Equipe visível: ${temEquipe}`)

// ── Assina no canvas ──────────────────────────────────────────────────────────
step('Assinando como cliente externo...')
const canvasCount = await anon.locator('canvas').count()
info(`Canvases encontrados: ${canvasCount}`)

if (canvasCount > 0) {
  await anon.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    // Assina: traço ondulado + linha base
    ctx.beginPath()
    ctx.moveTo(25, 70)
    for (let i = 0; i <= 28; i++) ctx.lineTo(25 + i * 8, 70 + Math.sin(i * 0.55) * 28)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(25, 125); ctx.lineTo(255, 125)
    ctx.stroke()
  })
  ok('Assinatura desenhada via canvas API')
  await anon.screenshot({ path: ss('02-assinado') })
} else {
  fail('Canvas não encontrado — página pode não ter carregado corretamente')
}

// ── Clica em Aprovar ──────────────────────────────────────────────────────────
step('Clicando em "Aprovar RDO"...')
const btnAprovar = anon.getByRole('button', { name: /aprovar rdo/i })
const btnCount = await btnAprovar.count()
info(`Botão "Aprovar RDO" encontrado: ${btnCount > 0 ? 'SIM' : 'NÃO'}`)

if (!btnCount) {
  fail('Botão não encontrado')
  const allBtns = await anon.locator('button').allInnerTexts()
  info(`Botões disponíveis: ${allBtns.join(' | ')}`)
  await anon.screenshot({ path: ss('03-sem-botao') })
  await browser.close(); process.exit(1)
}

await btnAprovar.click()
await anon.waitForTimeout(4000)
await anon.screenshot({ path: ss('03-confirmacao') })

const confirmTxt = await anon.locator('body').innerText()
info(`Resposta: ${confirmTxt.substring(0, 300).replace(/\n+/g, ' ')}`)

if (confirmTxt.toLowerCase().includes('aprovado')) {
  ok('🎉 APROVAÇÃO CONFIRMADA na página pública!')
} else if (confirmTxt.toLowerCase().includes('erro') || confirmTxt.toLowerCase().includes('error')) {
  fail('Erro ao aprovar')
} else {
  info('Verifique screenshot 03-confirmacao.png')
}

// ── Verifica no app interno ───────────────────────────────────────────────────
step('Verificando status no app interno (usuário logado)...')
const ctxAuth = await browser.newContext({
  viewport: null,
  storageState: existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
})
const page = await ctxAuth.newPage()
page.setDefaultTimeout(30000)

await page.goto(`${BASE}/rdo/${rdoId}`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('04-status-interno') })

const appTxt = await page.locator('body').innerText()
if (appTxt.toLowerCase().includes('aprovado')) {
  ok('✅ Status = Aprovado confirmado no app interno!')

  // Verifica assinatura do cliente
  const temAssinatura = await page.locator('img[alt*="cliente"], img[alt*="Assinatura"]').count()
  if (temAssinatura) ok('Assinatura do cliente visível na tela ✓')
} else if (appTxt.toLowerCase().includes('pendente')) {
  fail('Status ainda Pendente — ação pode não ter persistido no DB')
} else {
  info('Status: ' + appTxt.substring(0, 200).replace(/\n+/g, ' '))
}

// ── Verifica no DB ────────────────────────────────────────────────────────────
step('Verificando diretamente no DB...')
const [rdoFinal] = await sql`SELECT status, link_token, aprovado_em FROM rdo WHERE id = ${rdoId}`
info(`DB — status: ${rdoFinal?.status} | link_token: ${rdoFinal?.link_token ?? 'NULL (invalidado ✓)'} | aprovado_em: ${String(rdoFinal?.aprovado_em).substring(0,19)}`)
if (rdoFinal?.status === 'aprovado' && !rdoFinal?.link_token) {
  ok('DB confirma: aprovado + token invalidado ✓')
}

console.log('\n' + '═'.repeat(60))
console.log('Screenshots em scripts/screenshots/ com prefixo "apr-"')
await page.waitForTimeout(5000)
await browser.close()
console.log('Concluído.')
