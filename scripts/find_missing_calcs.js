const fs = require('fs');
const path = require('path');
// Cheerio removed, using regex


// Standard node "fs" and "path"
const rootDir = __dirname;
const sitemapPath = path.join(rootDir, 'sitemap.xml');

async function findMissing() {
    try {
        // 1. Get all local HTML files
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        // 2. Read Sitemap
        const sitemapContent = await fs.promises.readFile(sitemapPath, 'utf8');

        // 3. Extract URLs from Sitemap
        // Regex to find <loc>...</loc>
        const locRegex = /<loc>(.*?)<\/loc>/g;
        let match;
        const sitemapUrls = new Set();

        while ((match = locRegex.exec(sitemapContent)) !== null) {
            const url = match[1];
            // Extract basename
            const basename = url.split('/').pop();

            // Handle "clean" URLs (e.g. /arcflash matching arcflash.html)
            // If empty (root), ignore
            if (!basename) continue;

            sitemapUrls.add(basename.toLowerCase());
            // Also add .html version
            if (!basename.endsWith('.html')) {
                sitemapUrls.add(basename.toLowerCase() + '.html');
            }
        }

        // 4. Compare
        const missing = [];
        const excluded = ['index.html', 'indexmain.html', 'sitemap.html', 'sitemap2.html', '404.html', 'google', 'styles.css', 'main.js'];

        for (const file of htmlFiles) {
            if (excluded.includes(file.toLowerCase())) continue;
            if (file.toLowerCase().startsWith('index')) continue; // usually category pages, check if already in sitemap
            if (file.toLowerCase().startsWith('article')) continue; // articles usually tracked differently? Or check them too.

            // Check if file is in sitemap
            if (!sitemapUrls.has(file.toLowerCase())) {
                missing.push(file);
            }
        }

        console.log('--- Missing Calculators/Pages ---');
        console.log(JSON.stringify(missing, null, 2));

    } catch (err) {
        console.error(err);
    }
}

findMissing();
