/**
 * Gera ícones placeholder (fundo azul, sem logo) para o build passar.
 * Execute: node scripts/gerar-icones-placeholder.mjs
 * Depois substitua rodando: node scripts/gerar-icones.mjs (com logo-cmig.png)
 */
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const OUTDIR = path.join(process.cwd(), 'public', 'icons')
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true })

const sizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 512, name: 'icon-512-maskable.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]

for (const { size, name } of sizes) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 30, g: 64, b: 175, alpha: 1 }, // #1e40af blue-800
    },
  })
    .png()
    .toFile(path.join(OUTDIR, name))
  console.log(`✅ ${name}`)
}

console.log('\nPlaceholders gerados. Substitua com: node scripts/gerar-icones.mjs')
