const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'engineering-glossary.html');
let content = fs.readFileSync(filePath, 'utf8');

// Replacements
const map = {
    '/steam-flow': 'steamflow.html',
    '/vibration-analysis': 'vibrationanalysis.html',
    '/speed-torque': 'shaft-power-torque.html' // Best guess
};

const unlinks = [
    '/vent-sizing',
    '/turbine-steam-consumption',
    '/thermal-conductivty'
];

// Apply Map
for (const [key, val] of Object.entries(map)) {
    // Regex for href="/key" or href="key"
    // We replace the HREF only
    // Note: The link report showed "/steam-flow", so it starts with /
    const regex = new RegExp(`href=["']${key}["']`, 'g');
    content = content.replace(regex, `href="${val}"`);
}

// Apply Unlinks
// convert <a href="/vent-sizing">Text</a> to Text
unlinks.forEach(link => {
    // This is tricky with regex.
    // <a href="/vent-sizing">...</a>
    // We capture the inner content.
    const regex = new RegExp(`<a\\s+href=["']${link}["'][^>]*>(.*?)<\/a>`, 'gi');
    content = content.replace(regex, '$1');
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed engineering-glossary.html');
