const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const hubs = ['indexele.html', 'indexinst.html', 'indexmech.html'];

function extractTools(hubFile) {
    const content = fs.readFileSync(path.join(rootDir, hubFile), 'utf8');
    const tools = [];
    
    // Regex to match <a class='silo-card ...' href='/file.html'> <span>Name</span> <p>Desc</p> </a>
    const siloRegex = /<a\s+class=["']silo-card[\s\S]*?href=["']\/([\s\S]*?)["']>[\s\S]*?<span>([\s\S]*?)<\/span>[\s\S]*?<p>([\s\S]*?)<\/p>/gi;
    
    let match;
    while ((match = siloRegex.exec(content)) !== null) {
        tools.push({
            file: match[1],
            name: match[2].trim(),
            desc: match[3].trim()
        });
    }
    return tools;
}

async function updateLLMsTxt() {
    let output = `# Design Calculators - Master Engineering Tool Registry\n\n`;
    output += `## Project Overview\nDesign Calculators is a high-authority engineering suite providing standardized tools for Electrical, Mechanical, and Instrumentation design. All calculators are based on international standards (IEC, IEEE, API, ASME, ISA).\n\n`;
    
    const categories = [
        { name: "Electrical Engineering", file: "indexele.html" },
        { name: "Instrumentation & Control", file: "indexinst.html" },
        { name: "Mechanical Engineering", file: "indexmech.html" }
    ];

    for (const cat of categories) {
        output += `## ${cat.name}\n`;
        const tools = extractTools(cat.file);
        for (const tool of tools) {
            output += `- [${tool.name}](https://designcalculators.co.in/${tool.file}): ${tool.desc}\n`;
        }
        output += `\n`;
    }

    output += `## Technical Implementation\n- **Stack**: Static HTML5/CSS3/JS.\n- **Math Engine**: MathJax (LaTeX) for formula rendering.\n- **Data Viz**: Chart.js for interactive sensitivity analysis.\n- **Authority**: Expert-curated by Anil Sharma (28+ years experience).\n`;

    fs.writeFileSync(path.join(rootDir, 'llms.txt'), output, 'utf8');
    console.log(`llms.txt updated with ${categories.length} categories.`);
}

updateLLMsTxt().catch(console.error);
