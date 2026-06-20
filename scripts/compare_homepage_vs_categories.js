const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const indexHtmlPath = path.join(rootDir, 'index.html');
const indexElePath = path.join(rootDir, 'indexele.html');
const indexInstPath = path.join(rootDir, 'indexinst.html');
const indexMechPath = path.join(rootDir, 'indexmech.html');

function extractGridCards(html) {
    const startIdx = html.indexOf('<div class="silo-grid">');
    if (startIdx === -1) return [];
    // Just find all silo-cards in the grid
    const endIdx = html.indexOf('</section>', startIdx);
    const gridChunk = html.substring(startIdx, endIdx);
    
    const regex = /href=['"]\/?(.*?\.html)['"]/g;
    let match;
    const links = [];
    while ((match = regex.exec(gridChunk)) !== null) {
        const link = match[1];
        if (link.startsWith('index')) continue;
        links.push(link.toLowerCase());
    }
    return new Set(links);
}

function extractHomepageCards(html) {
    // There are multiple silo grids in index.html (Electrical, Instrumentation, Mechanical)
    // Let's find all hrefs in all elements with class "silo-card"
    const regex = /class=['"]silo-card.*?['"]\s+href=['"]\/?(.*?\.html)['"]/g;
    let match;
    const links = [];
    while ((match = regex.exec(html)) !== null) {
        links.push(match[1].toLowerCase());
    }
    return links;
}

async function check() {
    try {
        const indexHtml = await fs.promises.readFile(indexHtmlPath, 'utf8');
        const eleCards = extractGridCards(await fs.promises.readFile(indexElePath, 'utf8'));
        const instCards = extractGridCards(await fs.promises.readFile(indexInstPath, 'utf8'));
        const mechCards = extractGridCards(await fs.promises.readFile(indexMechPath, 'utf8'));

        const homepageCards = extractHomepageCards(indexHtml);
        console.log(`Homepage has ${homepageCards.length} cards.`);

        const missing = [];
        for (const card of homepageCards) {
            const isPresent = eleCards.has(card) || instCards.has(card) || mechCards.has(card);
            if (!isPresent) {
                missing.push(card);
            }
        }

        console.log('\n--- Homepage cards missing from category index pages ---');
        console.log(missing);

    } catch (err) {
        console.error(err);
    }
}

check();
