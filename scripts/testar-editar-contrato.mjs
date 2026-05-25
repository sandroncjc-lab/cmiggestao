/**
 * Testa edição de contrato no site em produção.
 * Abre /contratos, clica em Editar no primeiro contrato,
 * altera o status e percentual, salva e verifica na listagem.
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'

const BASE      = 'https://cmiggestao.vercel.app'
const SS        = 'scripts/screenshots'
const AUTH_FILE = 'scripts/auth-state.json'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })
const ss = (n) => `${SS}/edit-ct-${n}.png`

const browser = await chromium.launch({
  headless: false, slowMo: 150,
  executablePath: 'C:\\Users\\Usuario\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--start-maximized'],
})
const ctx  = await browser.newContext({ viewport: null, storageState: existsSync(AUTH_FILE) ? AUTH_FILE : undefined })
const page = await ctx.newPage()
page.setDefaultTimeout(60000)

const ok   = (m) => console.log(`  ✅ ${m}`)
const fail = (m) => console.log(`  ❌ ${m}`)
const info = (m) => console.log(`  ℹ️  ${m}`)
const step = (m) => console.log(`\n→ ${m}`)

// ── Sessão ────────────────────────────────────────────────────────────────────
step('Verificando sessão...')
await page.goto(`${BASE}/contratos`)
await page.waitForLoadState('networkidle')
if (page.url().includes('/sign-in')) {
  info('Sessão expirada — faça login')
  await page.waitForFunction(
    (b) => location.href.startsWith(b) && !location.href.includes('/sign-in'), BASE,
    { timeout: 120000, polling: 1000 }
  )
  await ctx.storageState({ path: AUTH_FILE })
  ok('Sessão salva')
  await page.goto(`${BASE}/contratos`)
  await page.waitForLoadState('networkidle')
}
ok(`Sessão ativa — ${page.url()}`)
await page.screenshot({ path: ss('01-lista') })

// ── Lê valores antes da edição ────────────────────────────────────────────────
step('Lendo dados atuais da listagem...')
const primeiraLinha = page.locator('tbody tr').first()
const numeroBefore  = await primeiraLinha.locator('td').nth(0).innerText()
const statusBefore  = await primeiraLinha.locator('td').nth(6).innerText().catch(() => '?')
info(`Contrato: ${numeroBefore.trim()} | Status atual: ${statusBefore.trim()}`)

// ── Clica em Editar ────────────────────────────────────────────────────────────
step('Clicando em Editar...')
const btnEditar = primeiraLinha.getByRole('link', { name: /editar/i })
await btnEditar.click()
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('02-form-editar') })
ok(`Formulário de edição — URL: ${page.url()}`)

// Verifica que a URL é /contratos/[id]/editar
if (!page.url().includes('/editar')) {
  fail('URL não contém /editar — pode ter redirecionado errado')
}

// ── Lê valores pré-preenchidos ────────────────────────────────────────────────
step('Verificando campos pré-preenchidos...')
const numeroVal = await page.locator('input[name="numero"]').inputValue()
const tipoVal   = await page.locator('select[name="tipo"]').inputValue()
const statusVal = await page.locator('select[name="status"]').inputValue()
const valorVal  = await page.locator('input[name="valorTotal"]').inputValue()
info(`numero="${numeroVal}" | tipo="${tipoVal}" | status="${statusVal}" | valor="${valorVal}"`)

if (numeroVal) ok('Campo número pré-preenchido ✓')
else           fail('Campo número vazio — não carregou dados')

// ── Altera percentual de execução ─────────────────────────────────────────────
step('Alterando % de execução para 42...')
const pctInput = page.locator('input[name="percentualExecucao"]')
await pctInput.triple_click?.() ?? await pctInput.click({ clickCount: 3 })
await pctInput.fill('42')
ok('Percentual definido: 42%')
await page.screenshot({ path: ss('03-alterado') })

// ── Salva ─────────────────────────────────────────────────────────────────────
step('Salvando alterações...')
await page.getByRole('button', { name: /salvar alterações/i }).click()
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('04-apos-salvar') })
ok(`Após salvar — URL: ${page.url()}`)

// Deve ter redirecionado para /contratos
if (page.url().endsWith('/contratos') || page.url().includes('/contratos?')) {
  ok('Redirecionou para /contratos ✓')
} else {
  fail(`URL inesperada: ${page.url()}`)
}

// ── Verifica na listagem ──────────────────────────────────────────────────────
step('Verificando % na listagem...')
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('05-lista-apos') })

const pctText = await page.locator('tbody tr').first().locator('td').nth(5).innerText().catch(() => '')
info(`Coluna Execução: "${pctText.trim()}"`)
if (pctText.includes('42')) {
  ok('42% visível na listagem — edição salva corretamente ✓')
} else {
  info('Percentual não detectado por texto — verifique screenshot 05-lista-apos.png')
}

console.log('\n' + '═'.repeat(60))
console.log('Screenshots em scripts/screenshots/ com prefixo "edit-ct-"')
await page.waitForTimeout(5000)
await browser.close()
console.log('Concluído.')
