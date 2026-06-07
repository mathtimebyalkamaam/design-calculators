const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const toolsDbPath = path.join(rootDir, 'tools_db.js');
const indexFiles = {
    electrical: path.join(rootDir, 'indexele.html'),
    instrumentation: path.join(rootDir, 'indexinst.html'),
    mechanical: path.join(rootDir, 'indexmech.html')
};

async function check() {
    try {
        let toolsDbContent = await fs.promises.readFile(toolsDbPath, 'utf8');
        toolsDbContent = toolsDbContent.replace('window.TOOLS_DB =', 'module.exports =');
        
        const tempJsPath = path.join(rootDir, 'temp_tools_db.js');
        await fs.promises.writeFile(tempJsPath, toolsDbContent, 'utf8');
        const tools = require(tempJsPath);
        await fs.promises.unlink(tempJsPath);

        for (const [category, indexFilePath] of Object.entries(indexFiles)) {
            console.log(`\n==================================================`);
            console.log(`Auditing Category: ${category} in ${path.basename(indexFilePath)}`);
            console.log(`==================================================`);

            const html = await fs.promises.readFile(indexFilePath, 'utf8');
            const startIdx = html.indexOf('<div class="silo-grid">');
            if (startIdx === -1) {
                console.log(`Error: Could not find silo-grid in ${path.basename(indexFilePath)}`);
                continue;
            }
            const endIdx = html.indexOf('</section>', startIdx);
            const gridHtml = html.substring(startIdx, endIdx);

            const catTools = tools.filter(t => t.category === category);
            console.log(`Found ${catTools.length} tools registered for ${category} in tools_db.js.`);

            let missingCount = 0;
            for (const tool of catTools) {
                const href = tool.href;
                // Search for the href specifically in the grid chunk
                const hasHref = gridHtml.includes(href);
                if (!hasHref) {
                    console.log(`  [MISSING CARD] Tool '${tool.name}' (${href}) has no card in grid.`);
                    missingCount++;
                    continue;
                }

                // Check card structure: class, icon, span, p
                // Locate the anchor tag of this tool in the grid
                const anchorStart = gridHtml.indexOf(href) - 100; // rough start
                const searchArea = gridHtml.substring(Math.max(0, anchorStart), anchorStart + 500);
                
                // Find actual anchor block starting with <a and ending with </a>
                const aStart = searchArea.indexOf('<a');
                const aEnd = searchArea.indexOf('</a>', aStart);
                if (aStart === -1 || aEnd === -1) {
                    console.log(`  [MALFORMED CARD] Could not parse card block for '${tool.name}' (${href}).`);
                    continue;
                }
                const cardBlock = searchArea.substring(aStart, aEnd + 4);

                // Verify icon
                const iconMatch = cardBlock.match(/<i class=['"](.*?)['"]><\/i>/);
                const iconClass = iconMatch ? iconMatch[1] : null;

                // Verify span
                const spanMatch = cardBlock.match(/<span>(.*?)<\/span>/);
                const spanText = spanMatch ? spanMatch[1] : null;

                // Verify p
                const pMatch = cardBlock.match(/<p>([\s\S]*?)<\/p>/);
                const pText = pMatch ? pMatch[1].trim() : null;

                if (!iconClass) {
                    console.log(`  [NO ICON] Tool '${tool.name}' (${href}) is missing an <i> tag/icon.`);
                }
                if (!spanText) {
                    console.log(`  [NO SPAN] Tool '${tool.name}' (${href}) is missing a <span> tag/name.`);
                }
                if (!pText) {
                    console.log(`  [NO DESCRIPTION] Tool '${tool.name}' (${href}) is missing a <p> description.`);
                }

                // Log details of newly added cards
                const isNew = ['electricalresidentialload.html', 'insulationresistance.html', 'powertriangletool.html',
                               'controlvalveleakage.html', 'dbcalculator.html', 'wirelesshart.html',
                               'frictionfactortool.html', 'nptbspthreadcalculator.html', 'pipescheduletool.html'].includes(href);
                if (isNew) {
                    console.log(`  [FOUND NEW] Tool '${tool.name}': Icon='${iconClass}', Span='${spanText}', Desc='${pText}'`);
                }
            }

            if (missingCount === 0) {
                console.log(`All ${category} tools are accounted for as clickable cards in the grid!`);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

check();
