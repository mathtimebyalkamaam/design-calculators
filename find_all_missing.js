const fs = require('fs');
const path = require('path');

const rootDir = __dirname;

async function checkOrphans() {
    try {
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(f => f.endsWith('.html'));

        // Read references
        const sitemapXml = fs.existsSync(path.join(rootDir, 'sitemap.xml')) 
            ? await fs.promises.readFile(path.join(rootDir, 'sitemap.xml'), 'utf8') : '';
        const sitemap2Html = fs.existsSync(path.join(rootDir, 'sitemap2.html')) 
            ? await fs.promises.readFile(path.join(rootDir, 'sitemap2.html'), 'utf8') : '';
        const indexEle = fs.existsSync(path.join(rootDir, 'indexele.html')) 
            ? await fs.promises.readFile(path.join(rootDir, 'indexele.html'), 'utf8') : '';
        const indexInst = fs.existsSync(path.join(rootDir, 'indexinst.html')) 
            ? await fs.promises.readFile(path.join(rootDir, 'indexinst.html'), 'utf8') : '';
        const indexMech = fs.existsSync(path.join(rootDir, 'indexmech.html')) 
            ? await fs.promises.readFile(path.join(rootDir, 'indexmech.html'), 'utf8') : '';
        const indexHtml = fs.existsSync(path.join(rootDir, 'index.html')) 
            ? await fs.promises.readFile(path.join(rootDir, 'index.html'), 'utf8') : '';
        
        let toolsDb = '';
        if (fs.existsSync(path.join(rootDir, 'tools_db.js'))) {
            toolsDb = await fs.promises.readFile(path.join(rootDir, 'tools_db.js'), 'utf8');
        }

        const excluded = [
            'index.html', 'indexele.html', 'indexinst.html', 'indexmech.html',
            'sitemap.html', 'sitemap2.html', '404.html', 'about.html',
            'contact.html', 'faq.html', 'privacy-policy.html', 'terms-of-service.html',
            'license.html', 'articles.html'
        ];

        console.log('Total HTML files found:', htmlFiles.length);

        const results = [];

        for (const file of htmlFiles) {
            const lowerFile = file.toLowerCase();
            // Skip excluded
            if (excluded.includes(lowerFile)) continue;
            // Skip index* and article*
            if (lowerFile.startsWith('index')) continue;
            if (lowerFile.startsWith('article')) continue;

            // Check if file name is present in various sources
            // e.g. conduction-convection-radiation.html -> check for 'conduction-convection-radiation' or file name
            const searchPattern = lowerFile;
            
            const inXml = sitemapXml.toLowerCase().includes(searchPattern);
            const inSitemap2 = sitemap2Html.toLowerCase().includes(searchPattern);
            const inEle = indexEle.toLowerCase().includes(searchPattern);
            const inInst = indexInst.toLowerCase().includes(searchPattern);
            const inMech = indexMech.toLowerCase().includes(searchPattern);
            const inHome = indexHtml.toLowerCase().includes(searchPattern);
            const inToolsDb = toolsDb.toLowerCase().includes(searchPattern);

            results.push({
                file,
                inXml,
                inSitemap2,
                inCategory: (inEle || inInst || inMech),
                inEle,
                inInst,
                inMech,
                inHome,
                inToolsDb
            });
        }

        // Output summary
        console.log('\n--- Orphaned / Partially Linked Files ---');
        console.log(
            String('File').padEnd(45) + ' | ' +
            'XML' + ' | ' +
            'SM2' + ' | ' +
            'CAT' + ' | ' +
            'HOM' + ' | ' +
            'TDB'
        );
        console.log('-'.repeat(80));
        
        const totallyOrphaned = [];
        const partiallyOrphaned = [];

        for (const r of results) {
            const statusStr = 
                (r.inXml ? 'YES' : 'NO ').padEnd(3) + ' | ' +
                (r.inSitemap2 ? 'YES' : 'NO ').padEnd(3) + ' | ' +
                (r.inCategory ? 'YES' : 'NO ').padEnd(3) + ' | ' +
                (r.inHome ? 'YES' : 'NO ').padEnd(3) + ' | ' +
                (r.inToolsDb ? 'YES' : 'NO ').padEnd(3);

            if (!r.inXml && !r.inSitemap2 && !r.inCategory && !r.inHome && !r.inToolsDb) {
                totallyOrphaned.push(r.file);
            } else if (!r.inXml || !r.inSitemap2 || !r.inCategory || !r.inHome || !r.inToolsDb) {
                partiallyOrphaned.push(r);
            }

            if (!r.inXml || !r.inSitemap2 || !r.inCategory || !r.inHome || !r.inToolsDb) {
                console.log(r.file.padEnd(45) + ' | ' + statusStr);
            }
        }

        console.log('\nTotally Orphaned (Not linked anywhere):', totallyOrphaned);
        console.log('Partially Linked / Missing somewhere count:', partiallyOrphaned.length);

    } catch (err) {
        console.error(err);
    }
}

checkOrphans();
