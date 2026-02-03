const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
// Files to exclude from modification
const excludeFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'sitemap2.html', 'sitemap.html.html'];

// The Standard Header Template
// Note: We use absolute paths (starting with /) for links to ensure they work from any subdirectory (though project is flat).
// We updated href="#articles" to href="/articles.html" for consistency on non-home pages.
const standardHeader = `
    <header class="header">
        <div class="container">
            <nav class="navbar">
                <a href="/" class="logo-container">
                    <img src="/logo.png" alt="Design Calculators Logo" class="logo">
                    <span class="logo-text">Design Calculators</span>
                </a>

                <div class="nav-menu">
                    <button class="mobile-menu-toggle" aria-label="Toggle menu">
                        <i class="fas fa-bars"></i>
                    </button>

                    <ul class="nav-links">
                        <li><a href="/index.html">Home</a></li>
                        <li><a href="/indexele.html">Electrical</a></li>
                        <li><a href="/indexinst.html">Instrumentation</a></li>
                        <li><a href="/indexmech.html">Mechanical</a></li>
                        <li><a href="/articles.html">Articles</a></li>
                        <li><a href="/about.html">About</a></li>
                    </ul>

                    <div class="theme-toggle">
                        <i class="fas fa-sun icon"></i>
                        <label class="switch">
                            <input type="checkbox" id="theme-switch">
                            <span class="slider"></span>
                        </label>
                        <i class="fas fa-moon icon"></i>
                    </div>
                </div>
            </nav>
        </div>
    </header>
`.trim();

async function standardizeHeaders() {
    console.log('Starting header standardization...');

    try {
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

        console.log(`Found ${htmlFiles.length} HTML files to process.`);

        let modifiedCount = 0;
        let escapedCount = 0;
        let errorCount = 0;

        for (const file of htmlFiles) {
            const filePath = path.join(rootDir, file);

            try {
                let content = await fs.promises.readFile(filePath, 'utf8');

                // Use regex to locate the header block.
                // We look for <header class="header"> ... </header>
                // We use [\s\S]*? to match across newlines non-greedily.
                const headerRegex = /<header\s+class=["']header["']\s*>[\s\S]*?<\/header>/i;

                if (headerRegex.test(content)) {
                    const newContent = content.replace(headerRegex, standardHeader);

                    if (newContent !== content) {
                        await fs.promises.writeFile(filePath, newContent, 'utf8');
                        // console.log(`Updated header in: ${file}`);
                        modifiedCount++;
                    } else {
                        // console.log(`Header already up-to-date in: ${file}`);
                        escapedCount++;
                    }
                } else {
                    console.warn(`WARNING: No <header class="header"> found in: ${file}. Skipping.`);
                    escapedCount++;
                }

            } catch (err) {
                console.error(`Error processing ${file}:`, err);
                errorCount++;
            }
        }

        console.log('--------------------------------------------------');
        console.log(`Standardization Complete.`);
        console.log(`Files Modified: ${modifiedCount}`);
        console.log(`Files Unchanged/Skipped: ${escapedCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (err) {
        console.error('Fatal error reading directory:', err);
    }
}

standardizeHeaders();
