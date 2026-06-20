const fs = require('fs');

const files = [
    { path: 'engineering-glossary.html', terms: ['/pump-efficiency', '/pumpsizing', '/sound-attenuation', '/specific-gravity', '/steam-flow', '/thermal-conductivty', '/vent-sizing', '/vibration-analysis'] },
    { path: 'capacitance-level.html', terms: ['indexelehtml', 'indexinsthtml'] }
];

files.forEach(f => {
    try {
        const content = fs.readFileSync(f.path, 'utf8');
        const lines = content.split(/\r?\n/);
        console.log(`Scanning ${f.path}...`);

        f.terms.forEach(term => {
            console.log(`Searching for: "${term}"`);
            let found = false;
            // Simple string search
            lines.forEach((line, index) => {
                if (line.includes(term)) {
                    console.log(`  Line ${index + 1}: ${line.trim()}`);
                    found = true;
                }
            });

            // Regex search for split hrefs if not found or just to be sure
            // Look for href="..." where content might contain the term or just broken hrefs
            // This is harder linewise.

            if (!found) {
                console.log(`  (Not found as simple string on single line)`);
            }
        });

        // specific check for split hrefs
        const hrefRegex = /href=["']([^"']+)["']/g;
        let match;
        while ((match = hrefRegex.exec(content)) !== null) {
            if (match[1].includes('\n') || match[1].includes('\r')) {
                // Find line number
                const matchIndex = match.index;
                const textBefore = content.substring(0, matchIndex);
                const lineNumber = textBefore.split(/\r?\n/).length;
                console.log(`  Found MULTILINE href at line ${lineNumber}: "${match[1].replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`);
            }
            if (f.path.includes('articles.html') && match[1] === '/index.html') {
                const matchIndex = match.index;
                const textBefore = content.substring(0, matchIndex);
                const lineNumber = textBefore.split(/\r?\n/).length;
                console.log(`  Found /index.html href at line ${lineNumber}`);
            }
        }

    } catch (e) {
        console.error(`Error reading ${f.path}: ${e.message}`);
    }
});
