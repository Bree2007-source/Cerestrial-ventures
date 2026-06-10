import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const iconsDir = './public/icons'
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#166534"/>
  <g fill="white">
    <rect x="248" y="160" width="16" height="220" rx="8"/>
    <ellipse cx="200" cy="200" rx="35" ry="20" transform="rotate(-30 200 200)"/>
    <ellipse cx="190" cy="250" rx="35" ry="20" transform="rotate(-25 190 250)"/>
    <ellipse cx="195" cy="300" rx="30" ry="18" transform="rotate(-20 195 300)"/>
    <ellipse cx="312" cy="200" rx="35" ry="20" transform="rotate(30 312 200)"/>
    <ellipse cx="322" cy="250" rx="35" ry="20" transform="rotate(25 322 250)"/>
    <ellipse cx="317" cy="300" rx="30" ry="18" transform="rotate(20 317 300)"/>
    <ellipse cx="256" cy="175" rx="20" ry="35"/>
  </g>
  <text x="256" y="430" text-anchor="middle" font-family="Arial, sans-serif"
    font-weight="bold" font-size="72" fill="white" letter-spacing="4">CV</text>
</svg>`

fs.writeFileSync('./public/icons/icon.svg', svgIcon)
console.log('✅ SVG icon created')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const svgBuffer = Buffer.from(svgIcon)

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n')
  for (const size of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `icon-${size}x${size}.png`))
      console.log(`✅ icon-${size}x${size}.png created`)
    } catch (err) {
      console.error(`❌ Failed ${size}x${size}:`, err.message)
    }
  }
  console.log('\n🎉 All icons generated successfully!')
}

generateIcons().catch(console.error)