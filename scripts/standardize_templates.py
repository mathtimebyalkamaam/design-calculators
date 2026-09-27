import glob
import os
import re

DOMINANT_FOOTER = """<footer>
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
                            <li><a href="/electrical-calculators">Electrical Tools</a></li>
                            <li><a href="/mechanical-calculators">Mechanical Tools</a></li>
                            <li><a href="/instrumentation-calculators">Instrumentation Tools</a></li>
                            <li><a href="/about">About Us</a></li>
                            <li><a href="/faq">FAQ</a></li>
                            <li><a href="/engineering-excel-calculation-templates">Excel Templates</a></li>
                            <li><a href="/engineering-glossary">Engineering Glossary</a></li>
                        </ul>
                    </div>
                    <div class="footer-col">
                        <h4>Learn More</h4>
                        <ul>
                            <li><a href="https://www.youtube.com/@designcalculators" target="_blank"
                                    rel="noopener noreferrer">YouTube Channel</a></li>
                            <li><a href="/contact">Contact Us</a></li>
                            <li><a href="/privacy-policy">Privacy Policy</a></li>
                            <li><a href="/terms-of-service">Terms of Service</a></li>
                            <li><a href="/sitemap2">Sitemap</a></li>
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
                                <a href="https://livesimulators.com/" target="_blank" rel="noopener"
                                   style="font-weight: 600; display: block; margin-bottom: 2px;">Live Simulators</a>
                                <span style="font-size: 0.85rem; color: #94a3b8; line-height: 1.3; display: block;">Interactive
                                    engineering simulations & virtual laboratories.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="footer-disclaimer">
                <p>All tools are for guidance only and should not replace professional engineering judgment. Results must be verified by a qualified professional against project requirements and local codes.</p>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2026 Design Calculators. Created by <span style="color: var(--secondary); font-weight: bold;">Anil Sharma</span>. All rights reserved.</p>
            </div>
        </div>
    </footer>"""

EXCLUDED_PAGES = {
    'index.html',
    'engineering-excel-calculation-templates.html',
    'control-valve-cavitation-vs-flashing-prevention-guide.html',
    'ieee-80-substation-grounding-design-step-touch-potential.html',
    'water-hammer-joukowsky-equation-pipe-surge-analysis.html'
}

html_files = sorted(glob.glob('*.html'))
header_updated_files = []
footer_updated_files = []

for fpath in html_files:
    fname = os.path.basename(fpath)
    if fname in EXCLUDED_PAGES:
        continue

    with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
        content = fp.read()

    modified = False

    # 1. Header logo normalization (strictly inside <header>...</header>)
    def fix_header(m):
        header_text = m.group(0)
        # replace /logo.png with /logo.webp inside the logo container
        new_header = re.sub(
            r'(<a[^>]*class=["\']logo-container["\'][^>]*>\s*)<img\s+src=["\']/logo\.png["\']',
            r'\1<img src="/logo.webp"',
            header_text,
            flags=re.IGNORECASE
        )
        return new_header

    new_content, h_count = re.subn(r'<header\b[^>]*>[\s\S]*?</header>', fix_header, content, flags=re.IGNORECASE)
    if new_content != content:
        content = new_content
        header_updated_files.append(fname)
        modified = True

    # 2. Footer normalization (strictly replace <footer>...</footer> with DOMINANT_FOOTER)
    footer_match = re.search(r'<footer\b[^>]*>[\s\S]*?</footer>', content, re.IGNORECASE)
    if footer_match and footer_match.group(0) != DOMINANT_FOOTER:
        content = content[:footer_match.start()] + DOMINANT_FOOTER + content[footer_match.end():]
        footer_updated_files.append(fname)
        modified = True

    if modified:
        with open(fpath, 'w', encoding='utf-8') as fp:
            fp.write(content)

print(f"Header logos normalized to /logo.webp: {len(header_updated_files)} files")
print(f"Footers normalized to standard template: {len(footer_updated_files)} files")
