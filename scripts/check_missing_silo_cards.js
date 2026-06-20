const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const toolsDbPath = path.join(rootDir, 'tools_db.js');
const indexElePath = path.join(rootDir, 'indexele.html');
const indexInstPath = path.join(rootDir, 'indexinst.html');
const indexMechPath = path.join(rootDir, 'indexmech.html');

async function check() {
    try {
        let toolsDbContent = await fs.promises.readFile(toolsDbPath, 'utf8');
        // Clean up window.TOOLS_DB to be JSON/JS readable in node
        toolsDbContent = toolsDbContent.replace('window.TOOLS_DB =', 'module.exports =');
        
        // Write a temp file to require it
        const tempJsPath = path.join(rootDir, 'temp_tools_db.js');
        await fs.promises.writeFile(tempJsPath, toolsDbContent, 'utf8');
        const tools = require(tempJsPath);
        await fs.promises.unlink(tempJsPath);

        const eleHtml = await fs.promises.readFile(indexElePath, 'utf8');
        const instHtml = await fs.promises.readFile(indexInstPath, 'utf8');
        const mechHtml = await fs.promises.readFile(indexMechPath, 'utf8');

        // Extract silo-grid content
        const extractSiloGrid = (html, filename) => {
            const startIdx = html.indexOf('<div class="silo-grid">');
            if (startIdx === -1) {
                console.error(`Could not find silo-grid in ${filename}`);
                return '';
            }
            // Find the matching closing div for silo-grid. Since there are nested divs, let's find the closing tag.
            // A simple approximation is to find the next </section> or loop to find the end.
            const endIdx = html.indexOf('</section>', startIdx);
            if (endIdx === -1) {
                return html.substring(startIdx);
            }
            return html.substring(startIdx, endIdx);
        };

        const eleGrid = extractSiloGrid(eleHtml, 'indexele.html');
        const instGrid = extractSiloGrid(instHtml, 'indexinst.html');
        const mechGrid = extractSiloGrid(mechHtml, 'indexmech.html');

        console.log(`Loaded ${tools.length} tools from tools_db.js.`);

        const missing = [];

        for (const tool of tools) {
            if (tool.category === 'articles') continue; // skip articles
            
            let gridToSearch = '';
            let fileSearching = '';
            if (tool.category === 'electrical') {
                gridToSearch = eleGrid;
                fileSearching = 'indexele.html';
            } else if (tool.category === 'instrumentation') {
                gridToSearch = instGrid;
                fileSearching = 'indexinst.html';
            } else if (tool.category === 'mechanical') {
                gridToSearch = mechGrid;
                fileSearching = 'indexmech.html';
            } else {
                continue;
            }

            const filename = tool.href;
            const hasCard = gridToSearch.includes(`href='/${filename}'`) || 
                            gridToSearch.includes(`href="/${filename}"`) ||
                            gridToSearch.includes(`href='${filename}'`) || 
                            gridToSearch.includes(`href="${filename}"`);

            if (!hasCard) {
                missing.push({
                    name: tool.name,
                    href: tool.href,
                    category: tool.category,
                    icon: tool.icon,
                    fileSearching
                });
            }
        }

        console.log('\n--- Missing Silo Cards in main grid ---');
        if (missing.length === 0) {
            console.log('No missing silo cards found in the grids!');
        } else {
            console.log(`Found ${missing.length} missing tools:\n`);
            console.log(JSON.stringify(missing, null, 2));
        }

    } catch (err) {
        console.error('Error running check:', err);
    }
}

check();
