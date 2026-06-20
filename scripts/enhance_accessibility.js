const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const excludeFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'sitemap2.html', 'sitemap.xml'];

async function enhanceAccessibility() {
    const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html') && !excludeFiles.includes(f));
    let updateCount = 0;

    for (const file of files) {
        const filePath = path.join(rootDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // 1. Add ARIA roles to canvas elements
        const canvasRegex = /<canvas([\s\S]*?)id=["']([\s\S]*?)["']([\s\S]*?)><\/canvas>/gi;
        
        content = content.replace(canvasRegex, (match, p1, id, p3) => {
            if (!match.includes('role=')) {
                modified = true;
                // Try to infer a label from the ID or section
                let label = id.replace(/([A-Z])/g, ' $1').replace(/Chart/i, ' Analysis Chart').trim();
                label = label.charAt(0).toUpperCase() + label.slice(1);
                return `<canvas${p1}id="${id}"${p3} role="img" aria-label="${label}"><p class="sr-only">Interactive data visualization for ${label}</p></canvas>`;
            }
            return match;
        });

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            updateCount++;
        }
    }

    console.log(`Accessibility enhanced for ${updateCount} files.`);
}

enhanceAccessibility().catch(console.error);
