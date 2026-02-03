const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
// Files to exclude from injection/scanning
const excludeFiles = ['sitemap2.html', 'sitemap.html.html'];

// Paths onto which we will base our extraction
const indexFiles = {
    'Electrical': 'indexele.html',
    'Instrumentation': 'indexinst.html',
    'Mechanical': 'indexmech.html'
};

async function getToolsFromIndex(filename) {
    const filePath = path.join(rootDir, filename);
    if (!fs.existsSync(filePath)) {
        console.warn(`Warning: ${filename} not found.`);
        return [];
    }

    const content = await fs.promises.readFile(filePath, 'utf8');
    const tools = [];

    // Regex to find silo-cards which contain the links
    // <a class='silo-card electrical' href='/arcflash.html'>
    //    <i class='fas fa-user-shield'></i>
    //    <span>Arc Flash Calculator</span>
    const cardRegex = /<a\s+class=['"]silo-card\s+([^'"]+)['"]\s+href=['"]([^'"]+)['"]>[\s\S]*?<span>([^<]+)<\/span>/g;

    let match;
    while ((match = cardRegex.exec(content)) !== null) {
        tools.push({
            category: match[1], // e.g., 'electrical'
            href: match[2],     // e.g., '/arcflash.html'
            name: match[3]      // e.g., 'Arc Flash Calculator'
        });
    }

    return tools.sort((a, b) => a.name.localeCompare(b.name)); // Alphabetical order
}

function generateMegaMenuHTML(categoryName, tools) {
    // Split tools into 3 columns
    const columns = [[], [], []];
    tools.forEach((tool, index) => {
        columns[index % 3].push(tool);
    });

    // Map category names to correct index filenames
    const categoryLinks = {
        'Electrical': '/indexele.html',
        'Instrumentation': '/indexinst.html',
        'Mechanical': '/indexmech.html'
    };
    const categoryLink = categoryLinks[categoryName] || '#';

    let menuHtml = `
    <li class="dropdown">
        <a href="${categoryLink}" class="dropdown-toggle">${categoryName} <i class="fas fa-chevron-down" style="font-size: 0.7em; margin-left: 4px;"></i></a>
        <div class="dropdown-menu">
            <div class="repo-grid">`;

    columns.forEach(col => {
        menuHtml += `<div>`; // Column div
        col.forEach(tool => {
            menuHtml += `<a href="${tool.href}">${tool.name}</a>`;
        });
        menuHtml += `</div>`;
    });

    menuHtml += `
            </div>
            <div class="view-all-container">
                <a href="${categoryLink}" class="view-all-link">View All ${categoryName} Tools →</a>
            </div>
        </div>
    </li>`;

    return menuHtml;
}

const megaMenuCSS = `
<style>
/* Mega Menu Core Styles */
.header .navbar {
    position: relative; /* Ensure dropdowns position relative to this or header */
}

/* Nav Item Container */
.nav-links .nav-item {
    position: relative;
    display: inline-block;
}

.nav-links .dropbtn {
    cursor: pointer;
    padding: 10px 0;
    display: inline-block;
}

.nav-links .dropbtn i {
    font-size: 0.8em;
    margin-left: 4px;
    opacity: 0.7;
    transition: transform 0.3s;
}

.nav-links .nav-item:hover .dropbtn i {
    transform: rotate(180deg);
}

/* Dropdown Content (The Mega Menu) */
.dropdown-content {
    display: none;
    position: absolute;
    background-color: var(--card-bg, #ffffff);
    width: 600px; /* Reduced width for better fit on standard laptop screens */
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    z-index: 2000;
    border-radius: 12px;
    padding: 20px;
    top: 100%; /* Position right below the link */
    margin-top: 5px; /* Tiny gap */
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease-in-out;
    border-top: 4px solid var(--secondary-color, #2563EB);
}

/* Show Dropdown on Hover */
.nav-links .nav-item:hover .dropdown-content {
    display: block;
    opacity: 1;
    visibility: visible;
}

/* Mega Menu Layout */
.dropdown-content .row {
    display: flex;
    gap: 20px;
}

.dropdown-content .column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* Links inside Mega Menu */
.dropdown-content a {
    color: var(--text-color, #4B5563) !important;
    padding: 6px 8px;
    text-decoration: none;
    display: block;
    font-size: 0.9rem !important; /* Smaller, dense text */
    border-radius: 6px;
    transition: background 0.2s, color 0.2s;
    font-weight: 400 !important;
    line-height: 1.4;
}

.dropdown-content a:hover {
    background-color: var(--hover-color, #F1F5F9);
    color: var(--primary-color, #1E3A8A) !important;
    transform: translateX(4px); /* Slide effect */
}

/* Mega Menu Footer/View All */
.mega-menu-footer {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 1px solid var(--border-color, #E2E8F0);
    text-align: center;
}

.mega-menu-footer .view-all-btn {
    display: inline-block;
    color: var(--primary-color, #1E3A8A) !important;
    font-weight: 700 !important;
    font-size: 0.95rem !important;
}

/* Dark Mode Overrides */
body.dark-mode .dropdown-content {
    background-color: var(--card-bg, #1E293B);
    border-color: var(--secondary-color, #34D399);
}
body.dark-mode .dropdown-content a {
    color: var(--text-color, #CBD5E1) !important;
}
body.dark-mode .dropdown-content a:hover {
    background-color: rgba(255,255,255,0.05);
    color: var(--primary-color, #10B981) !important;
}

/* Responsive: Turn Mega Menu into Accordion on Mobile */
@media (max-width: 992px) {
    .dropdown-content {
        position: static;
        width: 100%;
        box-shadow: none;
        transform: none;
        display: none !important; /* Hidden by default */
        padding: 0 0 0 15px;
        background: transparent;
        border: none;
    }
    
    .nav-links .nav-item:hover .dropdown-content {
        display: block !important; /* Show when "hovered" or tapped */
        opacity: 1;
        visibility: visible;
    }
    
    /* In mobile, we might want a click-to-expand, but CSS hover works for simple tap on many devices. 
       Better JS handling might be needed for perfect Mobile UX, but this is a start. */
       
    .dropdown-content .row {
        flex-direction: column;
        gap: 0;
    }
    
    .nav-links .nav-item {
        display: block; /* Stack items */
        width: 100%;
    }
    
    .nav-links .dropbtn {
        width: 100%;
        display: flex;
        justify-content: space-between;
    }
}
</style>
`;

async function injectMegaMenu() {
    console.log('Generating Mega Menus...');

    // 1. Gather all tools
    const electricalTools = await getToolsFromIndex(indexFiles['Electrical']);
    const instrumentationTools = await getToolsFromIndex(indexFiles['Instrumentation']);
    const mechanicalTools = await getToolsFromIndex(indexFiles['Mechanical']);

    console.log(`Found: ${electricalTools.length} Elec, ${instrumentationTools.length} Inst, ${mechanicalTools.length} Mech tools.`);

    // 2. Build the Nav HTML
    const electricalMenu = generateMegaMenuHTML('Electrical', electricalTools);
    const instrumentationMenu = generateMegaMenuHTML('Instrumentation', instrumentationTools);
    const mechanicalMenu = generateMegaMenuHTML('Mechanical', mechanicalTools);

    const newNavHtml = `
                    <ul class="nav-links">
                        <li><a href="/index.html">Home</a></li>
                        ${electricalMenu}
                        ${instrumentationMenu}
                        ${mechanicalMenu}
                        <li><a href="/index.html#articles">Articles</a></li>
                        <li><a href="/sitemap2.html">Site Map</a></li>
                    </ul>`;

    // 3. Inject into all files
    const files = await fs.promises.readdir(rootDir);
    const htmlFiles = files.filter(file => file.endsWith('.html') && !excludeFiles.includes(file));

    let updatedCount = 0;

    for (const file of htmlFiles) {
        const filePath = path.join(rootDir, file);
        try {
            let content = await fs.promises.readFile(filePath, 'utf8');
            let modified = false;

            // Inject CSS if missing
            // CSS injection removed - using styles.css
            /*
            if (!content.includes('Mega Menu Core Styles')) {
                // Try to place it before the closing head, or after our last injected style
                if (content.includes('</head>')) {
                    content = content.replace('</head>', `${megaMenuCSS}\n</head>`);
                    modified = true;
                }
            }
            */

            // Replace the <ul class="nav-links"> ... </ul> block
            // We need a robust regex to capture the whole list
            const navRegex = /<ul class="nav-links">[\s\S]*?<\/ul>/;

            if (navRegex.test(content)) {
                content = content.replace(navRegex, newNavHtml.trim());
                modified = true;
            } else {
                console.warn(`Could not find .nav-links in ${file}`);
            }

            if (modified) {
                await fs.promises.writeFile(filePath, content, 'utf8');
                updatedCount++;
            }
        } catch (err) {
            console.error(`Error updating ${file}:`, err);
        }
    }

    console.log(`Mega Menu Injected into ${updatedCount} files.`);
}

injectMegaMenu();
