const fs = require('fs');
const path = 'indexmech.html';
let content = fs.readFileSync(path, 'utf8');

// Replace single-quoted attributes with double-quoted ones
content = content.replace(/class='([^']+)'/g, 'class="$1"');
content = content.replace(/href='([^']+)'/g, 'href="$1"');

fs.writeFileSync(path, content);
console.log('Fixed quotes in indexmech.html');
