const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

// Canonical logo container HTML - must be exactly this structure
const canonicalLogoHTML = `<a href="/" class="logo-container">
                    <img src="/logo.png" alt="Design Calculators Logo" class="logo">
                    <div class="logo-text-group">
                        <span class="logo-text">Design Calculators</span>
                        <p class="logo-subtitle">Inspired by standards such as IEC, IEEE, ISA, ASME, and API.</p>
                    </div>
                </a>`;

// Canonical header CSS - ensures proper alignment
const canonicalHeaderCSS = `
<style>
/* Canonical Header Styles - Injected for Consistency */
.header {
    overflow: visible !important;
}
.header .logo-container {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 12px !important;
    text-decoration: none;
    color: white;
}
.header .logo {
    height: 48px !important;
    width: auto;
    object-fit: contain;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    flex-shrink: 0;
}
.logo-text-group {
    display: flex !important;
    flex-direction: column !important;
    justify-content: center;
    line-height: 1.1;
}
.header .logo-text {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: #ffffff;
    margin-bottom: 2px;
    white-space: nowrap;
}
.logo-subtitle {
    font-size: 0.7rem !important;
    color: rgba(255, 255, 255, 0.85) !important;
    font-weight: 500;
    margin: 0 !important;
    line-height: 1.2;
    max-width: 280px;
    white-space: nowrap;
}
</style>
`;

async function enforceHeaderConsistency() {
    console.log('Enforcing Header Consistency Across All Files...');

    const files = await fs.promises.readdir(rootDir);
    const htmlFiles = files.filter(f => f.endsWith('.html'));

    let fixedCount = 0;
    let errors = 0;

    for (const file of htmlFiles) {
        const filePath = path.join(rootDir, file);
        try {
            let content = await fs.promises.readFile(filePath, 'utf8');
            let modified = false;

            // 1. Fix the logo-container HTML structure
            // Match any <a href="/" class="logo-container">...</a> and replace with canonical
            const logoContainerRegex = /<a\s+href=["']\/["']\s+class=["']logo-container["']>[\s\S]*?<\/a>/;

            if (logoContainerRegex.test(content)) {
                const currentMatch = content.match(logoContainerRegex);
                // Normalize whitespace for comparison
                const normalizedCurrent = currentMatch[0].replace(/\s+/g, ' ').trim();
                const normalizedCanonical = canonicalLogoHTML.replace(/\s+/g, ' ').trim();

                if (normalizedCurrent !== normalizedCanonical) {
                    content = content.replace(logoContainerRegex, canonicalLogoHTML);
                    modified = true;
                }
            }

            // 2. Ensure canonical header CSS is present
            if (!content.includes('/* Canonical Header Styles - Injected for Consistency */')) {
                // Remove any old/conflicting header styles first
                // Then inject canonical CSS before </head>
                if (content.includes('</head>')) {
                    content = content.replace('</head>', `${canonicalHeaderCSS}\n</head>`);
                    modified = true;
                }
            }

            if (modified) {
                await fs.promises.writeFile(filePath, content, 'utf8');
                fixedCount++;
            }
        } catch (err) {
            console.error(`Error on ${file}:`, err.message);
            errors++;
        }
    }

    console.log(`Header consistency enforced on ${fixedCount} files. Errors: ${errors}`);
}

enforceHeaderConsistency();
