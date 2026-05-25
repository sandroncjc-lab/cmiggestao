/**
 * Testa o fluxo completo de aprovação remota (Modo B):
 * 1. Abre RDO em rascunho → assina → "Enviar para Aprovação"
 * 2. Copia o link /aprovar/[token] do card amarelo
 * 3. Abre link em contexto anônimo (sem login — simula cliente externo)
 * 4. Assina e aprova
 * 5. Verifica status = Aprovado no app interno
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'

const BASE      = 'https://cmiggestao.vercel.app'
const SS        = 'scripts/screenshots'
const AUTH_FILE = 'scripts/auth-state.json'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })
const ss = (n) => `${SS}/apr-${n}.png`

const step = (m) => console.log(`\n→ ${m}`)
const ok   = (m) => console.log(`  ✅ ${m}`)
const fail = (m) => console.log(`  ❌ ${m}`)
const info = (m) => console.log(`  ℹ️  ${m}`)

const browser = await chromium.launch({
  headless: false, slowMo: 150,
  executablePath: 'C:\\Users\\Usuario\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--start-maximized'],
})

// ── Contexto autenticado ──────────────────────────────────────────────────────
const ctxAuth = await browser.newContext({
  viewport: null,
  storageState: existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
})
const page = await ctxAuth.newPage()
page.setDefaultTimeout(60000)

// ── Sessão ────────────────────────────────────────────────────────────────────
step('Verificando sessão...')
await page.goto(`${BASE}/rdo`)
await page.waitForLoadState('networkidle')
if (page.url().includes('/sign-in')) {
  info('Sessão expirada — faça login')
  await page.waitForFunction(
    (b) => location.href.startsWith(b) && !location.href.includes('/sign-in'), BASE,
    { timeout: 120000, polling: 1000 }
  )
  await ctxAuth.storageState({ path: AUTH_FILE })
  await page.goto(`${BASE}/rdo`)
  await page.waitForLoadState('networkidle')
}
ok(`Sessão ativa`)
await page.screenshot({ path: ss('01-lista-rdo') })

// ── Acha um RDO em rascunho ───────────────────────────────────────────────────
step('Procurando RDO em rascunho na lista...')
// Lê todas as linhas e acha a que tem "Rascunho"
const rows = await page.locator('tbody tr, [class*="TableRow"]').all()
let rdoHref = null
for (const row of rows) {
  const txt = await row.innerText().catch(() => '')
  if (txt.toLowerCase().includes('rascunho')) {
    const links = await row.locator('a').all()
    for (const l of links) {
      const h = await l.getAttribute('href')
      if (h?.match(/^\/rdo\/[a-f0-9-]{36}/)) { rdoHref = h; break }
    }
    if (rdoHref) break
  }
}
// Fallback: primeiro link de RDO
if (!rdoHref) {
  const allLinks = await page.locator('a[href]').all()
  for (const l of allLinks) {
    const h = await l.getAttribute('href')
    if (h?.match(/^\/rdo\/[a-f0-9-]{36}/)) { rdoHref = h; break }
  }
  info('Nenhum rascunho óbvio — usando primeiro RDO disponível')
}
if (!rdoHref) { fail('Nenhum RDO encontrado'); await browser.close(); process.exit(1) }
info(`RDO selecionado: ${rdoHref}`)

// ── Abre o RDO ────────────────────────────────────────────────────────────────
step(`Abrindo detalhe do RDO...`)
await page.goto(`${BASE}${rdoHref}`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('02-detalhe') })

// Detecta status pelo texto da página
const pageText = await page.locator('body').innerText()
const isRascunho     = pageText.toLowerCase().includes('rascunho')
const isPendente     = pageText.toLowerCase().includes('pendente')
const isAprovado     = pageText.toLowerCase().includes('aprovado')
info(`Status detectado: ${isRascunho ? 'Rascunho' : isPendente ? 'Pendente' : isAprovado ? 'Aprovado' : 'Desconhecido'}`)

// ── Envia para aprovação se for rascunho ─────────────────────────────────────
if (isRascunho) {
  step('Enviando RDO para aprovação...')

  // Scroll até o card de envio
  const btnEnviar = page.getByRole('button', { name: /enviar para aprovação/i })
  await btnEnviar.scrollIntoViewIfNeeded()
  await page.screenshot({ path: ss('03-card-envio') })

  // Desenha assinatura no canvas via JS (React pode ignorar eventos sintéticos do Playwright)
  const canvas = page.locator('canvas').last()
  if (await canvas.count()) {
    await page.evaluate(() => {
      const canvases = document.querySelectorAll('canvas')
      const c = canvases[canvases.length - 1]
      if (!c) return
      const ctx = c.getContext('2d')
      if (!ctx) return
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(40, 60)
      for (let i = 0; i <= 30; i++) {
        ctx.lineTo(40 + i * 8, 60 + Math.sin(i * 0.5) * 20)
      }
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(40, 90)
      ctx.lineTo(280, 90)
      ctx.stroke()
    })
    ok('Assinatura desenhada via canvas API')
  }
  await page.screenshot({ path: ss('04-assinado') })

  await btnEnviar.click()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: ss('05-apos-enviar') })
  ok(`Enviado — URL: ${page.url()}`)

  // Volta ao detalhe para ver o link
  await page.goto(`${BASE}${rdoHref}`)
  await page.waitForLoadState('networkidle')
}

await page.screenshot({ path: ss('06-rdo-pendente') })

// ── Extrai o link /aprovar/[token] da página ──────────────────────────────────
step('Extraindo link de aprovação remota...')

// Estratégia 1: link com href /aprovar/
let linkAprovacao = null
const aprovarLinks = await page.locator('a[href*="/aprovar/"]').all()
for (const l of aprovarLinks) {
  const h = await l.getAttribute('href')
  if (h) {
    linkAprovacao = h.startsWith('http') ? h : `${BASE}${h}`
    break
  }
}

// Estratégia 2: texto da página com padrão /aprovar/[hex64]
if (!linkAprovacao) {
  const bodyTxt = await page.locator('body').innerText()
  const match = bodyTxt.match(/https?:\/\/[^\s]+\/aprovar\/[a-f0-9]{64}/)
  if (match) linkAprovacao = match[0]
}

// Estratégia 3: div com texto do token
if (!linkAprovacao) {
  const divs = await page.locator('div, span, p').all()
  for (const d of divs) {
    const t = await d.innerText().catch(() => '')
    if (t.includes('/aprovar/') && t.length < 200) {
      const match = t.match(/\/aprovar\/[a-f0-9]{64}/)
      if (match) { linkAprovacao = `${BASE}${match[0]}`; break }
    }
  }
}

if (!linkAprovacao) {
  fail('Link /aprovar/[token] não encontrado na página')
  const full = await page.locator('body').innerText()
  info(`Texto da página (primeiros 500 chars): ${full.substring(0, 500)}`)
  await browser.close(); process.exit(1)
}
ok(`Link obtido: ${linkAprovacao}`)

// ── Abre em contexto anônimo ──────────────────────────────────────────────────
step('Abrindo link em contexto anônimo (cliente externo, sem login)...')
const ctxAnon = await browser.newContext({ viewport: { width: 390, height: 844 } })
const anon = await ctxAnon.newPage()
anon.setDefaultTimeout(30000)

await anon.goto(linkAprovacao)
await anon.waitForLoadState('networkidle')
await anon.screenshot({ path: ss('07-pagina-anon') })

const anonText = await anon.locator('body').innerText()
info(`Página anon — primeiros 200 chars: ${anonText.substring(0, 200).replace(/\n+/g, ' ')}`)

const h1 = await anon.locator('h1').first().innerText().catch(() => '')
if (h1.toLowerCase().includes('aprovação') || h1.toLowerCase().includes('aprovacao')) {
  ok(`Página pública carregada: "${h1.trim()}"`)
} else if (anonText.toLowerCase().includes('expirado') || anonText.toLowerCase().includes('processado')) {
  fail('Token expirado ou já processado')
  await browser.close(); process.exit(1)
} else {
  info(`h1: "${h1.trim()}"`)
}

// ── Assina como cliente ───────────────────────────────────────────────────────
step('Assinando como cliente externo...')
const canvasAnon = anon.locator('canvas').first()
if (await canvasAnon.count()) {
  await anon.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(30, 70)
    for (let i = 0; i <= 30; i++) {
      ctx.lineTo(30 + i * 8, 70 + Math.sin(i * 0.6) * 30)
    }
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(30, 120)
    ctx.lineTo(270, 120)
    ctx.stroke()
  })
  ok('Assinatura do cliente desenhada via canvas API')
  await anon.screenshot({ path: ss('08-assinado-anon') })
} else {
  fail('Canvas não encontrado na página pública')
}

// ── Clica em Aprovar ──────────────────────────────────────────────────────────
step('Clicando em "Aprovar RDO"...')
const btnAprovar = anon.getByRole('button', { name: /aprovar rdo/i })
if (await btnAprovar.count()) {
  await btnAprovar.click()
  await anon.waitForTimeout(4000)
  await anon.screenshot({ path: ss('09-confirmacao') })

  const confirmText = await anon.locator('body').innerText()
  if (confirmText.toLowerCase().includes('aprovado')) {
    ok('🎉 Aprovação confirmada na página pública!')
  } else {
    info(`Resposta: ${confirmText.substring(0, 300).replace(/\n+/g, ' ')}`)
  }
} else {
  fail('Botão "Aprovar RDO" não encontrado')
  await anon.screenshot({ path: ss('09b-sem-botao') })
}

// ── Confirma no app interno ───────────────────────────────────────────────────
step('Verificando status no app interno...')
await page.reload()
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('10-status-final') })

const finalText = await page.locator('body').innerText()
if (finalText.toLowerCase().includes('aprovado')) {
  ok('✅ Status = Aprovado confirmado no app interno!')
} else if (finalText.toLowerCase().includes('pendente')) {
  fail('Status ainda pendente — a ação pode não ter completado')
} else {
  info(`Texto da página: ${finalText.substring(0, 300).replace(/\n+/g, ' ')}`)
}

console.log('\n' + '═'.repeat(60))
console.log('Screenshots em scripts/screenshots/ com prefixo "apr-"')
await page.waitForTimeout(5000)
await browser.close()
console.log('Concluído.')
