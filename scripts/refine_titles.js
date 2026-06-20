const fs = require('fs');
const path = require('path');

function refineTitles() {
  console.log('Refining HTML Title Tags...');
  try {
    const files = fs.readdirSync('.').filter(file => file.endsWith('.html'));
    let updatedCount = 0;

    files.forEach(file => {
      let content = fs.readFileSync(file, 'utf8');
      
      // Match the exact <title>...</title> tag
      const titleRegex = /<title>(.*?)<\/title>/i;
      const match = content.match(titleRegex);
      
      if (match) {
        let originalTitle = match[1].trim();
        let newTitle = originalTitle;
        
        // Skip if already heavily optimized (contains "Free" or "|")
        if (!originalTitle.toLowerCase().includes('free') && !originalTitle.includes('|')) {
            if (originalTitle.toLowerCase().includes('calculator')) {
                newTitle = `${originalTitle} | Free Engineering Tool`;
            } else if (originalTitle.toLowerCase().includes('converter')) {
                newTitle = `${originalTitle} | Free Engineering Converter`;
            } else {
                newTitle = `${originalTitle} Calculator | Free Engineering Tool`;
            }
            
            const newContent = content.replace(titleRegex, `<title>${newTitle}</title>`);
            if (content !== newContent) {
                fs.writeFileSync(file, newContent, 'utf8');
                updatedCount++;
            }
        }
      }
    });
    console.log(`Successfully refined ${updatedCount} title tags!`);
  } catch (err) {
    console.error('Error processing files:', err);
  }
}

refineTitles();
