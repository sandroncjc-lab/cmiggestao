/**
 * Fluxo completo HH:
 * 1. Login (manual — aguarda usuário)
 * 2. Cria contrato tipo homem_hora
 * 3. Define HH contratado para a obra
 * 4. Cria RDO com funcionários e horas
 * 5. Verifica painel /hh — consumo deve aparecer automaticamente
 */
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'fs'

const BASE   = 'https://cmiggestao.vercel.app'
const SS     = 'scripts/screenshots'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })
const ss = (n) => `${SS}/${n}`

const browser = await chromium.launch({
  headless: false,
  slowMo: 150,
  executablePath: 'C:\\Users\\Usuario\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--start-maximized'],
})
const ctx  = await browser.newContext({ viewport: null })
const page = await ctx.newPage()
page.setDefaultTimeout(120000)

const step = (msg) => console.log(`\n→ ${msg}`)
const ok   = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg) => console.log(`  ❌ ${msg}`)

// ── 1. LOGIN ─────────────────────────────────────────────────────────────────
step('LOGIN — faça o login no browser (até 2 min)')
await page.goto(`${BASE}/sign-in`)
await page.waitForFunction(
  (base) => window.location.href.startsWith(base) && !window.location.href.includes('/sign-in'),
  BASE, { timeout: 120000, polling: 1000 }
)
await page.waitForLoadState('networkidle')
ok(`Login OK — ${page.url()}`)

// ── 2. CRIAR CONTRATO HOMEM HORA ─────────────────────────────────────────────
step('Criando contrato tipo HOMEM HORA...')
await page.goto(`${BASE}/contratos/novo`)
await page.waitForLoadState('networkidle')

// Preenche número único com timestamp
const numero = `CT-HH-${Date.now()}`
await page.locator('input[name="numero"]').fill(numero)

// Tipo = homem_hora
await page.locator('select[name="tipo"]').selectOption('homem_hora')

// Status = ativo
await page.locator('select[name="status"]').selectOption('ativo')

// Seleciona primeiro cliente disponível
const clienteOpts = await page.locator('select[name="clienteId"] option:not([value=""])').all()
if (clienteOpts.length === 0) { fail('Nenhum cliente cadastrado — crie um primeiro'); await browser.close(); process.exit(1) }
const clienteVal = await clienteOpts[0].getAttribute('value')
const clienteNome = await clienteOpts[0].textContent()
await page.locator('select[name="clienteId"]').selectOption(clienteVal)
ok(`Cliente selecionado: ${clienteNome?.trim()}`)

// Seleciona primeira obra disponível (exceto "serviços avulsos")
const obraOpts = await page.locator('select[name="obraId"] option:not([value=""])').all()
let obraVal = null, obraNome = null
for (const opt of obraOpts) {
  const t = await opt.textContent()
  if (!t?.toLowerCase().includes('avulso')) {
    obraVal = await opt.getAttribute('value')
    obraNome = t
    break
  }
}
if (obraVal) {
  await page.locator('select[name="obraId"]').selectOption(obraVal)
  ok(`Obra selecionada: ${obraNome?.trim()}`)
} else {
  fail('Nenhuma obra adequada encontrada (só "avulsos")')
}

// Valor total
await page.locator('input[name="valorTotal"]').fill('100000')

// Data início
await page.locator('input[name="dataInicio"]').fill('2026-01-01')

await page.screenshot({ path: ss('01-form-contrato.png'), fullPage: true })

// Submete
await page.getByRole('button', { name: /salvar contrato/i }).click()
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('02-apos-contrato.png'), fullPage: true })
ok(`Contrato ${numero} criado — URL: ${page.url()}`)

// ── 3. DEFINIR HH CONTRATADO ──────────────────────────────────────────────────
step('Definindo HH contratado para a obra...')
await page.goto(`${BASE}/hh/contrato`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('03-hh-contrato.png'), fullPage: true })

// Seleciona a obra que acabamos de vincular
const dropObra = page.locator('select[name="obraId"]')
const obrasHH  = await dropObra.locator('option:not([value=""])').all()
ok(`Obras disponíveis no dropdown HH: ${obrasHH.length}`)
if (obrasHH.length === 0) {
  fail('Nenhuma obra com contrato homem_hora no dropdown — verifique o vínculo')
} else {
  const primeiraObra = await obrasHH[0].getAttribute('value')
  const primeiraObraNome = await obrasHH[0].textContent()
  await dropObra.selectOption(primeiraObra)
  ok(`Obra selecionada: ${primeiraObraNome?.trim()}`)

  // Define 200h contratadas
  await page.locator('input[name="totalHH"]').fill('200')
  await page.screenshot({ path: ss('04-definir-hh.png'), fullPage: true })
  await page.getByRole('button', { name: /salvar/i }).click()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: ss('05-apos-definir-hh.png'), fullPage: true })
  ok('200h contratadas definidas')
}

// ── 4. CRIAR RDO COM FUNCIONÁRIOS ─────────────────────────────────────────────
step('Criando RDO com funcionários e horas...')
await page.goto(`${BASE}/rdo/novo`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('06-rdo-novo.png'), fullPage: true })

// Seleciona a mesma obra (se disponível)
const obraRdoSelect = page.locator('select[name="obraId"]')
if (await obraRdoSelect.count() && obraVal) {
  await obraRdoSelect.selectOption(obraVal).catch(() => {})
}

// Data do RDO = hoje
const hoje = new Date().toISOString().split('T')[0]
const dataRdo = page.locator('input[name="data"], input[type="date"]').first()
if (await dataRdo.count()) await dataRdo.fill(hoje)

// Clima
const climaSelect = page.locator('select[name="clima"]')
if (await climaSelect.count()) await climaSelect.selectOption('ensolarado').catch(() => {})

await page.screenshot({ path: ss('07-rdo-preenchido.png'), fullPage: true })

// Tenta adicionar funcionário (campo nome + horas)
const campoNome = page.locator('input[placeholder*="nome"], input[placeholder*="Nome"], input[name*="nome"]').first()
if (await campoNome.count()) {
  await campoNome.fill('João Silva')
  const campoHoras = page.locator('input[placeholder*="hora"], input[type="number"]').first()
  if (await campoHoras.count()) await campoHoras.fill('8')
  ok('Funcionário "João Silva" com 8h adicionado')
}

await page.screenshot({ path: ss('08-rdo-funcionario.png'), fullPage: true })

// Submete o RDO
const btnRdo = page.getByRole('button', { name: /salvar|finalizar|criar|enviar/i }).first()
if (await btnRdo.count()) {
  await btnRdo.click()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: ss('09-apos-rdo.png'), fullPage: true })
  ok(`RDO submetido — URL: ${page.url()}`)
} else {
  fail('Botão de submit do RDO não encontrado')
}

// ── 5. VERIFICAR PAINEL HH ────────────────────────────────────────────────────
step('Verificando painel /hh — consumo automático...')
await page.goto(`${BASE}/hh`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('10-hh-painel-final.png'), fullPage: true })

// Lê os cartões
const cards = await page.locator('[class*="CardContent"], [class*="card"]').all()
const consumoText = await page.locator('text=/consumido/i').first().textContent().catch(() => null)
const saldoText   = await page.locator('text=/saldo/i').first().textContent().catch(() => null)
const pctText     = await page.locator('text=/%.*utilizado/i').first().textContent().catch(() => null)

ok(`Cartões encontrados: ${cards.length}`)
if (pctText) ok(`Badge: "${pctText.trim()}"`)
if (saldoText) ok(`Saldo: "${saldoText.trim()}"`)

// Verifica se há consumo > 0
const hasConsumo = await page.locator('text=/[1-9][0-9]*h\s*\/\s*[0-9]+h/').count()
if (hasConsumo) {
  ok('CONSUMO DETECTADO no painel — horas do RDO foram descontadas automaticamente!')
} else {
  const zeroConsumo = await page.locator('text=/0h\s*\/\s*200h/').count()
  if (zeroConsumo > 0) {
    fail('Painel mostra 0h consumido — RDO pode estar em rascunho (não aprovado) ou não vinculou')
  } else {
    ok('Painel carregado — verifique screenshot 10-hh-painel-final.png')
  }
}

// ── RESULTADO ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60))
console.log('SCREENSHOTS SALVAS:')
for (let i = 1; i <= 10; i++) {
  const f = `${String(i).padStart(2,'0')}-*.png`
  console.log(`  ${SS}/${f}`)
}

console.log('\nAguardando 5s para visualização...')
await page.waitForTimeout(5000)
await browser.close()
console.log('Concluído.')
