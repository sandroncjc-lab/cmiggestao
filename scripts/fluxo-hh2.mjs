/**
 * Fluxo HH completo (v2) — usa sessão salva em scripts/auth-state.json
 * Se não existir, abre login manual.
 *
 * 1. /hh/contrato → selecionar AMAGGI MAN → definir 200h → salvar
 * 2. /rdo/novo    → 6 passos → funcionário "João Silva 8h" → salvar rascunho
 * 3. /hh          → verificar cartão AMAGGI MAN com consumo
 */
import { chromium } from 'playwright'
import { mkdirSync, existsSync } from 'fs'

const BASE      = 'https://cmiggestao.vercel.app'
const SS        = 'scripts/screenshots'
const AUTH_FILE = 'scripts/auth-state.json'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })
const ss = (n) => `${SS}/${n}.png`

const browser = await chromium.launch({
  headless: false,
  slowMo: 150,
  executablePath: 'C:\\Users\\Usuario\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--start-maximized'],
})

// Usa sessão salva se existir
const ctxOptions = existsSync(AUTH_FILE)
  ? { viewport: null, storageState: AUTH_FILE }
  : { viewport: null }

const ctx  = await browser.newContext(ctxOptions)
const page = await ctx.newPage()
page.setDefaultTimeout(60000)

const step = (msg) => console.log(`\n→ ${msg}`)
const ok   = (msg) => console.log(`  ✅ ${msg}`)
const fail = (msg) => console.log(`  ❌ ${msg}`)
const info = (msg) => console.log(`  ℹ️  ${msg}`)

// ── LOGIN (só se necessário) ───────────────────────────────────────────────────
step('Verificando sessão...')
await page.goto(`${BASE}/dashboard`)
await page.waitForLoadState('networkidle')

if (page.url().includes('/sign-in')) {
  info('Sessão expirada — faça login (até 2 min)')
  await page.waitForFunction(
    (base) => window.location.href.startsWith(base) && !window.location.href.includes('/sign-in'),
    BASE, { timeout: 120000, polling: 1000 }
  )
  await page.waitForLoadState('networkidle')
  // Salva nova sessão
  await ctx.storageState({ path: AUTH_FILE })
  ok('Nova sessão salva')
} else {
  ok(`Sessão ativa — ${page.url()}`)
}
await page.screenshot({ path: ss('01-dashboard') })

// ── 1. DEFINIR HH CONTRATADO ──────────────────────────────────────────────────
step('Definindo HH em /hh/contrato...')
await page.goto(`${BASE}/hh/contrato`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('02-hh-contrato') })

const dropObra = page.locator('select[name="obraId"]')
const opts = await dropObra.locator('option:not([value=""])').all()
info(`Obras no dropdown HH: ${opts.length}`)

if (opts.length === 0) {
  fail('Nenhuma obra no dropdown. Contrato homem_hora não encontrado.')
  await page.screenshot({ path: ss('02b-sem-obras') })
} else {
  let obraVal = null, obraNome = null
  for (const o of opts) {
    const t = (await o.textContent()) ?? ''
    if (t.toUpperCase().includes('AMAGGI')) {
      obraVal = await o.getAttribute('value')
      obraNome = t
      break
    }
  }
  if (!obraVal) {
    obraVal = await opts[0].getAttribute('value')
    obraNome = await opts[0].textContent()
    info('AMAGGI não encontrada, usando primeira obra')
  }
  await dropObra.selectOption(obraVal)
  ok(`Obra selecionada: ${obraNome?.trim()}`)

  await page.locator('input[name="totalHH"]').fill('200')
  await page.screenshot({ path: ss('03-definir-200h') })
  await page.getByRole('button', { name: /salvar/i }).click()
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: ss('04-apos-hh') })
  ok(`HH definido — URL: ${page.url()}`)
}

// ── 2. CRIAR RDO (6 passos) ────────────────────────────────────────────────────
step('Criando RDO via /rdo/novo (6 passos)...')
await page.goto(`${BASE}/rdo/novo`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('05-rdo-step1') })

// PASSO 1: Obra + Data + Clima
info('Passo 1 — Dados Gerais')
const obraSelect = page.locator('select').first()
const obraOpts = await obraSelect.locator('option:not([value=""])').all()
let rdoObraVal = null
for (const o of obraOpts) {
  const t = (await o.textContent()) ?? ''
  if (t.toUpperCase().includes('AMAGGI')) { rdoObraVal = await o.getAttribute('value'); break }
}
if (!rdoObraVal && obraOpts.length) rdoObraVal = await obraOpts[0].getAttribute('value')
if (rdoObraVal) await obraSelect.selectOption(rdoObraVal)

const dateInput = page.locator('input[type="date"]').first()
if (await dateInput.count()) await dateInput.fill(new Date().toISOString().split('T')[0])

await page.screenshot({ path: ss('06-step1-preenchido') })
await page.getByRole('button', { name: /próximo/i }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: ss('07-step2') })

// PASSO 2: Atividades
info('Passo 2 — Atividades')
const descInput = page.locator('input[placeholder*="tividade"], input[placeholder*="screva a atividade"]').first()
if (await descInput.count()) {
  await descInput.fill('Montagem estrutural — tubulação principal')
}
const times = await page.locator('input[type="time"]').all()
if (times.length >= 1) await times[0].fill('07:00')
if (times.length >= 2) await times[1].fill('17:00')

await page.screenshot({ path: ss('08-step2-preenchido') })
await page.getByRole('button', { name: /próximo/i }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: ss('09-step3') })

// PASSO 3: Funcionários
info('Passo 3 — Funcionários')
const nomeInput   = page.locator('input[placeholder*="ome do func"]').first()
const funcaoInput = page.locator('input[placeholder*="Soldador"], input[placeholder*="x: Soldador"]').first()
const horasInput  = page.locator('input[type="number"][placeholder="8"]').first()

if (await nomeInput.count())   { await nomeInput.fill('João Silva');  ok('Nome: João Silva') }
if (await funcaoInput.count()) { await funcaoInput.fill('Soldador');   ok('Função: Soldador') }
if (await horasInput.count())  { await horasInput.fill('8');           ok('Horas: 8') }

await page.screenshot({ path: ss('10-step3-preenchido') })
await page.getByRole('button', { name: /próximo/i }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: ss('11-step4') })

// PASSO 4: Serviços (pula)
info('Passo 4 — Serviços (pulando)')
await page.getByRole('button', { name: /próximo/i }).click()
await page.waitForTimeout(600)

// PASSO 5: Fotos (pula)
info('Passo 5 — Fotos (pulando)')
await page.getByRole('button', { name: /próximo/i }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: ss('12-step6-assinatura') })

// PASSO 6: Assinatura → Salvar Rascunho
info('Passo 6 — Salvando como rascunho...')
const btnRascunho = page.getByRole('button', { name: /salvar rascunho/i })
const btnEnviar   = page.getByRole('button', { name: /enviar para aprovação/i })

if (await btnRascunho.count()) {
  await btnRascunho.click()
} else if (await btnEnviar.count()) {
  await btnEnviar.click()
} else {
  fail('Botão de submit não encontrado no passo 6')
}

await page.waitForTimeout(3000) // toast + redirect pode demorar
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('13-apos-rdo') })
ok(`RDO submetido — URL: ${page.url()}`)

// ── 3. VERIFICAR PAINEL HH ────────────────────────────────────────────────────
step('Verificando painel /hh...')
await page.goto(`${BASE}/hh`)
await page.waitForLoadState('networkidle')
await page.screenshot({ path: ss('14-hh-painel') })

const bodyText = await page.locator('body').innerText()

// Cartão AMAGGI
const amaggiCount = await page.locator('text=/AMAGGI/i').count()
ok(`Cartão AMAGGI visível: ${amaggiCount > 0 ? 'SIM ✓' : 'NÃO ✗'}`)

// Consumo detectado
const horasMatch = bodyText.match(/(\d+(?:\.\d+)?)\s*h\s*\/\s*(\d+(?:\.\d+)?)\s*h/)
if (horasMatch) {
  const consumido = parseFloat(horasMatch[1])
  const total     = parseFloat(horasMatch[2])
  if (consumido > 0) {
    ok(`🎉 CONSUMO DETECTADO: ${consumido}h de ${total}h — HH automático funcionando!`)
  } else {
    info(`Painel: 0h de ${total}h — se novo RDO acabou de ser criado, aguarde deploy ou force refresh`)
  }
} else {
  info('Padrão "Xh / Yh" não encontrado — veja screenshot 14-hh-painel.png')
}

// ── RESULTADO ──────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(60))
console.log('SCREENSHOTS em scripts/screenshots/:')
console.log('  01-dashboard, 02-hh-contrato, 03-definir-200h')
console.log('  04-apos-hh, 05..12 rdo steps, 13-apos-rdo, 14-hh-painel')

console.log('\nAguardando 8s...')
await page.waitForTimeout(8000)
await browser.close()
console.log('Concluído.')
