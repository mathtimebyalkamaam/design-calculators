const fs = require('fs');
const path = require('path');

const sitemapPath = path.join(__dirname, 'sitemap2.html');
const content = fs.readFileSync(sitemapPath, 'utf8');

// Split by sections
// format: data-cat-id="electrical">
const parts = content.split('data-cat-id="');
let allTools = [];

// Skip first part (header)
for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    // extract category
    const category = part.split('"')[0];

    // now regex for tools in this part
    // We stop at the next data-cat-id (which is handled by split)
    // But we need to be careful not to overshoot into footer if it's the last part.
    // However, tool-items are distinct enough.

    // Regex: <a href='...' class="tool-item">
    const toolRegex = /<a href=['"](.*?)['"] class="tool-item">/g;

    let match;
    while ((match = toolRegex.exec(part)) !== null) {
        let href = match[1];

        // Use index to find the rest of the string slightly more robustly or just regex the whole tag
    }
}

// Simpler global iteration with state?
// Let's use simpler regex that just finds the tool-item A tag complete.
// <a href='...' class="tool-item"><i class="..."></i><span class="tool-name">...</span></a>
// The issue is newlines.

const GLOBAL_REGEX = /<a href=['"](.*?)['"] class="tool-item">\s*<i class="(.*?)"><\/i>\s*<span[\s\S]*?class="tool-name">\s*([\s\S]*?)\s*<\/span>\s*<\/a>/g;

let globalTools = [];
// We need to map hrefs/icons to categories effectively.
// But wait, the categories are simple. "electrical", "instrumentation", "mechanical".
// I can just assign category based on the *presence* of key vars or just re-do the section logic simpler.

const sections = [
    { id: 'electrical', start: 'data-cat-id="electrical"', end: 'data-cat-id="instrumentation"-grid' }, // Rough
    // Actually, split is best.
];

// Let's go back to split but execute the simpler regex on the chunk.

// Regex to find name and icon
// <i class="fas fa-home"></i>
// <span class="tool-name">Residential Load Calc</span>

for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const category = part.split('"')[0];

    // Limit part to "tools-section" closing? 
    // Just finding all tool-items in this chunk is safe enough as they are grouped.

    const lines = part.split('</a>');

    lines.forEach(line => {
        if (line.includes('class="tool-item"')) {
            // This line contains a tool.
            // basic string parsing

            // href
            let hrefMatch = line.match(/href=['"](.*?)['"]/);
            if (!hrefMatch) return;
            let href = hrefMatch[1];
            if (href.startsWith('/')) href = href.substring(1);

            // icon
            let iconMatch = line.match(/<i class="(.*?)">/);
            let icon = iconMatch ? iconMatch[1] : 'fas fa-cog';

            // name
            // <span class="tool-name">...</span>
            // might have newlines
            let nameMatch = line.match(/class="tool-name">([\s\S]*?)<\/span>/);
            // If span closing is missing (split by </a> might keep it?), check. </span> is before </a>.

            if (nameMatch) {
                let name = nameMatch[1].replace(/\s+/g, ' ').trim();

                allTools.push({
                    name: name,
                    href: href,
                    category: category,
                    icon: icon
                });
            }
        }
    });
}

console.log('window.TOOLS_DB = ' + JSON.stringify(allTools, null, 4) + ';');
