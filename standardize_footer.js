const fs = require('fs');
const path = require('path');

const rootDir = 'e:\\GOOGLE AI STUDIO\\design-calculators';

// The "Master" Footer from index.html (lines 1588-1681 approx)
// Adjusted for formatting and to be self-contained
const masterFooter = `    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-left">
                    <a href="/" class="footer-logo">
                        <img src="logo.png" alt="Design Calculators Logo" loading="lazy" decoding="async">
                        <span class="footer-logo-text">Design Calculators</span>
                    </a>
                    <p class="footer-description">A comprehensive engineering calculator hub based on IEC, IEEE, and
                        global standards.</p>
                    <div class="social-buttons">
                        <a href="https://www.linkedin.com/shareArticle?mini=true&url=https://designcalculators.co.in"
                            target="_blank" rel="noopener noreferrer" class="social-btn linkedin"
                            aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                        <a href="https://www.youtube.com/@designcalculators" target="_blank" rel="noopener noreferrer"
                            class="social-btn youtube" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                        <a href="https://twitter.com/intent/tweet?url=https://designcalculators.co.in&text=Check%20out%20this%20amazing%20engineering%20calculator%20hub!"
                            target="_blank" rel="noopener noreferrer" class="social-btn twitter" aria-label="Twitter"><i
                                class="fab fa-twitter"></i></a>
                        <a href="https://www.facebook.com/sharer/sharer.php?u=https://designcalculators.co.in"
                            target="_blank" rel="noopener noreferrer" class="social-btn facebook"
                            aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                        <a href="https://api.whatsapp.com/send?text=Check%20out%20this%20amazing%20engineering%20resource:%20https://designcalculators.co.in"
                            target="_blank" rel="noopener noreferrer" class="social-btn whatsapp"
                            aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
                    </div>
                </div>
                <div class="footer-right">
                    <div class="footer-col">
                        <h4>Quick Links</h4>
                        <ul>
                            <li><a href='/indexele.html'>Electrical Tools</a></li>
                            <li><a href='/indexmech.html'>Mechanical Tools</a></li>
                            <li><a href='/indexinst.html'>Instrumentation Tools</a></li>
                            <li><a href='/about.html'>About Us</a></li>
                            <li><a href='/faq.html'>FAQ</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4>Learn More</h4>
                        <ul>
                            <li><a href="https://www.youtube.com/@designcalculators" target="_blank"
                                    rel="noopener noreferrer">YouTube Channel</a></li>
                            <li><a href='/contact.html'>Contact Us</a></li>
                            <li><a href='/privacy-policy.html'>Privacy Policy</a></li>
                            <li><a href='/terms-of-service.html'>Terms of Service</a></li>
                            <li><a href='/sitemap2.html'>Sitemap</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4>Our Network</h4>
                        <ul>
                            <li style="margin-bottom: 12px;">
                                <a href="https://reliabilitytools.co.in/" target="_blank" rel="noopener"
                                   style="font-weight: 600; display: block; margin-bottom: 2px;">Reliability Tools</a>
                                <span style="font-size: 0.85rem; color: #94a3b8; line-height: 1.3; display: block;">Reliability
                                    & maintenance engineering calculators.</span>
                            </li>
                            <li style="margin-bottom: 12px;">
                                <a href="https://electrosafe.homes/" target="_blank" rel="noopener"
                                   style="font-weight: 600; display: block; margin-bottom: 2px;">ElectroSafe</a>
                                <span style="font-size: 0.85rem; color: #94a3b8; line-height: 1.3; display: block;">Dedicated
                                    to home electrical safety & protection.</span>
                            </li>
                            <li>
                                <a href="https://knowyourname.co.in/" target="_blank" rel="noopener"
                                   style="font-weight: 600; display: block; margin-bottom: 2px;">KnowYourName</a>
                                <span style="font-size: 0.85rem; color: #94a3b8; line-height: 1.3; display: block;">Scientific
                                    name analysis: Phonetics, Ergonomics & Acoustics.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="footer-disclaimer">
                <p>All calculations are for preliminary engineering design guidance. Final designs must comply with all applicable local and international standards (including but not limited to ASHRAE 90.1, ARI 550/590). Always verify calculations and consult with a licensed professional engineer before implementation or construction.</p>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 Design Calculators. Created by <span style="color: var(--secondary); font-weight: bold;">Anil Sharma</span>. All rights reserved.</p>
            </div>
        </div>
    </footer>`;

function updateFooters(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                updateFooters(fullPath);
            }
        } else if (file.endsWith('.html') && file !== 'index.html') { // Skip source file
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // Regex to match existing footer
            // We use [\s\S]*? for non-greedy match across lines
            const footerRegex = /<footer>[\s\S]*?<\/footer>/i;
            
            if (footerRegex.test(content)) {
                const newContent = content.replace(footerRegex, masterFooter);
                fs.writeFileSync(fullPath, newContent, 'utf8');
                console.log(`Updated: ${file}`);
            } else {
                console.log(`Skipped (No footer found): ${file}`);
            }
        }
    });
}

console.log('Starting footer standardization...');
updateFooters(rootDir);
console.log('Footer standardization complete.');
