/**
 * Testa o download do PDF do RDO no site em produção.
 * Usa sessão salva em scripts/auth-state.json.
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'

const BASE      = 'https://cmiggestao.vercel.app'
const SS        = 'scripts/screenshots'
const AUTH_FILE = 'scripts/auth-state.json'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })
const ss = (n) => `${SS}/pdf-${n}.png`

const browser = await chromium.launch({
  headless: false,
  slowMo: 150,
  executablePath: 'C:\\Users\\Usuario\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--start-maximized'],
})

const ctxOptions = existsSync(AUTH_FILE)
  ? { viewport: null, storageState: AUTH_FILE }
  : { viewport: null }

const ctx  = await browser.newContext({ ...ctxOptions, acceptDownloads: true })
const page = await ctx.newPage()
page.setDefaultTimeout(60000)

const step = (msg) => console.log(`\n→ ${msg}`)
const ok   = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg) => console.log(`  ❌ ${msg}`)
const info = (msg) => console.log(`  ℹ️  ${msg}`)

// ── Verifica sessão ────────────────────────────────────────────────────────────
step('Verificando sessão...')
await page.goto(`${BASE}/dashboard`)
await page.waitForLoadState('networkidle')
if (page.url().includes('/sign-in')) {
  info('Sessão expirada — faça login (até 2 min)')
  await page.waitForFunction(
    (base) => window.location.href.startsWith(base) && !window.location.href.includes('/sign-in'),
    BASE, { timeout: 120000, polling: 1000 }
  )
  await ctx.storageState({ path: AUTH_FILE })
  ok('Nova sessão salva')
} else {
  ok(`Sessão ativa — ${page.url()}`)
}

// ── Navega para a lista de RDOs ────────────────────────────────────────────────
step('Abrindo lista de RDOs...')
await page.goto(`${BASE}/rdo`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('01-lista-rdo') })

// Pega o primeiro link de RDO disponível
const rdoLinks = await page.locator('a[href^="/rdo/"]').all()
const rdoUrls = []
for (const link of rdoLinks) {
  const href = await link.getAttribute('href')
  if (href && href.match(/^\/rdo\/[a-f0-9-]{36}/)) rdoUrls.push(href)
}
info(`RDOs encontrados: ${rdoUrls.length}`)

if (rdoUrls.length === 0) {
  fail('Nenhum RDO na lista — crie um RDO primeiro')
  await browser.close()
  process.exit(1)
}

// Abre o primeiro RDO
const rdoUrl = rdoUrls[0]
step(`Abrindo RDO: ${rdoUrl}`)
await page.goto(`${BASE}${rdoUrl}`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('02-detalhe-rdo') })

// Verifica se o botão PDF existe
const btnPdf = page.getByRole('link', { name: /pdf/i })
const btnCount = await btnPdf.count()
info(`Botão PDF encontrado: ${btnCount > 0 ? 'SIM' : 'NÃO'}`)

if (btnCount === 0) {
  fail('Botão PDF não encontrado — deploy ainda não propagou?')
  await page.screenshot({ path: ss('02b-sem-botao-pdf') })
  // Tenta acessar a API diretamente
  const rdoId = rdoUrl.replace('/rdo/', '')
  info(`Tentando API diretamente: /api/rdo/${rdoId}/pdf`)
  const apiUrl = `${BASE}/api/rdo/${rdoId}/pdf`

  const downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
  await page.goto(apiUrl)
  const download = await downloadPromise
  if (download) {
    const path = `scripts/screenshots/rdo-download.pdf`
    await download.saveAs(path)
    ok(`PDF baixado via API: ${path} (${(await download.createReadStream()).read()?.length ?? '?'} bytes)`)
  } else {
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: ss('03-api-response') })
    const status = page.url()
    info(`URL após API: ${status}`)
  }
} else {
  // Clica no botão PDF e aguarda download
  step('Clicando em "PDF" e aguardando download...')
  const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
  await btnPdf.click()

  try {
    const download = await downloadPromise
    const filename = download.suggestedFilename()
    const savePath = `scripts/screenshots/${filename}`
    await download.saveAs(savePath)

    ok(`PDF baixado: ${filename}`)
    ok(`Salvo em: ${savePath}`)

    // Verifica tamanho do arquivo
    const { statSync } = await import('fs')
    try {
      const stat = statSync(savePath)
      ok(`Tamanho: ${(stat.size / 1024).toFixed(1)} KB`)
      if (stat.size > 5000) {
        ok('🎉 PDF válido — tamanho acima de 5KB, não é arquivo vazio')
      } else {
        fail(`PDF muito pequeno (${stat.size} bytes) — pode estar vazio ou com erro`)
      }
    } catch {}
  } catch (e) {
    fail(`Download não disparou: ${e.message}`)
    await page.screenshot({ path: ss('03-erro-download') })
  }
}

await page.screenshot({ path: ss('04-final') })
console.log('\n' + '═'.repeat(60))
console.log('Screenshots em scripts/screenshots/ com prefixo "pdf-"')
console.log('\nAguardando 6s...')
await page.waitForTimeout(6000)
await browser.close()
console.log('Concluído.')
