const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const toolsDbPath = path.join(rootDir, 'tools_db.js');
const indexElePath = path.join(rootDir, 'indexele.html');
const indexInstPath = path.join(rootDir, 'indexinst.html');
const indexMechPath = path.join(rootDir, 'indexmech.html');

function extractGridCards(html) {
    const startIdx = html.indexOf('<div class="silo-grid">');
    if (startIdx === -1) return new Set();
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

async function audit() {
    try {
        let toolsDbContent = await fs.promises.readFile(toolsDbPath, 'utf8');
        toolsDbContent = toolsDbContent.replace('window.TOOLS_DB =', 'module.exports =');
        
        const tempJsPath = path.join(rootDir, 'temp_tools_db.js');
        await fs.promises.writeFile(tempJsPath, toolsDbContent, 'utf8');
        const tools = require(tempJsPath);
        await fs.promises.unlink(tempJsPath);

        const registeredHrefs = new Map(tools.map(t => [t.href.toLowerCase(), t]));

        const eleCards = extractGridCards(await fs.promises.readFile(indexElePath, 'utf8'));
        const instCards = extractGridCards(await fs.promises.readFile(indexInstPath, 'utf8'));
        const mechCards = extractGridCards(await fs.promises.readFile(indexMechPath, 'utf8'));

        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        const excluded = [
            'index.html', 'indexele.html', 'indexinst.html', 'indexmech.html',
            'sitemap.html', 'sitemap2.html', '404.html', 'about.html',
            'contact.html', 'faq.html', 'privacy-policy.html', 'terms-of-service.html',
            'license.html', 'articles.html'
        ];

        console.log(`Auditing ${htmlFiles.length} HTML files...`);

        const results = [];

        for (const file of htmlFiles) {
            const lowerFile = file.toLowerCase();
            if (excluded.includes(lowerFile)) continue;
            if (lowerFile.startsWith('index')) continue;
            if (lowerFile.startsWith('article')) continue;

            const filePath = path.join(rootDir, file);
            const content = await fs.promises.readFile(filePath, 'utf8');
            
            // Extract Title
            const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : 'No Title';

            const inDb = registeredHrefs.has(lowerFile);
            const dbEntry = registeredHrefs.get(lowerFile);
            const category = dbEntry ? dbEntry.category : 'N/A';

            const inEle = eleCards.has(lowerFile);
            const inInst = instCards.has(lowerFile);
            const inMech = mechCards.has(lowerFile);
            const inGrid = inEle || inInst || inMech;

            results.push({
                file,
                title,
                inDb,
                category,
                inGrid,
                inEle,
                inInst,
                inMech
            });
        }

        // Print files that are in DB but not in category grid, or in directory but not in DB
        console.log('\n--- Auditing Results ---');
        let issuesFound = false;

        for (const res of results) {
            if (!res.inDb) {
                console.log(`  [ALERT: NOT IN DB] File '${res.file}' is in the directory but not registered in tools_db.js.`);
                issuesFound = true;
            }
            if (res.inDb && !res.inGrid) {
                console.log(`  [ALERT: NOT IN GRID] File '${res.file}' (Category: ${res.category}) is in tools_db.js but has no card in indexele/inst/mech.html.`);
                issuesFound = true;
            }
        }

        if (!issuesFound) {
            console.log('  No missing files, category mismatches, or grid discrepancies found between the directory, tools_db.js, and index grids!');
        }

    } catch (err) {
        console.error(err);
    }
}

audit();
