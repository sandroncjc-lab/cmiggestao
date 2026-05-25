/**
 * Testa PDF localmente em http://localhost:3000
 * Usa sessão salva em auth-state.json (Clerk em modo dev).
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync, statSync } from 'fs'
import path from 'path'

const BASE      = 'http://localhost:3000'
const AUTH_FILE = 'scripts/auth-state-local.json'
const SS        = 'scripts/screenshots'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })

const RDO_ID = 'e56c9e42-2b89-4242-a256-96660bb1ddb3'

const step = (m) => console.log(`\n→ ${m}`)
const ok   = (m) => console.log(`  ✅ ${m}`)
const fail = (m) => console.log(`  ❌ ${m}`)
const info = (m) => console.log(`  ℹ️  ${m}`)

const browser = await chromium.launch({
  headless: false, slowMo: 400,
  executablePath: 'C:/Users/Usuario/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
  args: ['--start-maximized'],
})

const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  storageState: existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
  acceptDownloads: true,
  baseURL: BASE,
})
const page = await ctx.newPage()
page.setDefaultTimeout(30000)

step(`Abrindo RDO ${RDO_ID.substring(0,8)} no servidor LOCAL…`)
await page.goto(`${BASE}/rdo/${RDO_ID}`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: `${SS}/local-pdf-01-rdo.png` })

const url = page.url()
info(`URL: ${url}`)

if (url.includes('sign-in')) {
  fail('Sessão expirada — sessão local pode diferir da de produção')
  info('Tente acessar manualmente: http://localhost:3000 e faça login')
  await browser.close(); process.exit(1)
}

step('Aguardando PdfButtonWrapper carregar (dynamic import, ssr:false)…')
// Aguarda até 10s pelo blob: URL (significa que @react-pdf/renderer gerou o PDF no browser)
let blobReady = false
try {
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('a[download]'))
              .some(a => a.href.startsWith('blob:')),
    { timeout: 15000 }
  )
  blobReady = true
  ok('blob URL gerado! @react-pdf/renderer funcionou no browser ✓')
} catch {
  info('Timeout esperando blob URL — verificando o que está na página…')
}

const allElements = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll('button')).map(b => `btn:"${b.innerText.trim()}"`)
  const links = Array.from(document.querySelectorAll('a[download]')).map(a => `a:"${a.innerText.trim()}" href:${a.href.substring(0,60)} download:"${a.getAttribute('download')}"`)
  return [...btns, ...links]
})
info(`Elementos: ${allElements.join(' | ')}`)
await page.screenshot({ path: `${SS}/local-pdf-02-botao.png` })

if (!blobReady) {
  fail('Botão PDF não gerou blob URL em 15s')
  // Verifica se há erro JS no console
  await browser.close(); process.exit(1)
}

step('Clicando no link PDF (blob) e aguardando download…')
const pdfLink = page.locator('a[download][href^="blob:"]').first()
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 20000 }),
  pdfLink.click(),
])

const filename = download.suggestedFilename()
const ext = path.extname(filename).toLowerCase()
info(`Arquivo: ${filename} | Extensão: ${ext}`)

const savePath = `${SS}/local-rdo-download${ext}`
await download.saveAs(savePath)

const size = statSync(savePath).size
info(`Tamanho: ${(size/1024).toFixed(1)} KB`)

if (ext === '.pdf' && size > 5000) {
  ok(`🎉 PDF REAL e completo! (${(size/1024).toFixed(1)} KB)`)
} else if (ext === '.htm' || ext === '.html') {
  fail('Ainda gerando HTML!')
} else {
  info(`Arquivo: ${ext}, ${size} bytes`)
}

await page.screenshot({ path: `${SS}/local-pdf-03-final.png` })
await page.waitForTimeout(4000)
await browser.close()
console.log('\nConcluído. Screenshots: scripts/screenshots/local-pdf-*.png')
