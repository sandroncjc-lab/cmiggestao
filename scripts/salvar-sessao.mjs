/**
 * Abre o browser para login e salva a sessão em scripts/auth-state.json
 * Execute UMA VEZ após qualquer logout. Depois, todos os outros scripts
 * usarão essa sessão salva sem precisar logar novamente.
 */
import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'

const BASE = 'https://cmiggestao.vercel.app'
const SS   = 'scripts/screenshots'
if (!existsSync(SS)) mkdirSync(SS, { recursive: true })

const browser = await chromium.launch({
  headless: false,
  slowMo: 100,
  executablePath: 'C:\\Users\\Usuario\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
  args: ['--start-maximized'],
})

// Contexto SEM state salvo — para fazer login
const ctx  = await browser.newContext({ viewport: null })
const page = await ctx.newPage()
page.setDefaultTimeout(180000)

console.log('→ Abrindo login. Faça login normalmente (até 3 min)...')
await page.goto(`${BASE}/sign-in`)

// Aguarda sair da página de login
await page.waitForFunction(
  (base) => window.location.href.startsWith(base) && !window.location.href.includes('/sign-in'),
  BASE, { timeout: 180000, polling: 1000 }
)
await page.waitForLoadState('networkidle')
console.log(`✅ Login OK — ${page.url()}`)

// Salva a sessão (cookies + localStorage)
await ctx.storageState({ path: 'scripts/auth-state.json' })
console.log('✅ Sessão salva em scripts/auth-state.json')
console.log('   Todos os outros scripts usarão essa sessão automaticamente.')

await page.waitForTimeout(2000)
await browser.close()
