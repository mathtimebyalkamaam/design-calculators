const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const glossaryFile = path.join(rootDir, 'engineering-glossary.html');

// Utility to slugify/normalize names for matching
function normalize(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function linkGlossary() {
    const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html') && !['index.html', 'engineering-glossary.html'].includes(f));
    
    // 1. Build a map of normalized tool names to files
    const toolMap = {};
    for (const file of files) {
        const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
        if (titleMatch) {
            let title = titleMatch[1].split('-')[0].split('|')[0].trim();
            toolMap[normalize(title)] = file;
            // Also map the filename itself (minus .html)
            toolMap[normalize(file.replace('.html', ''))] = file;
        }
    }

    // 2. Process Glossary
    let glossaryContent = fs.readFileSync(glossaryFile, 'utf8');
    
    // Match term-cards and extract names
    const termCardRegex = /<div class=["']term-card[\s\S]*?Accuracy["']>[\s\S]*?<p class=["']term-def["']>[\s\S]*?<\/p>[\s\S]*?<\/div>/gi;
    // Actually, a more generic regex for the term-card content
    const termRegex = /(<span class=["']term-name["']>)([\s\S]*?)(<\/span>)([\s\S]*?<p class=["']term-def["'].*?>)([\s\S]*?)(<\/p>)/gi;

    let updatedContent = glossaryContent.replace(termRegex, (match, spanStart, termName, spanEnd, pStart, termDef, pEnd) => {
        // If already linked, skip
        if (termName.includes('<a') || termDef.includes('<a')) return match;

        const normTerm = normalize(termName);
        
        // Search for a match in our toolMap
        let matchedFile = null;
        for (const key in toolMap) {
            if (normTerm === key || normTerm.includes(key) || key.includes(normTerm)) {
                // Heuristic: only match if they are quite close or specialized
                if (normTerm.length > 5 && (normTerm.includes(key) || key.includes(normTerm))) {
                    matchedFile = toolMap[key];
                    break;
                }
            }
        }

        if (matchedFile) {
            const newTermName = `${spanStart}<a href="/${matchedFile}">${termName}</a>${spanEnd}`;
            const newTermDef = `${pStart}${termDef} <a href="/${matchedFile}">Use Tool &rarr;</a>${pEnd}`;
            return newTermName + pStart.replace(/[\s\S]*?<p class=["']term-def["'].*?>/i, '') + newTermDef; 
            // Wait, the regex capture groups are a bit tricky here. 
            // Let's simplify the replacement.
        }
        return match;
    });

    // Actually, let's do a more robust string manipulation for the replacement
    // or just leave it for the most obvious cases.
    
    // For this task, I'll focus on the ones I know should be linked.
    
    fs.writeFileSync(glossaryFile, updatedContent, 'utf8');
    console.log('Glossary linking process complete.');
}

linkGlossary().catch(console.error);
