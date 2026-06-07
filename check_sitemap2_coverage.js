const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const sitemap2Path = path.join(rootDir, 'sitemap2.html');
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
        const sitemapContent = await fs.promises.readFile(sitemap2Path, 'utf8');
        const eleHtml = await fs.promises.readFile(indexElePath, 'utf8');
        const instHtml = await fs.promises.readFile(indexInstPath, 'utf8');
        const mechHtml = await fs.promises.readFile(indexMechPath, 'utf8');

        const eleCards = extractGridCards(eleHtml);
        const instCards = extractGridCards(instHtml);
        const mechCards = extractGridCards(mechHtml);

        // Find all hrefs in sitemap2.html
        const regex = /href=['"]\/?(.*?)['"]/g;
        let match;
        const sitemapFiles = [];
        while ((match = regex.exec(sitemapContent)) !== null) {
            const link = match[1];
            if (link.startsWith('index') || link === '') continue;
            sitemapFiles.push(link.toLowerCase());
        }

        const excluded = [
            'sitemap.xml', 'sitemap.html', '404.html', 'about.html',
            'contact.html', 'faq.html', 'privacy-policy.html', 'terms-of-service.html',
            'license.html', 'articles.html'
        ];

        console.log(`Total links in sitemap2.html: ${sitemapFiles.length}`);

        const missing = [];
        for (const file of sitemapFiles) {
            if (excluded.includes(file)) continue;
            if (file.startsWith('article')) continue;

            const isPresent = eleCards.has(file) || instCards.has(file) || mechCards.has(file);
            if (!isPresent) {
                missing.push(file);
            }
        }

        console.log('\n--- Sitemap2 links missing from category grids ---');
        console.log(missing);

    } catch (err) {
        console.error(err);
    }
}

check();
