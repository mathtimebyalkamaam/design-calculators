const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const rootDir = "e:\\GOOGLE AI STUDIO\\design-calculators";
const excludedFiles = ['sitemap.html.html'];

function getAllHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (file !== '.git' && file !== '.github') {
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

const htmlFiles = getAllHtmlFiles(rootDir);
const brokenLinks = [];

console.log(`Scanning ${htmlFiles.length} HTML files...`);

htmlFiles.forEach(file => {
    if (excludedFiles.includes(path.basename(file))) return;

    const content = fs.readFileSync(file, 'utf8');
    const dom = new JSDOM(content);
    const doc = dom.window.document;
    const links = doc.querySelectorAll('a');

    links.forEach(link => {
        let href = link.getAttribute('href');
        if (!href) return;

        // Ignore external links, anchors, and javascript:
        if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            return;
        }

        // Handle root-relative paths
        let targetPath;
        if (href.startsWith('/')) {
            targetPath = path.join(rootDir, href);
        } else {
            targetPath = path.join(path.dirname(file), href);
        }

        // Clean up URL parameters and anchors
        targetPath = targetPath.split('#')[0].split('?')[0];

        // Check if file exists
        if (!fs.existsSync(targetPath)) {
            // Try checking for directory index? (Unlikely for this static site structure based on listing)
            brokenLinks.push({
                source: path.relative(rootDir, file),
                link: href,
                resolved: path.relative(rootDir, targetPath)
            });
        }
    });
});

if (brokenLinks.length > 0) {
    console.log("Found broken links:");
    brokenLinks.forEach(item => {
        console.log(`Source: ${item.source} -> Link: ${item.link} (Resolved: ${item.resolved})`);
    });
} else {
    console.log("No broken internal links found.");
}
