const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const excludeFiles = ['sitemap2.html', 'sitemap.html.html'];

const newCSS = `
<style>
/* Injected Tagline & Layout Styles - Fixed */
.logo-container {
    display: flex !important;
    flex-direction: row !important; /* Align Image and Text Group side-by-side */
    align-items: center !important;
    gap: 15px !important;
    text-decoration: none;
    color: white;
}
.logo-text-group {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}
.logo-subtitle {
    font-size: 0.8rem;
    margin: 4px 0 0 0;
    color: #DBEAFE;
    font-weight: 500;
    line-height: 1.2;
}
</style>
`;

async function fixLogoLayout() {
    console.log('Starting Logo Layout Fix...');

    try {
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

        let updatedCount = 0;
        let skippedCount = 0;
        let errors = 0;

        for (const file of htmlFiles) {
            const filePath = path.join(rootDir, file);
            try {
                let content = await fs.promises.readFile(filePath, 'utf8');
                let modified = false;

                // 1. Structure Check: Look for unpacked Text and Subtitle
                // Pattern: <span class="logo-text">...</span> [whitespace] <p class="logo-subtitle">...</p>
                // We want to wrap them in <div class="logo-text-group">...</div>

                // Regex to find the sequence of text and subtitle inside the link, potentially following an image.
                // We don't strictly need to match the image, just the text part we want to group.
                // But capturing carefully is important.

                const textSubtitleRegex = /(<span class="logo-text">Design Calculators<\/span>\s*<p class="logo-subtitle">.*?<\/p>)/s;

                if (textSubtitleRegex.test(content)) {
                    // Check if already grouped? 
                    if (!content.includes('<div class="logo-text-group">')) {
                        content = content.replace(textSubtitleRegex, '<div class="logo-text-group">\n$1\n</div>');
                        modified = true;
                    }
                }

                // 2. Update CSS
                // Find previous injected CSS block for tagline and replace it
                const oldCSSStart = '<style>\n/* Injected Tagline Styles */';
                const oldCSSEnd = '</style>';

                // Simple string replacement for the CSS block might be tricky if indentation varies.
                // But we injected it consistently in the previous script.
                // Let's rely on the unique comment string.

                if (content.includes('/* Injected Tagline Styles */')) {
                    // Regex to replace the whole style block containing that comment
                    const cssRegex = /<style>\s*\/\* Injected Tagline Styles \*\/[\s\S]*?<\/style>/;
                    content = content.replace(cssRegex, newCSS.trim());
                    modified = true;
                } else if (modified) {
                    // If we modified HTML but didn't find old CSS (maybe disjointed steps), inject new CSS
                    // before </head>
                    content = content.replace('</head>', `${newCSS}\n</head>`);
                }

                if (modified) {
                    await fs.promises.writeFile(filePath, content, 'utf8');
                    updatedCount++;
                } else {
                    skippedCount++;
                }

            } catch (err) {
                console.error(`Error processing ${file}:`, err);
                errors++;
            }
        }

        console.log('--------------------------------------------------');
        console.log(`Updated Files: ${updatedCount}`);
        console.log(`Skipped (No match/No changes needed): ${skippedCount}`);
        console.log(`Errors: ${errors}`);

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

fixLogoLayout();
