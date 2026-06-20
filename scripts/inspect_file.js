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
    if (!fs.existsSync(p)) {
        console.log(`File does not exist: ${f}`);
        continue;
    }
    const content = fs.readFileSync(p, 'utf8');
    console.log(`\n--- Checking ${f} ---`);
    for (const t of targets) {
        const count = (content.match(new RegExp(t, 'g')) || []).length;
        console.log(`  ${t}: found ${count} times`);
    }
}
