const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const allFiles = fs.readdirSync(rootDir);
const htmlFiles = allFiles.filter(f => f.endsWith('.html'));

console.log(`Scanning ${htmlFiles.length} HTML files for link fixes...`);

let totalFixed = 0;

htmlFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. Fix sitemap.html -> sitemap2.html
    // Fix sitemap.html.html -> sitemap2.html
    // Using regex to capture variations
    content = content.replace(/href=["']\/?sitemap\.html\.html["']/gi, 'href="sitemap2.html"');
    content = content.replace(/href=["']\/?sitemap\.html["']/gi, 'href="sitemap2.html"');

    // 2. Fix Clean URLs (append .html)
    // Find href="/foo" or href="foo"
    // We strictly look for things that look like internal file names

    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    let replacements = [];

    while ((match = hrefRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const link = match[1];

        if (link.startsWith('http') || link.startsWith('#') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('javascript:')) continue;

        let cleanLink = link.split('?')[0].split('#')[0];
        let wasAbsolute = cleanLink.startsWith('/');
        if (wasAbsolute) cleanLink = cleanLink.substring(1);

        // Skip if empty or root
        if (!cleanLink || cleanLink === '/') continue;

        // Skip if already has extension
        if (path.extname(cleanLink)) continue;

        // Check if file.html exists
        if (fs.existsSync(path.join(rootDir, cleanLink + '.html'))) {
            // It's a valid file if we add .html
            // Construct new link
            let newLink = link + '.html'; // Simple append? 
            // Better: preserve / if it was there
            // Actually, simply appending .html to the capture group is usually safe for clean URLs
            // e.g. /arcflash -> /arcflash.html

            replacements.push({
                original: fullMatch,
                new: fullMatch.replace(link, link + '.html')
            });
        }
    }

    // Apply specific clean URL replacements
    // Reverse order to avoid index issues if we were doing indices, but here we do string replace
    // String replace global might be risky if same link appears twice but one verified one not?
    // But here we verify based on file existence.
    // We'll use a Set to dedupe replacements
    const uniqueReplacements = new Set();
    replacements.forEach(r => uniqueReplacements.add(JSON.stringify(r)));

    Array.from(uniqueReplacements).forEach(json => {
        const r = JSON.parse(json);
        // specific replace
        // We use split/join to replace all occurrences of this exact string
        content = content.split(r.original).join(r.new);
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`[FIXED] ${file}`);
        totalFixed++;
    }
});

// Also fix sitemap.xml
const sitemapXmlPath = path.join(rootDir, 'sitemap.xml');
if (fs.existsSync(sitemapXmlPath)) {
    let xml = fs.readFileSync(sitemapXmlPath, 'utf8');
    let originalXml = xml;
    xml = xml.replace(/loc>https:\/\/designcalculators\.co\.in\/sitemap\.html<\/loc>/g, 'loc>https://designcalculators.co.in/sitemap2.html</loc>');
    if (xml !== originalXml) {
        fs.writeFileSync(sitemapXmlPath, xml, 'utf8');
        console.log(`[FIXED] sitemap.xml`);
    }
}

console.log(`Fixed links in ${totalFixed} files.`);
