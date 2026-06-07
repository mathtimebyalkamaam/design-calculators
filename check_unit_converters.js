const fs = require('fs');
const path = require('path');

const files = ['unit-converter.html', 'unit-converter-instrumentation.html', 'unit-converter-mechanical.html'];

for (const f of files) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) {
        console.log(`${f} does not exist.`);
        continue;
    }
    const content = fs.readFileSync(p, 'utf8');
    const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
    const h1Match = content.match(/<h1>([\s\S]*?)<\/h1>/i);
    console.log(`${f}:`);
    console.log(`  Title: ${titleMatch ? titleMatch[1].trim() : 'N/A'}`);
    console.log(`  H1: ${h1Match ? h1Match[1].trim() : 'N/A'}`);
}
