/**
 * Testa download de PDF do RDO no site em produção.
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync, statSync } from 'fs'
import path from 'path'

const BASE      = 'https://cmiggestao.vercel.app'
const AUTH_FILE = 'scripts/auth-state.json'
const SS        = 'scripts/screenshots'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })

const RDO_ID = 'e56c9e42-2b89-4242-a256-96660bb1ddb3'

const step = (m) => console.log(`\n→ ${m}`)
const ok   = (m) => console.log(`  ✅ ${m}`)
const fail = (m) => console.log(`  ❌ ${m}`)
const info = (m) => console.log(`  ℹ️  ${m}`)

const browser = await chromium.launch({
  headless: false, slowMo: 300,
  executablePath: 'C:/Users/Usuario/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
  args: ['--start-maximized'],
})

const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  storageState: existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
  acceptDownloads: true,
})
const page = await ctx.newPage()
page.setDefaultTimeout(30000)

step(`Abrindo RDO ${RDO_ID.substring(0,8)}…`)
await page.goto(`${BASE}/rdo/${RDO_ID}`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: `${SS}/pdf-01-rdo.png` })

if (page.url().includes('sign-in')) {
  fail('Sessão expirada')
  await browser.close(); process.exit(1)
}
ok('Página carregada')

step('Aguardando botão PDF carregar (dynamic import)…')
await page.waitForTimeout(5000)
await page.screenshot({ path: `${SS}/pdf-02-botao.png` })

const allBtns = await page.locator('button').allInnerTexts()
info(`Botões: ${allBtns.join(' | ')}`)
const bodyTxt = await page.locator('body').innerText()
info(`Página (300 chars): ${bodyTxt.substring(0, 300).replace(/\n+/g, ' ')}`)

// Debug: listar todos os <a> com atributos
const links = await page.evaluate(() =>
  Array.from(document.querySelectorAll('a')).map(a => ({
    text: a.innerText.trim().substring(0, 30),
    href: a.href.substring(0, 60),
    download: a.getAttribute('download'),
  }))
)
info(`Links na página: ${JSON.stringify(links)}`)

// Aguarda o PDFDownloadLink ter href blob: (significa que o PDF foi gerado)
step('Aguardando geração do PDF (blob URL)…')
try {
  await page.waitForFunction(
    () => Array.from(document.querySelectorAll('a[download]'))
              .some(a => a.href.startsWith('blob:')),
    { timeout: 20000 }
  )
  ok('blob URL pronto!')
} catch {
  fail('Timeout: PDFDownloadLink não gerou blob URL em 20s')
  // Tira screenshot para diagnóstico e continua para ver o erro
  await page.screenshot({ path: `${SS}/pdf-02b-debug.png` })
}

// Pega o link com blob: href
const pdfLink = page.locator('a[download]').filter({ hasText: /pdf|gerando/i }).first()
const pdfLinkBlob = page.locator('a[download][href^="blob:"]').first()

let clickable = null
if (await pdfLinkBlob.count() > 0) { clickable = pdfLinkBlob; info('Encontrado: blob link') }
else if (await pdfLink.count() > 0) { clickable = pdfLink; info('Encontrado: link PDF (sem blob ainda)') }

if (!clickable) {
  fail('Elemento PDF não encontrado')
  await browser.close(); process.exit(1)
}
ok('Link PDF pronto para download')

step('Clicando PDF e aguardando download…')
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 30000 }),
  clickable.click(),
])

const filename = download.suggestedFilename()
const ext = path.extname(filename).toLowerCase()
info(`Arquivo: ${filename} | Extensão: ${ext}`)

const savePath = `${SS}/rdo-download${ext}`
await download.saveAs(savePath)

const size = statSync(savePath).size
info(`Tamanho: ${(size/1024).toFixed(1)} KB`)

if (ext === '.pdf' && size > 1024) {
  ok(`🎉 PDF REAL! (${(size/1024).toFixed(1)} KB)`)
} else if (ext === '.htm' || ext === '.html') {
  fail('Ainda gerando HTML — fix não aplicado')
} else {
  fail(`Extensão: ${ext}, tamanho: ${size} bytes`)
}

await page.screenshot({ path: `${SS}/pdf-03-final.png` })
await page.waitForTimeout(3000)
await browser.close()
console.log('\nConcluído. Screenshots em scripts/screenshots/pdf-*.png')
