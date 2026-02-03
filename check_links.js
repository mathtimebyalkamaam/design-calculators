const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const allFiles = fs.readdirSync(rootDir);
const htmlFiles = allFiles.filter(f => f.endsWith('.html'));

let brokenLinks = [];
let scannedCount = 0;

console.log(`Scanning ${htmlFiles.length} HTML files...`);

htmlFiles.forEach(file => {
    scannedCount++;
    const filePath = path.join(rootDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    // Regex to find hrefs. 
    // Matches href="...", href='...'
    const regex = /href=["']([^"']+)["']/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        let link = match[1];

        // Ignore:
        // - Specific protocols (mailto:, tel:, javascript:)
        // - External links (http://, https://)
        // - Anchors on same page (#)
        if (link.startsWith('http') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('javascript:') || link.startsWith('#')) {
            continue;
        }

        // Normalize link
        // If it starts with /, it's relative to root
        // If it doesn't, it's relative to current file (which is root in this flat structure)

        // Remove query params or hashes for file checking
        let cleanLink = link.split('?')[0].split('#')[0];

        // Handle "root" / 
        if (cleanLink === '/' || cleanLink === '') {
            // usually index.html, assume ok if index.html exists (it does)
            cleanLink = 'index.html';
        }

        if (cleanLink.startsWith('/')) {
            cleanLink = cleanLink.substring(1);
        }

        // Check exact existence
        let targetPath = path.join(rootDir, cleanLink);
        let exists = fs.existsSync(targetPath);

        // If not exists, check if it's a clean URL (missing .html)
        if (!exists && !path.extname(cleanLink)) {
            if (fs.existsSync(targetPath + '.html')) {
                // It exists as .html. 
                // We'll verify if this is considered "broken" based on our goal.
                // For local files, this IS broken. For server, it MIGHT be ok.
                // We'll mark it as a "Clean URL" hint.
                // However, user said "ensure all links are working", usually implies file check.
                brokenLinks.push({
                    source: file,
                    link: link,
                    tags: "MISSING_EXTENSION",
                    target: cleanLink + '.html'
                });
                continue;
            }
        }

        if (!exists) {
            brokenLinks.push({
                source: file,
                link: link,
                tags: "BROKEN",
                target: cleanLink
            });
        }
    }
});

console.log('--- Report ---');
console.log(`Scanned ${scannedCount} files.`);
if (brokenLinks.length === 0) {
    console.log('No broken links found.');
} else {
    console.log(`Found ${brokenLinks.length} potential issues.`);

    // Group by type
    const missingExt = brokenLinks.filter(b => b.tags === 'MISSING_EXTENSION');
    const broken = brokenLinks.filter(b => b.tags === 'BROKEN');

    if (missingExt.length > 0) {
        console.log(`\n[Clean URL / Missing Extension] (${missingExt.length} links)`);
        console.log('These links look like /page but file is /page.html. If running locally, these fail.');
        missingExt.slice(0, 20).forEach(i => console.log(`  ${i.source}: ${i.link}`));
        if (missingExt.length > 20) console.log(`  ... and ${missingExt.length - 20} more`);
    }

    if (broken.length > 0) {
        console.log(`\n[Truly Broken / File Missing] (${broken.length} links)`);
        broken.slice(0, 50).forEach(i => console.log(`  ${i.source}: ${i.link} (Target: ${i.target})`));
    }
}
