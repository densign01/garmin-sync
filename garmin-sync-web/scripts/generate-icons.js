#!/usr/bin/env node
/**
 * Generates PWA icons using sharp
 * Run: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

// SVG icon with the app's gradient and lightning bolt
const createSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4f46e5"/>
      <stop offset="100%" style="stop-color:#2563eb"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#grad)"/>
  <path
    d="M${size * 0.54} ${size * 0.125}L${size * 0.167} ${size * 0.583}h${size * 0.292}v${size * 0.292}l${size * 0.375}-${size * 0.458}h${-size * 0.292}z"
    fill="white"
  />
</svg>
`;

async function generateIcons() {
  const publicDir = path.join(__dirname, '../public');

  for (const { name, size } of sizes) {
    const svg = createSvg(size);
    const outputPath = path.join(publicDir, name);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`Generated ${name} (${size}x${size})`);
  }

  console.log('Done!');
}

generateIcons().catch(console.error);
