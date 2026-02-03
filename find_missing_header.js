const fs = require('fs');
const path = require('path');

const rootDir = 'e:\\GOOGLE AI STUDIO\\design-calculators';
const signature = 'repo-grid';

function findMissingHeader(dir) {
    const files = fs.readdirSync(dir);
    let missingFiles = [];

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // skip node_modules etc if any, but let's just do top level or simple recursion
            if (file !== 'node_modules' && file !== '.git') {
                 missingFiles = missingFiles.concat(findMissingHeader(fullPath));
            }
        } else if (file.endsWith('.html')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes(signature)) {
                missingFiles.push(file);
            }
        }
    });
    return missingFiles;
}

const missing = findMissingHeader(rootDir);
console.log('Total missing header:', missing.length);
console.log('Files:', missing);
