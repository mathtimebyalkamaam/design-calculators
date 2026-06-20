const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SOURCE_FILE = path.join(DIR, 'index.html');
const LOG_FILE = path.join(DIR, 'header_update_log.txt');

// List of redirect files to exclude
const EXCLUDE_FILES = [
    'index.html', // Source file
    'blog.html',
    'indexmain.html',
    'instrumentationblog1.html',
    'mechanicalblog1.html',
    'sitemap.html.html'
];

function log(message) {
    console.log(message);
    fs.appendFileSync(LOG_FILE, message + '\n');
}

// 1. Extract Header from index.html
function getMasterHeader() {
    const content = fs.readFileSync(SOURCE_FILE, 'utf8');
    // Extract everything from <header class="header"> to associated </header>
    // We assume the header ends before <section class="hero"> or <main> or similar, 
    // but best to find the closing tag matching the indentation or just the first </header>.
    
    // Using a robust regex to capture the specific header block
    const headerRegex = /<header class="header">([\s\S]*?)<\/nav>\s*<\/div>\s*<\/header>/; 
    // Wait, looking at index.html (lines 255-317):
    // <header class="header">
    // ...
    //   <nav class="navbar"> ... </nav>
    // </header> -- This closing tag is not explicitly in the snippet but implied.
    // Let's refine the regex based on the structure we saw.
    
    // Actually, let's just grab from <header class="header"> to the first </header>
    const match = content.match(/<header class="header">[\s\S]*?<\/header>/);
    
    if (match) {
        return match[0];
    } else {
        throw new Error('Could not find <header class="header"> block in index.html');
    }
}

function processFiles() {
    const masterHeader = getMasterHeader();
    const files = fs.readdirSync(DIR).filter(f => f.endsWith('.html'));
    
    log(`Starting header standardization on ${files.length} files...`);
    log(`Master Header Length: ${masterHeader.length} chars`);

    let modifiedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    files.forEach(file => {
        if (EXCLUDE_FILES.includes(file)) {
            skippedCount++;
            return;
        }

        const filePath = path.join(DIR, file);
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;
            
            // 1. Ensure styles.css is linked
            if (!content.includes('styles.css')) {
                const styleLink = '<link rel="stylesheet" href="styles.css">';
                if (content.includes('</head>')) {
                    content = content.replace('</head>', `    ${styleLink}\n</head>`);
                    log(`[STYLE ADDED] ${file}`);
                }
            }

            // 2. Replace or Insert Header
            const headerRegex = /<header[\s\S]*?<\/header>/;
            
            if (headerRegex.test(content)) {
                // Replace existing header
                content = content.replace(headerRegex, masterHeader);
                // log(`[REPLACED] ${file}`);
            } else {
                // Insert after <body>
                if (content.includes('<body')) {
                    // Find the end of the opening body tag (handling attributes)
                    const bodyMatch = content.match(/<body[^>]*>/);
                    if (bodyMatch) {
                        const bodyTag = bodyMatch[0];
                        content = content.replace(bodyTag, `${bodyTag}\n${masterHeader}`);
                        log(`[INSERTED] ${file}`);
                    }
                } else {
                    log(`[WARNING] No <body> tag found in ${file}`);
                }
            }

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                modifiedCount++;
            }
            
        } catch (err) {
            log(`[ERROR] Processing ${file}: ${err.message}`);
            errorCount++;
        }
    });

    log('------------------------------------------------');
    log(`Completed. Modified: ${modifiedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
}

// Clear log file
if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

try {
    processFiles();
} catch (error) {
    log(`CRITICAL ERROR: ${error.message}`);
}
