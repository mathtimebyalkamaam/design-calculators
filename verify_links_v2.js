const fs = require('fs');
const path = require('path');

const rootDir = "e:\\GOOGLE AI STUDIO\\design-calculators";
const excludedFiles = ['sitemap.html.html'];

// strict mode flag
const strictMode = true;

function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== '.git' && file !== '.github' && file !== 'node_modules') {
                getAllHtmlFiles(filePath, fileList);
            }
        } else {
            if (path.extname(file) === '.html') {
                fileList.push(filePath);
            }
        }
    });
    return fileList;
}

function resolvePath(sourceFile, link) {
    // Handle absolute paths (relative to root)
    if (link.startsWith('/')) {
        return path.join(rootDir, link);
    }
    // Handle relative paths
    return path.join(path.dirname(sourceFile), link);
}

function checkFileExists(filePath) {
    // In strict mode, if your link usually relied on auto-appending .html or index.html, it will fail BEFORE calling this if checks are done inline.
    // But this function is just "does the target exist on disk?"
    // For verification: we want to know if the LINK STRING matches a FILE STRING.

    // Normal existence check
    if (fs.existsSync(filePath)) return true;

    // Try appending .html (lazy loading)
    if (fs.existsSync(filePath + '.html')) return 'lazy-html';

    // If it's a directory, check for index.html (lazy loading)
    if (fs.existsSync(path.join(filePath, 'index.html'))) return 'lazy-index';

    return false;
}

const htmlFiles = getAllHtmlFiles(rootDir);
const brokenLinks = [];
let checkedLinksCount = 0;

console.log(`Scanning ${htmlFiles.length} HTML files (Strict Mode: ${strictMode})...`);

const hrefRegex = /href=["']([^"']+)["']/g;

htmlFiles.forEach(file => {
    if (excludedFiles.includes(path.basename(file))) return;

    const content = fs.readFileSync(file, 'utf8');
    let match;

    while ((match = hrefRegex.exec(content)) !== null) {
        let link = match[1];

        // Ignore external links, anchors, mailto, etc.
        if (link.startsWith('http') || link.startsWith('//') || link.startsWith('#') || link.startsWith('javascript:') || link.startsWith('mailto:') || link.startsWith('tel:')) {
            continue;
        }

        // Ignore strictly internal page anchors content like "#top"
        if (link.startsWith('#')) continue;

        // Strip query params and hashes
        const cleanLink = link.split('#')[0].split('?')[0];
        if (!cleanLink) continue;

        // STRICT CHECK: Does it have an extension?
        // Allow root '/' as a special exception usually mapped to index.html by almost all servers.
        // BUT strict verification might even want '/' -> '/index.html'. Let's keep '/' safe for now.
        const isRoot = cleanLink === '/';
        const hasHtmlExt = cleanLink.endsWith('.html') || cleanLink.endsWith('.xml') || cleanLink.endsWith('.pdf') || cleanLink.endsWith('.png') || cleanLink.endsWith('.ico') || cleanLink.endsWith('.css') || cleanLink.endsWith('.js');

        let status = 'ok';

        const resolvedPath = resolvePath(file, cleanLink);
        const exists = checkFileExists(resolvedPath);

        checkedLinksCount++;

        if (exists === false) {
            status = 'broken';
        } else if ((exists === 'lazy-html' || exists === 'lazy-index') && !isRoot) {
            // It exists but requires server magic.
            if (strictMode) status = 'strict-fail';
        } else if (exists === true && !hasHtmlExt && !isRoot && !fs.statSync(resolvedPath).isDirectory()) {
            // It exists exactly as typed (e.g. valid file without extension?), rare but possible.
            // If it's a file without extension, we might accept it, but typically we want .html
            status = 'ok';
        }

        if (status !== 'ok') {
            brokenLinks.push({
                source: path.relative(rootDir, file),
                link: link,
                type: status, // broken or strict-fail
                resolved: path.relative(rootDir, resolvedPath)
            });
        }
    }
});

console.log(`Checked ${checkedLinksCount} links.`);

if (brokenLinks.length > 0) {
    console.log(`Found ${brokenLinks.length} issues:`);
    brokenLinks.forEach(item => {
        const typeLabel = item.type === 'strict-fail' ? '[STRICT]' : '[BROKEN]';
        console.log(`${typeLabel} [${item.source}] -> "${item.link}"`);
    });
} else {
    console.log("No broken internal links found.");
}
