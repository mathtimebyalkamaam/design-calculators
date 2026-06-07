const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const filesToCheck = ['indexele.html', 'indexinst.html', 'indexmech.html'];

async function check() {
    try {
        const diskFiles = await fs.promises.readdir(rootDir);
        const diskHtmlFiles = new Set(diskFiles.filter(f => f.endsWith('.html')));

        // Map lowercase name to actual name on disk
        const lowercaseMap = new Map();
        for (const f of diskHtmlFiles) {
            lowercaseMap.set(f.toLowerCase(), f);
        }

        for (const indexFile of filesToCheck) {
            const content = await fs.promises.readFile(path.join(rootDir, indexFile), 'utf8');
            console.log(`\n--- Checking links in ${indexFile} ---`);

            // Regex to find hrefs
            const regex = /href=['"]\/?(.*?.html)['"]/g;
            let match;
            const uniqueLinks = new Set();
            while ((match = regex.exec(content)) !== null) {
                const link = match[1];
                if (link.startsWith('index') || link.startsWith('http') || link.startsWith('//')) continue;
                uniqueLinks.add(link);
            }

            let mismatchCount = 0;
            for (const link of uniqueLinks) {
                const lowerLink = link.toLowerCase();
                const actualDiskName = lowercaseMap.get(lowerLink);

                if (!actualDiskName) {
                    console.log(`  [404 NOT FOUND] Link to '${link}' does not exist on disk.`);
                } else if (link !== actualDiskName) {
                    mismatchCount++;
                    console.log(`  [CASE MISMATCH] Link is '${link}' but file on disk is '${actualDiskName}'`);
                }
            }

            if (mismatchCount === 0) {
                console.log(`  All links match file casing perfectly!`);
            }
        }

    } catch (err) {
        console.error(err);
    }
}

check();
