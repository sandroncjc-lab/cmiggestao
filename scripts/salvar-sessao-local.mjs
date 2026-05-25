import { chromium } from 'playwright'

const BASE      = 'http://localhost:3000'
const AUTH_FILE = 'scripts/auth-state-local.json'

const browser = await chromium.launch({
  headless: false, slowMo: 200,
  executablePath: 'C:/Users/Usuario/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe',
  args: ['--start-maximized'],
})

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
page.setDefaultTimeout(180000)  // 3 minutos

console.log('\n→ Abrindo localhost:3000...')
console.log('  Faça login com sandronc.jc@gmail.com')
console.log('  Após o login, o script salva a sessão automaticamente.\n')

await page.goto(BASE, { waitUntil: 'domcontentloaded' })

// Aguarda sair da tela de sign-in (até 3 minutos para o usuário logar)
await page.waitForURL(url => !url.toString().includes('sign-in'), { timeout: 180000 })

console.log(`  ✅ Login! URL: ${page.url()}`)
await ctx.storageState({ path: AUTH_FILE })
console.log(`  ✅ Sessão salva em ${AUTH_FILE}`)
await page.waitForTimeout(2000)
await browser.close()
