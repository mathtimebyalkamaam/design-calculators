const fs = require('fs');
const path = require('path');

const files = ['indexele.html', 'indexinst.html', 'indexmech.html'];
const targets = [
    'electricalresidentialload.html', 'insulationresistance.html', 'powertriangletool.html',
    'controlvalveleakage.html', 'dbcalculator.html', 'wirelesshart.html',
    'frictionfactortool.html', 'nptbspthreadcalculator.html', 'pipescheduletool.html'
];

for (const f of files) {
    const p = path.join(__dirname, f);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.split('\n');
    console.log(`\n--- ${f} ---`);
    for (const t of targets) {
        lines.forEach((line, index) => {
            if (line.includes(t)) {
                console.log(`  Target: ${t} at line ${index + 1}: ${line.trim()}`);
            }
        });
    }
}
