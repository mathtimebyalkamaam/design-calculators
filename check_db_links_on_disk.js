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

        const filesOnDisk = new Set(await fs.promises.readdir(rootDir));

        const broken = [];
        for (const tool of tools) {
            const href = tool.href;
            if (!filesOnDisk.has(href)) {
                broken.push(tool);
            }
        }

        console.log('\n--- Broken links in tools_db.js (not on disk) ---');
        if (broken.length === 0) {
            console.log('No broken links!');
        } else {
            console.log(broken);
        }

    } catch (err) {
        console.error(err);
    }
}

check();
