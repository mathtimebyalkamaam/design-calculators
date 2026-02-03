const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const excludeFiles = ['sitemap2.html', 'sitemap.html.html'];

async function fixHeaderOverflow() {
    console.log('Fixing Header Overflow Issues...');

    try {
        const files = await fs.promises.readdir(rootDir);
        const htmlFiles = files.filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

        let updatedCount = 0;

        for (const file of htmlFiles) {
            const filePath = path.join(rootDir, file);
            try {
                let content = await fs.promises.readFile(filePath, 'utf8');

                // We want to remove 'overflow: hidden;' specifically from the .header block
                // The typical block looks like:
                // .header {
                //     background: ...
                //     ...
                //     overflow: hidden;
                //     ...
                // }

                // Regex to match .header { ... } and capture content
                // We need to be careful not to match other classes.

                // A safer specific replace: look for "overflow: hidden;" inside the file
                // But only if it looks like it belongs to the .header specifically? 
                // Actually, simply removing 'overflow: hidden;' from the specific .header rules we've seen is safest.
                // We saw it on line 110: "overflow: hidden;"

                // Let's replace "overflow: hidden;" with "overflow: visible; /* Fixed for Mega Menu */"
                // BUT only if it is inside a .header CSS block?
                // The previous legacy CSS had it. 

                // Let's look for the specific legacy block pattern first.
                // It was:
                // .header {
                //    background: var(--gradient-primary);
                //    color: white;
                //    padding: 24px 0;
                //    position: relative;
                //    overflow: hidden;
                //    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                // }

                if (content.includes('.header {') && content.includes('overflow: hidden;')) {
                    // We'll treat global replace of "overflow: hidden;" inside .header as acceptable
                    // OR specifically target the line if we can indentify the context.

                    // Specific target logic: 
                    // content = content.replace(/(.header\s*{[^}]*?)overflow:\s*hidden;?/g, '$1overflow: visible;');
                    // This regex is tricky with JS without dotAll flag support in older environments, but node usually supports it.
                    // Let's use simple replacement for the known problematic string sequence if possible, 
                    // or a regex that matches the context.

                    const regex = /(\.header\s*\{[\s\S]*?)overflow:\s*hidden;([\s\S]*?\})/;

                    if (regex.test(content)) {
                        content = content.replace(regex, '$1overflow: visible; /* Fixed */$2');
                        await fs.promises.writeFile(filePath, content, 'utf8');
                        updatedCount++;
                    }
                }
            } catch (err) {
                console.error(`Error processing ${file}:`, err);
            }
        }

        console.log(`Updated overflow on ${updatedCount} files.`);

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

fixHeaderOverflow();
