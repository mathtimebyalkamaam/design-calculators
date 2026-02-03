const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const htmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html'));

htmlFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix sitemap2.html.html -> sitemap2.html
    if (content.includes('sitemap2.html.html')) {
        content = content.replace(/sitemap2\.html\.html/g, 'sitemap2.html');
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${file}`);
    }
});
