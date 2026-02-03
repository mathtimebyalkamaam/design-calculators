/**
 * Comprehensive Link Auditor for Design Calculators
 * Checks all links in all HTML files and verifies headers/footers
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;

// Get all HTML files
function getHtmlFiles() {
    const files = fs.readdirSync(DIR);
    return files.filter(f => f.endsWith('.html'));
}

// Extract all internal links from HTML content
function extractLinks(content) {
    const links = [];
    
    // Match href attributes
    const hrefRegex = /href=["']([^"'#]+)(?:#[^"']*)?["']/gi;
    let match;
    while ((match = hrefRegex.exec(content)) !== null) {
        let link = match[1].trim();
        // Skip external links, javascript, and mailto
        if (link.startsWith('http://') || link.startsWith('https://') || 
            link.startsWith('javascript:') || link.startsWith('mailto:') ||
            link.startsWith('tel:') || link === '' || link === '#') {
            continue;
        }
        links.push(link);
    }
    
    return [...new Set(links)]; // Unique links only
}

// Check if a linked file exists
function checkLink(link, sourceFile) {
    // Normalize the link
    let targetPath = link;
    
    // Handle absolute paths (starting with /)
    if (link.startsWith('/')) {
        targetPath = link.substring(1);
    }
    
    // Remove query strings
    targetPath = targetPath.split('?')[0];
    
    // Build full path
    const fullPath = path.join(DIR, targetPath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
        return { valid: false, link, file: fullPath };
    }
    
    return { valid: true, link };
}

// Extract header content (simplified check for navigation structure)
function extractHeader(content) {
    const headerMatch = content.match(/<header[^>]*>[\s\S]*?<\/header>/i);
    return headerMatch ? headerMatch[0] : null;
}

// Extract footer content
function extractFooter(content) {
    const footerMatch = content.match(/<footer[^>]*>[\s\S]*?<\/footer>/i);
    return footerMatch ? footerMatch[0] : null;
}

// Check for key navigation links in header
function checkHeaderLinks(content, filename) {
    const issues = [];
    const header = extractHeader(content);
    
    if (!header) {
        issues.push({ type: 'missing_header', file: filename });
        return issues;
    }
    
    // Check for essential navigation items
    const essentialLinks = [
        { pattern: /href=["'][^"']*index\.html["']/i, name: 'Home link' },
        { pattern: /href=["'][^"']*indexele\.html["']/i, name: 'Electrical section' },
        { pattern: /href=["'][^"']*indexinst\.html["']/i, name: 'Instrumentation section' },
        { pattern: /href=["'][^"']*indexmech\.html["']/i, name: 'Mechanical section' }
    ];
    
    for (const link of essentialLinks) {
        if (!link.pattern.test(header)) {
            issues.push({ type: 'missing_nav_link', file: filename, missing: link.name });
        }
    }
    
    // Check for broken dropdown links
    const dropdownLinks = header.match(/href=["']([^"']+)["']/gi) || [];
    for (const hrefAttr of dropdownLinks) {
        const linkMatch = hrefAttr.match(/href=["']([^"'#]+)/i);
        if (linkMatch) {
            const link = linkMatch[1];
            if (!link.startsWith('http') && !link.startsWith('mailto') && !link.startsWith('javascript')) {
                const result = checkLink(link, filename);
                if (!result.valid) {
                    issues.push({ type: 'broken_header_link', file: filename, link: result.link });
                }
            }
        }
    }
    
    return issues;
}

// Check footer
function checkFooter(content, filename) {
    const issues = [];
    const footer = extractFooter(content);
    
    if (!footer) {
        issues.push({ type: 'missing_footer', file: filename });
        return issues;
    }
    
    // Check for essential footer links
    const essentialFooterLinks = [
        { pattern: /about\.html/i, name: 'About page' },
        { pattern: /contact\.html/i, name: 'Contact page' },
        { pattern: /privacy-policy\.html/i, name: 'Privacy Policy' }
    ];
    
    for (const link of essentialFooterLinks) {
        if (!link.pattern.test(footer)) {
            issues.push({ type: 'missing_footer_link', file: filename, missing: link.name });
        }
    }
    
    return issues;
}

// Main audit function
function auditLinks() {
    const htmlFiles = getHtmlFiles();
    const allIssues = [];
    const brokenLinks = new Map(); // Track broken links and their sources
    const validLinksCount = { total: 0, valid: 0, broken: 0 };
    
    console.log(`\n📁 Found ${htmlFiles.length} HTML files\n`);
    console.log('=' .repeat(70));
    
    for (const file of htmlFiles) {
        const filePath = path.join(DIR, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const links = extractLinks(content);
        
        // Check each link
        for (const link of links) {
            validLinksCount.total++;
            const result = checkLink(link, file);
            if (!result.valid) {
                validLinksCount.broken++;
                if (!brokenLinks.has(result.link)) {
                    brokenLinks.set(result.link, []);
                }
                brokenLinks.get(result.link).push(file);
            } else {
                validLinksCount.valid++;
            }
        }
        
        // Check header
        const headerIssues = checkHeaderLinks(content, file);
        allIssues.push(...headerIssues);
        
        // Check footer  
        const footerIssues = checkFooter(content, file);
        allIssues.push(...footerIssues);
    }
    
    // Report broken links
    console.log('\n🔗 BROKEN LINKS REPORT');
    console.log('=' .repeat(70));
    
    if (brokenLinks.size === 0) {
        console.log('✅ No broken internal links found!');
    } else {
        console.log(`❌ Found ${brokenLinks.size} broken links:\n`);
        for (const [link, sources] of brokenLinks) {
            console.log(`  🔴 ${link}`);
            console.log(`     Found in: ${sources.slice(0, 5).join(', ')}${sources.length > 5 ? ` (+${sources.length - 5} more)` : ''}`);
        }
    }
    
    // Report header/footer issues
    console.log('\n\n📋 HEADER/FOOTER ISSUES');
    console.log('=' .repeat(70));
    
    const missingHeaders = allIssues.filter(i => i.type === 'missing_header');
    const missingFooters = allIssues.filter(i => i.type === 'missing_footer');
    const missingNavLinks = allIssues.filter(i => i.type === 'missing_nav_link');
    const brokenHeaderLinks = allIssues.filter(i => i.type === 'broken_header_link');
    
    if (missingHeaders.length > 0) {
        console.log(`\n⚠️  Missing Headers (${missingHeaders.length}):`);
        missingHeaders.forEach(i => console.log(`   - ${i.file}`));
    }
    
    if (missingFooters.length > 0) {
        console.log(`\n⚠️  Missing Footers (${missingFooters.length}):`);
        missingFooters.forEach(i => console.log(`   - ${i.file}`));
    }
    
    if (brokenHeaderLinks.length > 0) {
        console.log(`\n🔴 Broken Header Links (${brokenHeaderLinks.length}):`);
        const uniqueBroken = [...new Set(brokenHeaderLinks.map(i => i.link))];
        uniqueBroken.forEach(link => {
            const files = brokenHeaderLinks.filter(i => i.link === link).map(i => i.file);
            console.log(`   - ${link} (in ${files.length} files)`);
        });
    }
    
    // Summary
    console.log('\n\n📊 SUMMARY');
    console.log('=' .repeat(70));
    console.log(`  Total HTML files scanned: ${htmlFiles.length}`);
    console.log(`  Total links checked: ${validLinksCount.total}`);
    console.log(`  Valid links: ${validLinksCount.valid}`);
    console.log(`  Broken links: ${validLinksCount.broken} (${brokenLinks.size} unique)`);
    console.log(`  Files with missing headers: ${missingHeaders.length}`);
    console.log(`  Files with missing footers: ${missingFooters.length}`);
    console.log(`  Broken header navigation links: ${brokenHeaderLinks.length}`);
    
    // Return data for programmatic use
    return {
        brokenLinks: [...brokenLinks.entries()],
        missingHeaders: missingHeaders.map(i => i.file),
        missingFooters: missingFooters.map(i => i.file),
        brokenHeaderLinks: [...new Set(brokenHeaderLinks.map(i => i.link))]
    };
}

// Run the audit
const results = auditLinks();

// Write detailed report to file
const report = {
    timestamp: new Date().toISOString(),
    ...results
};

fs.writeFileSync(
    path.join(DIR, 'link_audit_report.json'),
    JSON.stringify(report, null, 2)
);

console.log('\n📄 Detailed report saved to: link_audit_report.json');
