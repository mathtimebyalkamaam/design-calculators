const sharp = require('sharp');
const fs = require('fs');
const glob = require('glob');
const path = require('path');

async function optimizeImages() {
  console.log('Optimizing logo.png...');
  
  // Convert logo.png to WebP
  await sharp('logo.png')
    .webp({ quality: 80 })
    .toFile('logo.webp');
  console.log('Created logo.webp');

  // Compress logo.png (overwrite)
  const buffer = await sharp('logo.png')
    .png({ quality: 80, compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync('logo.png', buffer);
  console.log('Compressed logo.png');

  // Compress other images
  const images = ['android-chrome-512x512.png', 'android-chrome-192x192.png'];
  for (const img of images) {
    if (fs.existsSync(img)) {
      const imgBuffer = await sharp(img)
        .png({ quality: 80, compressionLevel: 9 })
        .toBuffer();
      fs.writeFileSync(img, imgBuffer);
      console.log(`Compressed ${img}`);
    }
  }

  // Update HTML files to use logo.webp for <img> tags
  console.log('Updating HTML files to use logo.webp...');
  try {
    const files = fs.readdirSync('.').filter(file => file.endsWith('.html'));
    let count = 0;
    files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      const newContent = content.replace(/<img src="\/logo\.png"/g, '<img src="/logo.webp"');
      if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        count++;
      }
    });
    console.log(`Updated ${count} HTML files to use logo.webp.`);
  } catch (err) {
    console.error(err);
  }
}

optimizeImages().catch(console.error);
