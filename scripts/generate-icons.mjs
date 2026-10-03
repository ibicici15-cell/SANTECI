// Génère les images de l'app (icône, icône adaptative Android, écran de
// démarrage, favicon, icône de notification) à partir du logo vectoriel.
// Usage : npm i -D sharp && node scripts/generate-icons.mjs
import sharp from 'sharp'
import fs from 'node:fs'

const INK = '#201D19', ORANGE = '#F77F00', GREEN = '#00A651', PAPER = '#FAFAF7'
const PLANE = 'M-40,0 Q-38,-4 -20,-4 Q0,-4 8,0 Q0,4 -20,4 Q-38,4 -40,0 Z M-22,3 L-30,16 L-14,4 Z M-34,-3 L-38,-14 L-28,-4 Z'

// Trajectoire pointillée (points orange qui grossissent) + avion vert.
function art({ size = 1024, scale = 1, planeColor = GREEN, dotColor = ORANGE }) {
  const pts = []
  const N = 7
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1)
    // traînée dans l'axe de l'avion : part de la queue, file vers le bas-gauche
    const x = (1 - t) ** 2 * 300 + 2 * (1 - t) * t * 205 + t * t * 105
    const y = (1 - t) ** 2 * 548 + 2 * (1 - t) * t * 570 + t * t * 705
    pts.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(17 - t * 11).toFixed(1)}" fill="${dotColor}"/>`)
  }
  return `
  <g transform="translate(${size / 2} ${size / 2}) scale(${scale}) translate(${-size / 2} ${-size / 2})">
    <g transform="translate(48 0)">
      ${pts.join('')}
      <g transform="translate(745 350) rotate(-22) scale(10.6)">
        <path d="${PLANE}" fill="${planeColor}"/>
      </g>
    </g>
  </g>`
}

const svg = (inner, size = 1024, bg = null, rx = 0) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${bg ? `<rect width="${size}" height="${size}" rx="${rx}" fill="${bg}"/>` : ''}${inner}</svg>`)

const out = async (name, buf, size) => {
  await sharp(buf).resize(size, size).png().toFile(name)
  console.log('✓', name)
}

fs.mkdirSync('assets', { recursive: true })
fs.mkdirSync('native-assets/notification', { recursive: true })

// 1) Icône complète (fond plein) — 1024
await out('assets/icon-only.png', svg(art({}), 1024, INK), 1024)
// 2) Icône adaptative Android : avant-plan transparent + fond uni (Android applique lui-même la marge de sécurité)
await out('assets/icon-foreground.png', svg(art({ scale: 1 })), 1024)
await out('assets/icon-background.png', svg('', 1024, INK), 1024)
// 3) Écran de démarrage (2732²) : logo centré sur fond sombre
const splash = (bg, scale) => svg(art({ size: 1024, scale }), 1024, bg)
await sharp(splash(INK, 0.34)).resize(2732, 2732).png().toFile('assets/splash.png'); console.log('✓ assets/splash.png')
await sharp(splash(INK, 0.34)).resize(2732, 2732).png().toFile('assets/splash-dark.png'); console.log('✓ assets/splash-dark.png')
// 4) Web : favicon / icônes PWA
fs.mkdirSync('public/icons', { recursive: true })
await out('public/icons/icon-192.png', svg(art({}), 1024, INK, 230), 192)
await out('public/icons/icon-512.png', svg(art({}), 1024, INK, 230), 512)
await out('public/icons/apple-touch-icon.png', svg(art({}), 1024, INK), 180)
fs.writeFileSync('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="230" fill="${INK}"/>${art({})}</svg>`)
console.log('✓ public/favicon.svg')
// 5) Petite icône de notification Android : silhouette BLANCHE sur transparent
const silhouette = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="-48 -34 96 68"><g transform="rotate(-22) scale(1.05)"><path d="${PLANE}" fill="#fff"/></g></svg>`)
const sizes = { 'drawable-mdpi': 24, 'drawable-hdpi': 36, 'drawable-xhdpi': 48, 'drawable-xxhdpi': 72, 'drawable-xxxhdpi': 96 }
for (const [dir, px] of Object.entries(sizes)) {
  fs.mkdirSync(`native-assets/notification/${dir}`, { recursive: true })
  await sharp(silhouette, { density: 600 }).resize(px, px, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(`native-assets/notification/${dir}/ic_stat_notification.png`)
}
console.log('✓ icônes de notification')
