const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const toolsDbPath = path.join(rootDir, 'tools_db.js');

async function check() {
    try {
        let toolsDbContent = await fs.promises.readFile(toolsDbPath, 'utf8');
        toolsDbContent = toolsDbContent.replace('window.TOOLS_DB =', 'module.exports =');
        
        const tempJsPath = path.join(rootDir, 'temp_tools_db.js');
        await fs.promises.writeFile(tempJsPath, toolsDbContent, 'utf8');
        const tools = require(tempJsPath);
        await fs.promises.unlink(tempJsPath);

        const registeredHrefs = new Set(tools.map(t => t.href.toLowerCase()));

        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        const excluded = [
            'index.html', 'indexele.html', 'indexinst.html', 'indexmech.html',
            'sitemap.html', 'sitemap2.html', '404.html', 'about.html',
            'contact.html', 'faq.html', 'privacy-policy.html', 'terms-of-service.html',
            'license.html', 'articles.html'
        ];

        const missingFromDb = [];

        for (const file of htmlFiles) {
            const lowerFile = file.toLowerCase();
            if (excluded.includes(lowerFile)) continue;
            if (lowerFile.startsWith('index')) continue;
            if (lowerFile.startsWith('article')) continue;

            if (!registeredHrefs.has(lowerFile)) {
                missingFromDb.push(file);
            }
        }

        console.log('\n--- HTML Files not in tools_db.js ---');
        console.log(missingFromDb);

    } catch (err) {
        console.error(err);
    }
}

check();
