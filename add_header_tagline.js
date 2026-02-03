const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
// Exclude files that might be templates or special cases if needed, 
// though we generally want this everywhere.
const excludeFiles = ['sitemap2.html', 'sitemap.html.html', 'ohms-law.html']; // Exclude ohms-law as it is the source of truth

const taglineHTML = `                    <p class="logo-subtitle">Inspired by standards such as IEC, IEEE, ISA, ASME, and API.</p>`;

const taglineCSS = `
<style>
/* Injected Tagline Styles */
.logo-container {
    display: flex;
    flex-direction: column !important; /* Force column layout */
    align-items: flex-start !important; /* Left align text */
    text-decoration: none;
    color: white;
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

async function addHeaderTagline() {
    console.log('Starting Header Tagline Injection...');

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

                // 1. Inject HTML Tagline
                // Look for the logo-text span to insert after
                if (content.includes('<span class="logo-text">Design Calculators</span>')) {
                    if (!content.includes('class="logo-subtitle"')) {
                        content = content.replace(
                            '<span class="logo-text">Design Calculators</span>',
                            '<span class="logo-text">Design Calculators</span>\n' + taglineHTML
                        );
                        modified = true;
                    }
                } else {
                    // Try targeting the image if text span isn't exactly like that (unlikely but safe)
                    // Or maybe it's the <a> tag closing...
                    // Stick to the text span as anchor.
                }

                // 2. Inject CSS
                // Only if we modified HTML or if HTML has it but CSS is missing (rare case)
                // We'll inject it if we modified the file OR if it looks like a header file
                if (content.includes('class="logo-subtitle"') && !content.includes('/* Injected Tagline Styles */')) {
                    // Check if it's already in a <style> block we can append to? 
                    // Or just generic inject before </head>
                    content = content.replace('</head>', `${taglineCSS}\n</head>`);
                    modified = true;
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
        console.log(`Skipped (Already present/No header): ${skippedCount}`);
        console.log(`Errors: ${errors}`);

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

addHeaderTagline();
