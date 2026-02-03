const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
// Files to exclude
const excludeFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'sitemap2.html', 'sitemap.html.html'];

// The Base Header CSS that was missing.
// This ensures the logo is small, and the navbar uses Flexbox correctly.
const headerBaseCSS = `
<style>
/* Core Header Styles - Injected by fix_header_visuals.js */
.header {
    background: var(--gradient-primary, linear-gradient(135deg, #1E3A8A, #2563EB));
    color: white;
    padding: 10px 0;
    box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    position: relative;
    z-index: 1000;
}
.header .container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 20px;
}
.header .navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}
.header .logo-container {
    display: flex;
    align-items: center;
    gap: 15px;
    text-decoration: none;
    color: white;
}
.header .logo {
    height: 50px; /* Constrain Logo Height */
    width: auto;
    object-fit: contain;
}
.header .logo-text {
    font-size: 1.4rem;
    font-weight: 700;
    font-family: 'Montserrat', sans-serif, system-ui;
    color: white;
    white-space: nowrap;
}
.header .nav-menu {
    display: flex;
    align-items: center;
    gap: 20px;
}
.header .nav-links {
    display: flex;
    gap: 25px;
    list-style: none;
    margin: 0;
    padding: 0;
    align-items: center;
}
.header .nav-links li { margin: 0; }
.header .nav-links a {
    color: white;
    text-decoration: none;
    font-weight: 500;
    font-size: 1rem;
    transition: opacity 0.2s;
}
.header .nav-links a:hover {
    opacity: 0.8;
}
/* Ensure Theme Toggle sits nicely */
.header .theme-toggle {
    margin-left: 10px;
    display: flex;
    align-items: center;
    gap: 10px;
}
/* Responsive Tweaks inherited from previous injection, just ensuring logo scales */
@media (max-width: 576px) {
    .header .logo-text { font-size: 1.1rem; }
    .header .logo { height: 40px; }
}
</style>
`;

async function fixHeaderVisuals() {
    console.log('Starting Header Visual Fix...');

    try {
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

        let fixedCount = 0;
        let skippedCount = 0;
        let errors = 0;

        for (const file of htmlFiles) {
            const filePath = path.join(rootDir, file);
            try {
                let content = await fs.promises.readFile(filePath, 'utf8');

                // Only target files where we injected the new header (identified by the logo img class)
                // AND that don't already have this base CSS.
                if (content.includes('<img src="/logo.png" alt="Design Calculators Logo" class="logo">')) {

                    if (!content.includes('/* Core Header Styles - Injected by fix_header_visuals.js */')) {
                        // Inject before </head>
                        content = content.replace('</head>', `${headerBaseCSS}\n</head>`);
                        await fs.promises.writeFile(filePath, content, 'utf8');
                        fixedCount++;
                        // console.log(`Fixed visuals in: ${file}`);
                    } else {
                        skippedCount++;
                    }
                } else {
                    skippedCount++;
                }

            } catch (err) {
                console.error(`Error processing ${file}:`, err);
                errors++;
            }
        }

        console.log('--------------------------------------------------');
        console.log(`Fixed Visuals (CSS Injection): ${fixedCount}`);
        console.log(`Skipped: ${skippedCount}`);
        console.log(`Errors: ${errors}`);

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

fixHeaderVisuals();
