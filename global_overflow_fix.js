const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

async function globalOverflowFix() {
    console.log('Applying Global Overflow Fix...');

    const files = await fs.promises.readdir(rootDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));

    let fixedCount = 0;

    for (const file of htmlFiles) {
        const filePath = path.join(rootDir, file);
        try {
            let content = await fs.promises.readFile(filePath, 'utf8');
            let modified = false;

            // Strategy 1: Replace 'overflow: hidden;' with 'overflow: visible;' 
            // specifically within any .header { ... } block.
            // This regex finds .header { ... } and replaces overflow: hidden inside it.
            const headerBlockRegex = /(\.header\s*\{[^}]*?)overflow:\s*hidden;?([^}]*?\})/g;
            if (headerBlockRegex.test(content)) {
                content = content.replace(headerBlockRegex, '$1overflow: visible;$2');
                modified = true;
            }

            // Strategy 2: Inject a universal override if not already present.
            // This ensures .header always has overflow: visible, regardless of other rules.
            const universalOverride = `
/* GLOBAL OVERRIDE: Ensure Mega Menu dropdowns are visible */
.header, header.header {
    overflow: visible !important;
}
`;
            if (!content.includes('/* GLOBAL OVERRIDE: Ensure Mega Menu dropdowns are visible */')) {
                if (content.includes('/* Mega Menu Core Styles */')) {
                    // Inject right after our mega menu styles
                    content = content.replace(
                        '/* Mega Menu Core Styles */',
                        `/* Mega Menu Core Styles */\n${universalOverride}`
                    );
                    modified = true;
                } else if (content.includes('</head>')) {
                    // Fallback: inject before </head>
                    content = content.replace(
                        '</head>',
                        `<style>${universalOverride}</style>\n</head>`
                    );
                    modified = true;
                }
            }

            if (modified) {
                await fs.promises.writeFile(filePath, content, 'utf8');
                fixedCount++;
            }
        } catch (err) {
            console.error(`Error on ${file}:`, err.message);
        }
    }

    console.log(`Global Overflow Fix applied to ${fixedCount} files.`);
}

globalOverflowFix();
