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
        toolsDbContent = toolsDbContent.replace('window.TOOLS_DB =', 'module.exports =');
        
        const tempJsPath = path.join(rootDir, 'temp_tools_db.js');
        await fs.promises.writeFile(tempJsPath, toolsDbContent, 'utf8');
        const tools = require(tempJsPath);
        await fs.promises.unlink(tempJsPath);

        const cleanBody = (html) => {
            // Remove header
            let content = html;
            const headerEnd = content.indexOf('</header>');
            if (headerEnd !== -1) {
                content = content.substring(headerEnd);
            }
            // Remove footer
            const footerStart = content.indexOf('<footer');
            if (footerStart !== -1) {
                content = content.substring(0, footerStart);
            }
            return content;
        };

        const eleBody = cleanBody(await fs.promises.readFile(indexElePath, 'utf8'));
        const instBody = cleanBody(await fs.promises.readFile(indexInstPath, 'utf8'));
        const mechBody = cleanBody(await fs.promises.readFile(indexMechPath, 'utf8'));

        const missing = [];

        for (const tool of tools) {
            if (tool.category === 'articles') continue;
            
            let bodyToSearch = '';
            let fileSearching = '';
            if (tool.category === 'electrical') {
                bodyToSearch = eleBody;
                fileSearching = 'indexele.html';
            } else if (tool.category === 'instrumentation') {
                bodyToSearch = instBody;
                fileSearching = 'indexinst.html';
            } else if (tool.category === 'mechanical') {
                bodyToSearch = mechBody;
                fileSearching = 'indexmech.html';
            } else {
                continue;
            }

            const filename = tool.href;
            const hasCard = bodyToSearch.includes(filename);

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

        console.log('\n--- Missing Silo Cards in Main Body (Excluding Header/Footer) ---');
        if (missing.length === 0) {
            console.log('No missing silo cards found!');
        } else {
            console.log(`Found ${missing.length} missing cards:\n`);
            console.log(JSON.stringify(missing, null, 2));
        }

    } catch (err) {
        console.error(err);
    }
}

check();
