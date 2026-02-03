const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
// Exclude files that are not page templates or have special needs
const excludeFiles = ['sitemap2.html', 'sitemap.html.html'];

// The Content we want INSIDE <a href="/" class="logo-container"> ... </a>
// This ensures Image + Text Group (Title + Tagline) are always structured correctly.
const canonicalLogoContent = `
                    <img src="/logo.png" alt="Design Calculators Logo" class="logo">
                    <div class="logo-text-group">
                        <span class="logo-text">Design Calculators</span>
                        <p class="logo-subtitle">Inspired by standards such as IEC, IEEE, ISA, ASME, and API.</p>
                    </div>
`.trim();

// The Refined CSS we want to ensure is present in ALL files.
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

async function forceHeaderConsistency() {
    console.log('Starting Aggressive Header Consistency Fix...');

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

                // 1. Force the Logo HTML Structure
                // We look for <a href="/" class="logo-container"> ... </a> and replace EVERYTHING inside it.
                // Regex to capture the tag and its content until the closing </a>
                // We use [\s\S]*? for non-greedy match across newlines.

                const logoContainerRegex = /(<a href="\/" class="logo-container">)([\s\S]*?)(<\/a>)/;

                const match = content.match(logoContainerRegex);
                if (match) {
                    const currentInnerContent = match[2];

                    // Normalize whitespaces for comparison (remove newlines and excessive spaces)
                    const normalizedCurrent = currentInnerContent.replace(/\s+/g, ' ').trim();
                    const normalizedCanonical = canonicalLogoContent.replace(/\s+/g, ' ').trim();

                    if (normalizedCurrent !== normalizedCanonical) {
                        const newTag = `${match[1]}\n${canonicalLogoContent}\n${match[3]}`;
                        content = content.replace(match[0], newTag);
                        modified = true;
                    }
                }

                // 2. Ensure Refined CSS is present and correct
                // We'll replace ANY of our previous injected style blocks with the Final Refined CSS.
                // Or if none exist, inject it.

                // Patterns to look for from previous steps
                const previousCSSPatterns = [
                    /<style>\s*\/\* Refined Professional Header Styles \*\/[\s\S]*?<\/style>/, // The one we just made
                    /<style>\s*\/\* Injected Tagline & Layout Styles - Fixed \*\/[\s\S]*?<\/style>/, // The fix_logo_layout one
                    /<style>\s*\/\* Injected Tagline Styles \*\/[\s\S]*?<\/style>/, // The initial tagline one
                    /<style>\s*\/\* Core Header Styles - Injected by fix_header_visuals.js \*\/[\s\S]*?<\/style>/ // The visual fix one
                ];

                let cssFoundAndReplaced = false;

                // Prioritize replacing the most specific/recent ones first
                // But typically we want to replace the LAST one found to be safe? 
                // Or just find ANY of these and replace it with the Refined CSS.
                // Ideally we only want ONE such block.

                // Let's replace the *first* one we find with the Refined CSS, and delete others?
                // Simpler: Just check if we already have the EXACT Refined CSS.

                if (!content.includes('/* Refined Professional Header Styles */')) {
                    // We don't have the final styles. replace whatever we find.
                    for (const pattern of previousCSSPatterns) {
                        if (pattern.test(content)) {
                            content = content.replace(pattern, refineCSS.trim());
                            cssFoundAndReplaced = true;
                            modified = true;
                            break;
                        }
                    }
                    // If we didn't find any block to replace, but we know it's a calculator page (has header), inject it.
                    if (!cssFoundAndReplaced && content.includes('<header class="header">')) {
                        content = content.replace('</head>', `${refineCSS}\n</head>`);
                        modified = true;
                    }
                } else {
                    // We HAVE the style block. Maybe check if it's the latest version?
                    // We can rely on it being mostly correct if the comment matches.
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
        console.log(`Force Updated Files: ${updatedCount}`);
        console.log(`Errors: ${errors}`);

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

forceHeaderConsistency();
