const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const excludeFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'sitemap2.html', 'sitemap.html.html', 'google0cb095861110034a.html'];

async function auditHeaders() {
    console.log('Starting Header Consistency Audit...');

    try {
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

        let typeACount = 0; // <header class="header"> (The one we injected)
        let typeBCount = 0; // <header> (The original self-contained ones)
        let unknownCount = 0;
        let missingLinksCount = 0;
        let missingCSSCount = 0;

        const detailedIssues = [];

        for (const file of htmlFiles) {
            const filePath = path.join(rootDir, file);
            const content = await fs.promises.readFile(filePath, 'utf8');

            let type = 'unknown';

            if (content.includes('<header class="header">')) {
                type = 'Type A';
                typeACount++;

                // Check for Visual Fix CSS
                if (!content.includes('.header .logo {') && !content.includes('/* Core Header Styles')) {
                    // Some might link styles.css, but we injected inline styles to be safe. 
                    // If it doesn't have inline styles, check if it relies on styles.css
                    if (!content.includes('<link rel="stylesheet" href="styles.css">')) {
                        missingCSSCount++;
                        detailedIssues.push(`${file}: Type A but missing visual fix CSS.`);
                    }
                }

            } else if (content.includes('<header>')) {
                type = 'Type B';
                typeBCount++;
            } else {
                unknownCount++;
                detailedIssues.push(`${file}: No <header> tag found.`);
            }

            // Check Links (Loose Check for "About" and "Articles")
            if (!content.includes('href="/about.html"') || !content.includes('href="/articles.html"')) {
                // Some might use relative paths check
                if (!content.includes('about.html') || !content.includes('articles.html')) {
                    missingLinksCount++;
                    detailedIssues.push(`${file}: Missing standard navigation links.`);
                }
            }
        }

        console.log('--------------------------------------------------');
        console.log(`Total Files Scanned: ${htmlFiles.length}`);
        console.log(`Type A (Standardized): ${typeACount}`);
        console.log(`Type B (Self-Contained): ${typeBCount}`);
        console.log(`Unknown / No Header: ${unknownCount}`);
        console.log(`Files with Missing Links: ${missingLinksCount}`);
        console.log(`Type A Files Missing Visual Fix: ${missingCSSCount}`);
        console.log('--------------------------------------------------');

        if (detailedIssues.length > 0) {
            console.log('Issues Found:');
            detailedIssues.slice(0, 10).forEach(issue => console.log(`- ${issue}`));
            if (detailedIssues.length > 10) console.log(`... and ${detailedIssues.length - 10} more.`);
        } else {
            console.log('SUCCESS: All checked files have headers and links.');
        }

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

auditHeaders();
