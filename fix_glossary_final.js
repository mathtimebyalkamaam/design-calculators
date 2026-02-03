const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const glossaryPath = path.join(rootDir, 'engineering-glossary.html');

let content = fs.readFileSync(glossaryPath, 'utf8');
let originalContent = content;

// Regex to find all links
// Captures: 1=quote, 2=href, 3=attributes after href, 4=inner text
// Limitation: Simple regex, might miss some edge cases but good for standard <a href="...">
const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1(.*?)>(.*?)<\/a>/gis;

let fixedCount = 0;

content = content.replace(linkRegex, (match, quote, href, attrs, innerText) => {
    // Validate href
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return match; // Keep external/anchor links
    }

    let cleanLink = href.split('?')[0].split('#')[0];
    if (cleanLink.startsWith('/')) cleanLink = cleanLink.substring(1);

    // Check if file exists
    if (!cleanLink) return match;

    let targetPath = path.join(rootDir, cleanLink);
    let exists = fs.existsSync(targetPath);

    if (!exists) {
        // Try adding .html
        if (fs.existsSync(targetPath + '.html')) {
            // It exists with extension! We should have fixed this, but maybe not?
            // fix it
            return `<a href="${href}.html"${attrs}>${innerText}</a>`;
        } else {
            // DOES NOT EXIST. UNLINK.
            console.log(`Unlinking broken link: ${href} -> [Text: ${innerText.trim()}]`);
            fixedCount++;
            return innerText; // Return just the text
        }
    }

    return match;
});

if (content !== originalContent) {
    fs.writeFileSync(glossaryPath, content, 'utf8');
    console.log(`Fixed ${fixedCount} broken links in engineering-glossary.html`);
} else {
    console.log('No changes needed.');
}
