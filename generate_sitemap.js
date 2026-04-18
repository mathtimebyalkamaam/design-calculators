const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const baseUrl = 'https://designcalculators.co.in';
const excludeFiles = ['sitemap.xml', 'sitemap2.html', 'license.html', '404.html', 'unit-converter (2).html', 'unit-converter (3).html'];

async function generateSitemap() {
    const files = fs.readdirSync(rootDir);
    const htmlFiles = files.filter(f => f.endsWith('.html') && !excludeFiles.includes(f));

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add Home Page first
    const homeStat = fs.statSync(path.join(rootDir, 'index.html'));
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${homeStat.mtime.toISOString().split('T')[0]}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;

    for (const file of htmlFiles) {
        if (file === 'index.html') continue;
        
        const filePath = path.join(rootDir, file);
        const stat = fs.statSync(filePath);
        const lastMod = stat.mtime.toISOString().split('T')[0];
        
        let priority = '0.8';
        if (file.startsWith('index')) priority = '0.9';
        if (file.startsWith('article')) priority = '0.7';

        xml += `  <url>\n    <loc>${baseUrl}/${file}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <priority>${priority}</priority>\n  </url>\n`;
    }

    xml += `</urlset>`;

    fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), xml, 'utf8');
    console.log(`Sitemap generated with ${htmlFiles.length} URLs.`);
}

generateSitemap().catch(console.error);
