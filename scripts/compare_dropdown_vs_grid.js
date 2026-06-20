const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const indexElePath = path.join(rootDir, 'indexele.html');
const indexInstPath = path.join(rootDir, 'indexinst.html');
const indexMechPath = path.join(rootDir, 'indexmech.html');

function extractDropdownLinks(html, category) {
    // category can be "Electrical", "Instrumentation", "Mechanical"
    let fileSuffix = '';
    if (category === 'Electrical') fileSuffix = 'ele';
    if (category === 'Instrumentation') fileSuffix = 'inst';
    if (category === 'Mechanical') fileSuffix = 'mech';

    const startIdx = html.indexOf(`href="/index${fileSuffix}.html" class="dropdown-toggle"`);
    if (startIdx === -1) {
        // Try without leading slash
        const startIdx2 = html.indexOf(`href="index${fileSuffix}.html" class="dropdown-toggle"`);
        if (startIdx2 === -1) {
            console.log(`Could not find dropdown toggle for ${category}`);
            return [];
        }
    }
    
    const actualStart = startIdx !== -1 ? startIdx : html.indexOf(`href="index${fileSuffix}.html" class="dropdown-toggle"`);

    // Find the next </li> which closes the dropdown
    const endIdx = html.indexOf('</li>', actualStart);
    const dropdownChunk = html.substring(actualStart, endIdx);
    
    // Find all href="/..." or href="..." inside
    const regex = /href=['"]\/?(.*?)['"]/g;
    let match;
    const links = [];
    while ((match = regex.exec(dropdownChunk)) !== null) {
        const link = match[1];
        if (link.startsWith('index') || link === '') continue;
        links.push(link);
    }
    return links;
}

function extractGridCards(html) {
    const startIdx = html.indexOf('<div class="silo-grid">');
    if (startIdx === -1) return [];
    const endIdx = html.indexOf('</section>', startIdx);
    const gridChunk = html.substring(startIdx, endIdx);
    
    const regex = /href=['"]\/?(.*?)['"]/g;
    let match;
    const links = [];
    while ((match = regex.exec(gridChunk)) !== null) {
        const link = match[1];
        if (link.startsWith('index') || link === '') continue;
        links.push(link);
    }
    return links;
}

function checkFile(filePath, categoryName) {
    const html = fs.readFileSync(filePath, 'utf8');
    const dropdowns = extractDropdownLinks(html, categoryName);
    const grid = extractGridCards(html);
    
    console.log(`\n--- ${categoryName} (${path.basename(filePath)}) ---`);
    console.log(`Dropdown links count: ${dropdowns.length}`);
    console.log(`Grid cards count: ${grid.length}`);
    
    const missingInGrid = dropdowns.filter(d => !grid.includes(d));
    console.log(`Missing in Grid:`, missingInGrid);
}

checkFile(indexElePath, 'Electrical');
checkFile(indexInstPath, 'Instrumentation');
checkFile(indexMechPath, 'Mechanical');
