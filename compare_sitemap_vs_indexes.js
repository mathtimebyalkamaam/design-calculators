const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const sitemapPath = path.join(rootDir, 'sitemap.xml');
const indexElePath = path.join(rootDir, 'indexele.html');
const indexInstPath = path.join(rootDir, 'indexinst.html');
const indexMechPath = path.join(rootDir, 'indexmech.html');

function extractGridCards(html) {
    const startIdx = html.indexOf('<div class="silo-grid">');
    if (startIdx === -1) return [];
    const endIdx = html.indexOf('</section>', startIdx);
    const gridChunk = html.substring(startIdx, endIdx);
    
    const regex = /href=['"]\/?(.*?)['"]/g;
    let match;
    const links = [];
    while ((match = regex.exec(gridChunk)) !== null) {
        const link = match[1];
        if (link.startsWith('index') || link === '') continue;
        links.push(link.toLowerCase());
    }
    return new Set(links);
}

async function check() {
    try {
        const sitemapContent = await fs.promises.readFile(sitemapPath, 'utf8');
        const eleHtml = await fs.promises.readFile(indexElePath, 'utf8');
        const instHtml = await fs.promises.readFile(indexInstPath, 'utf8');
        const mechHtml = await fs.promises.readFile(indexMechPath, 'utf8');

        const eleCards = extractGridCards(eleHtml);
        const instCards = extractGridCards(instHtml);
        const mechCards = extractGridCards(mechHtml);

        const locRegex = /<loc>(.*?)<\/loc>/g;
        let match;
        const sitemapFiles = [];

        while ((match = locRegex.exec(sitemapContent)) !== null) {
            const url = match[1];
            const basename = url.split('/').pop();
            if (!basename) continue;
            sitemapFiles.push(basename.toLowerCase());
        }

        const excluded = [
            'index.html', 'indexele.html', 'indexinst.html', 'indexmech.html',
            'sitemap.html', 'sitemap2.html', '404.html', 'about.html',
            'contact.html', 'faq.html', 'privacy-policy.html', 'terms-of-service.html',
            'license.html', 'articles.html'
        ];

        console.log(`Sitemap files count: ${sitemapFiles.length}`);

        const missing = [];

        for (const file of sitemapFiles) {
            if (excluded.includes(file)) continue;
            if (file.startsWith('index')) continue;
            if (file.startsWith('article')) continue;

            const isPresent = eleCards.has(file) || instCards.has(file) || mechCards.has(file);
            if (!isPresent) {
                missing.push(file);
            }
        }

        console.log('\n--- Sitemap files missing from category grids ---');
        console.log(missing);

    } catch (err) {
        console.error(err);
    }
}

check();
