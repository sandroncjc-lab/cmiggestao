/**
 * Gera os ícones PWA a partir de /public/logo-cmig.png
 *
 * Uso:
 *   node scripts/gerar-icones.mjs
 *
 * Saída em /public/icons/:
 *   icon-192.png          — ícone padrão 192x192
 *   icon-512.png          — ícone padrão 512x512
 *   icon-512-maskable.png — versão maskable (logo com padding 20% em fundo azul)
 *   apple-touch-icon.png  — 180x180 para iOS Safari
 */
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

const ROOT   = process.cwd()
const SRC    = path.join(ROOT, 'public', 'logo-cmig.png')
const OUTDIR = path.join(ROOT, 'public', 'icons')

if (!existsSync(SRC)) {
  console.error('❌ Arquivo não encontrado: public/logo-cmig.png')
  console.error('   Coloque o logo (PNG quadrado, mínimo 512x512) nesse caminho e rode novamente.')
  process.exit(1)
}

if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true })

const BRAND_COLOR = '#1e40af' // blue-800

// Gera ícone simples (logo redimensionado, fundo branco)
async function gerarIcone(tamanho, nome) {
  await sharp(SRC)
    .resize(tamanho, tamanho, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(OUTDIR, nome))
  console.log(`  ✅ ${nome} (${tamanho}x${tamanho})`)
}

// Gera versão maskable: logo com 20% de padding, fundo na cor da marca
async function gerarMaskable(tamanho, nome) {
  // Área segura: 80% do total → logo ocupa 60% (20% padding de cada lado)
  const logoSize = Math.round(tamanho * 0.6)
  const padding  = Math.round((tamanho - logoSize) / 2)

  const logoBuffer = await sharp(SRC)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const bg = sharp({
    create: {
      width: tamanho,
      height: tamanho,
      channels: 4,
      background: { r: 30, g: 64, b: 175, alpha: 1 }, // #1e40af
    },
  })

  await bg
    .composite([{ input: logoBuffer, top: padding, left: padding }])
    .png()
    .toFile(path.join(OUTDIR, nome))
  console.log(`  ✅ ${nome} (${tamanho}x${tamanho} maskable)`)
}

console.log(`\n→ Gerando ícones PWA a partir de: ${SRC}\n`)

await gerarIcone(192, 'icon-192.png')
await gerarIcone(512, 'icon-512.png')
await gerarMaskable(512, 'icon-512-maskable.png')
await gerarIcone(180, 'apple-touch-icon.png')

console.log(`\n✅ Ícones salvos em public/icons/`)
console.log('   Faça o build e deploy para aplicar.')
