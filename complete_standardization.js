const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
// Files to exclude
const excludeFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'sitemap2.html', 'sitemap.html.html'];

// CSS to inject for mobile menu support (extracted from styles.css)
const mobileMenuCSS = `
<style>
/* Injected Mobile Menu Styles */
.mobile-menu-toggle { display: none; background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 8px; z-index: 1000; }
@media (max-width: 992px) {
    .mobile-menu-toggle { display: block; }
    .nav-links { position: fixed; top: 0; left: -100%; width: 280px; height: 100vh; background: var(--gradient-dark, #0F172A); flex-direction: column; padding: 100px 30px 30px; gap: 24px; transition: left 0.4s ease-in-out; box-shadow: 4px 0 12px rgba(0, 0, 0, 0.3); z-index: 999; }
    .nav-links.active { left: 0; }
    .nav-links a { width: 100%; padding: 12px 16px; border-radius: 8px; background: rgba(255, 255, 255, 0.05); display: block; }
}
</style>
`;

// JS to inject for mobile menu toggling
const mobileMenuJS = `
<script>
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    if(toggleBtn && navLinks) {
        toggleBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
            const icon = this.querySelector('i');
            if(icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }
});
</script>
`;

// Standard Navigation Links (List Items)
const standardNavItems = `
                        <li><a href="/index.html">Home</a></li>
                        <li><a href="/indexele.html">Electrical</a></li>
                        <li><a href="/indexinst.html">Instrumentation</a></li>
                        <li><a href="/indexmech.html">Mechanical</a></li>
                        <li><a href="/articles.html">Articles</a></li>
                        <li><a href="/about.html">About</a></li>
`.trim();

async function processFiles() {
    console.log('Starting Complete Standardization...');

    try {
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

        let repairedCount = 0;
        let linksUpdatedCount = 0;
        let errors = 0;

        for (const file of htmlFiles) {
            const filePath = path.join(rootDir, file);
            try {
                let content = await fs.promises.readFile(filePath, 'utf8');
                let modified = false;

                // PASS 1: Repair Modified Files (Type A)
                // Check if it has the "Standard Header" we injected (identifiable by <header class="header"> and .mobile-menu-toggle presence in HTML)
                if (content.includes('<header class="header">') && content.includes('mobile-menu-toggle')) {
                    // Check if CSS is missing
                    if (!content.includes('.mobile-menu-toggle {')) {
                        // Inject CSS before </head>
                        content = content.replace('</head>', `${mobileMenuCSS}\n</head>`);
                        modified = true;
                    }
                    // Check if JS is missing
                    if (!content.includes('navLinks.classList.toggle(\'active\')')) {
                        // Inject JS before </body>
                        content = content.replace('</body>', `${mobileMenuJS}\n</body>`);
                        modified = true;
                    }
                    if (modified) repairedCount++;
                }

                // PASS 2: Standardize Navigation Links (Type B and A)
                // Find <ul class="nav-links">...</ul> and replace content
                const navRegex = /<ul\s+class=["']nav-links["']\s*>([\s\S]*?)<\/ul>/i;
                const match = content.match(navRegex);

                if (match) {
                    const currentLinks = match[1].trim();
                    // Normalize whitespace to compare roughly
                    if (currentLinks.replace(/\s/g, '') !== standardNavItems.replace(/\s/g, '')) {
                        // Replace the inner list items
                        content = content.replace(navRegex, `<ul class="nav-links">\n${standardNavItems}\n                    </ul>`);
                        modified = true;
                        // Don't double count if repaired
                        if (!content.includes('<header class="header">')) linksUpdatedCount++;
                    }
                }

                if (modified) {
                    await fs.promises.writeFile(filePath, content, 'utf8');
                    // console.log(`Processed: ${file}`);
                }

            } catch (err) {
                console.error(`Error processing ${file}:`, err);
                errors++;
            }
        }

        console.log('--------------------------------------------------');
        console.log(`Repaired (CSS/JS Injection): ${repairedCount}`);
        console.log(`Links Standardized (Type B): ${linksUpdatedCount}`);
        console.log(`Errors: ${errors}`);

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

processFiles();
