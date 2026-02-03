const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const excludeFiles = ['sitemap2.html', 'sitemap.html.html'];

const refineCSS = `
<style>
/* Refined Professional Header Styles */
.header .logo-container {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important; /* Slightly tighter gap */
    text-decoration: none;
    color: white;
}

.header .logo {
    height: 48px !important; /* Standard navbar size */
    width: auto;
    object-fit: contain;
    border-radius: 6px; /* Soft rounding */
    box-shadow: 0 2px 4px rgba(0,0,0,0.1); /* Subtle depth */
}

.logo-text-group {
    display: flex;
    flex-direction: column;
    justify-content: center; /* Ensure vertical centering */
    line-height: 1.1; /* Tighter line height for the group */
}

.header .logo-text {
    font-size: 1.25rem; /* 20px - slightly smaller but bolder feel */
    font-weight: 700;
    letter-spacing: -0.02em; /* Modern tighten */
    color: #ffffff;
    margin-bottom: 2px; /* Tiny gap to subtitle */
}

.logo-subtitle {
    font-size: 0.7rem !important; /* 11px - distinctly secondary */
    color: rgba(255, 255, 255, 0.85) !important; /* High readability but softer */
    font-weight: 500;
    margin: 0 !important;
    line-height: 1.2;
    max-width: 250px; /* Constrain width to avoid long run-on look */
    white-space: normal; /* Allow nice wrapping if needed */
}

/* Enhancing Navbar Links for "Pro" feel */
.header .nav-links a {
    font-size: 0.95rem;
    font-weight: 600;
    opacity: 0.9;
    transition: all 0.2s ease;
}
.header .nav-links a:hover {
    opacity: 1;
    transform: translateY(-1px); /* Micro-interaction */
}
</style>
`;

async function refineHeaderDesign() {
    console.log('Starting Header Design Refinement...');

    try {
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

        let updatedCount = 0;
        let errors = 0;

        for (const file of htmlFiles) {
            const filePath = path.join(rootDir, file);
            try {
                let content = await fs.promises.readFile(filePath, 'utf8');
                let modified = false;

                // We are replacing the PREVIOUSLY injected CSS block.
                // It started with <style>\n/* Injected Tagline & Layout Styles - Fixed */
                // We will look for that pattern.

                const oldCSSPattern = /<style>\s*\/\* Injected Tagline & Layout Styles - Fixed \*\/[\s\S]*?<\/style>/;

                if (oldCSSPattern.test(content)) {
                    content = content.replace(oldCSSPattern, refineCSS.trim());
                    modified = true;
                } else if (content.includes('/* Injected Tagline Styles */')) {
                    // Fallback if they are still on version 1
                    const v1CSSPattern = /<style>\s*\/\* Injected Tagline Styles \*\/[\s\S]*?<\/style>/;
                    content = content.replace(v1CSSPattern, refineCSS.trim());
                    modified = true;
                } else {
                    // Start fresh if no block found but <header class="header"> exists
                    if (content.includes('<header class="header">')) {
                        content = content.replace('</head>', `${refineCSS}\n</head>`);
                        modified = true;
                    }
                }

                if (modified) {
                    await fs.promises.writeFile(filePath, content, 'utf8');
                    updatedCount++;
                }

            } catch (err) {
                console.error(`Error processing ${file}:`, err);
                errors++;
            }
        }

        console.log('--------------------------------------------------');
        console.log(`Refined Files: ${updatedCount}`);
        console.log(`Errors: ${errors}`);

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

refineHeaderDesign();
