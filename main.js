document.addEventListener('DOMContentLoaded', () => {
    // --- COOKIE CONSENT & ADSENSE LOGIC START ---
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('accept-cookies');
    const declineBtn = document.getElementById('decline-cookies');
    const consent = localStorage.getItem('cookieConsent');

    // Function to load AdSense dynamically
    function loadAdSense() {
        if (document.querySelector('script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]')) {
            return;
        }
        const script = document.createElement('script');
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5936527763614780";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
    }

    if (cookieBanner && acceptBtn && declineBtn) {
        if (consent === 'accepted') {
            // User previously accepted, load ads immediately
            loadAdSense();
        } else if (consent === 'declined') {
            // User previously declined, do nothing (ads won't load)
        } else {
            // No preference set, show banner
            cookieBanner.style.display = 'flex';
        }

        acceptBtn.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'accepted');
            cookieBanner.style.display = 'none';
            loadAdSense();
        });

        declineBtn.addEventListener('click', () => {
            localStorage.setItem('cookieConsent', 'declined');
            cookieBanner.style.display = 'none';
        });
    }
    // --- COOKIE CONSENT & ADSENSE LOGIC END ---

    // Theme Toggle
    const themeSwitch = document.getElementById('theme-switch');
    const body = document.body;
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme) {
        body.classList.add(currentTheme);
        if (themeSwitch && currentTheme === 'dark-mode') themeSwitch.checked = true;
    }

    if (themeSwitch) {
        themeSwitch.addEventListener('change', () => {
            if (themeSwitch.checked) {
                body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark-mode');
            } else {
                body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light-mode');
            }
        });
    }

    // Mobile Menu Toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    const navLinkItems = document.querySelectorAll('.nav-links a');

    if (mobileMenuToggle && navLinks) {
        mobileMenuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Close mobile menu when a link is clicked (Modified for Dropdowns)
        navLinkItems.forEach(link => {
            link.addEventListener('click', (e) => {
                // If it's a dropdown toggle and we are on mobile, toggle the dropdown instad of closing menu
                if (link.classList.contains('dropdown-toggle') && window.innerWidth <= 768) {
                    e.preventDefault();
                    link.parentElement.classList.toggle('active');
                    return; 
                }

                // Normal link behavior
                navLinks.classList.remove('active');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            });
        });
    }

    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            if (question && !question.hasAttribute('onclick') && !item.hasAttribute('onclick')) {
                question.addEventListener('click', () => {
                    // Close other active items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item && otherItem.classList.contains('active')) {
                            otherItem.classList.remove('active');
                        }
                    });
                    // Toggle current item
                    item.classList.toggle('active');
                });
            }
        });
    }

    // Intersection Observer for animations
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-in-up').forEach(el => observer.observe(el));


    // Back to Top Button
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- SEARCH LOGIC START ---
    const searchInput = document.getElementById('toolSearch');
    const searchResultsContainer = document.getElementById('search-results');

    if (searchInput && searchResultsContainer) {
        // Collect all tool data from the visible topical silos
        // Collect all tool data from static DB (generated from sitemap)
        const allTools = window.TOOLS_DB || [];

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();

            // Clear previous results
            searchResultsContainer.innerHTML = '';

            if (searchTerm.length === 0) {
                searchResultsContainer.classList.remove('active');
                return;
            }

            // Filter tools
            const filteredTools = allTools.filter(tool =>
                tool.name.toLowerCase().includes(searchTerm) ||
                tool.href.toLowerCase().includes(searchTerm)
            );

            if (filteredTools.length > 0) {
                filteredTools.forEach(tool => {
                    const resultItem = document.createElement('a');
                    resultItem.href = tool.href;
                    resultItem.className = `search-result-item ${tool.category}`;
                    resultItem.innerHTML = `
                        <i class="${tool.icon}"></i>
                        <div class="search-result-text">
                            <span class="result-name">${tool.name}</span>
                        </div>
                    `;
                    searchResultsContainer.appendChild(resultItem);
                });
                searchResultsContainer.classList.add('active');
            } else {
                const noResult = document.createElement('div');
                noResult.className = 'no-results-msg';
                noResult.textContent = 'No matching tools found.';
                searchResultsContainer.appendChild(noResult);
                searchResultsContainer.classList.add('active');
            }
        });

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchResultsContainer.contains(e.target)) {
                searchResultsContainer.classList.remove('active');
            }
        });

        // Open results again if input has focus and text
        searchInput.addEventListener('focus', () => {
            if (searchInput.value.trim().length > 0) {
                searchResultsContainer.classList.add('active');
            }
        });
    }
    // --- SEARCH LOGIC END ---
});

// --- UNIVERSAL ENGINEERING REPORT EXPORT & PRINT HELPERS ---
(function () {
    function cleanCellText(el) {
        if (!el) return '';
        const clone = el.cloneNode(true);
        clone.querySelectorAll('.tooltiptext, script, style').forEach(n => n.remove());
        return (clone.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function escapeCsv(val) {
        const s = String(val == null ? '' : val).replace(/\r?\n/g, ' ').trim();
        return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }

    function isElementVisible(el) {
        if (!el || el.classList.contains('hidden')) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
    }

    function findResultsRoot() {
        const selectors = ['#result-container', '#results-section', '.result-container', '#results-card'];
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    window.exportCalculationToCSV = function () {
        const resultsRoot = findResultsRoot();
        if (resultsRoot && !isElementVisible(resultsRoot)) {
            alert('Please run a calculation first before exporting results to CSV.');
            return;
        }

        const rows = [];
        const pageHeading = cleanCellText(document.querySelector('main h1, h1')) || document.title;
        rows.push(['Calculation Report', pageHeading]);
        rows.push(['Exported At', new Date().toISOString()]);
        rows.push([]);

        const inputScope = document.querySelector('main') || document.body;
        const inputRows = [];
        inputScope.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]), select').forEach(ctrl => {
            if (!isElementVisible(ctrl) || ctrl.id === 'toolSearch' || ctrl.id === 'theme-switch') return;
            let labelText = '';
            if (ctrl.id) {
                const lbl = inputScope.querySelector(`label[for="${CSS.escape(ctrl.id)}"]`);
                if (lbl) labelText = cleanCellText(lbl);
            }
            if (!labelText) {
                const group = ctrl.closest('.form-group, .input-group, .field-group');
                const lbl = group ? group.querySelector('label') : null;
                if (lbl) labelText = cleanCellText(lbl);
            }
            if (!labelText) labelText = ctrl.name || ctrl.id || '';
            if (!labelText) return;

            let valText = '';
            if (ctrl.tagName === 'SELECT') {
                valText = ctrl.options[ctrl.selectedIndex] ? ctrl.options[ctrl.selectedIndex].text.trim() : ctrl.value;
            } else if (ctrl.type === 'checkbox' || ctrl.type === 'radio') {
                if (!ctrl.checked) return;
                valText = ctrl.value || 'Checked';
            } else {
                valText = ctrl.value;
            }
            inputRows.push([labelText, valText]);
        });

        if (inputRows.length) {
            rows.push(['--- Design Inputs ---', '']);
            rows.push(['Parameter', 'Value']);
            inputRows.forEach(r => rows.push(r));
            rows.push([]);
        }

        const scope = resultsRoot || document.querySelector('main') || document.body;
        let capturedOutputs = 0;

        scope.querySelectorAll('table').forEach(tbl => {
            const trs = tbl.querySelectorAll('tr');
            if (!trs.length) return;
            rows.push(['--- Calculation Results ---', '']);
            trs.forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('th, td')).map(c => cleanCellText(c));
                if (cells.some(Boolean)) {
                    rows.push(cells);
                    capturedOutputs++;
                }
            });
            rows.push([]);
        });

        if (!capturedOutputs) {
            const metricSelectors = '.kpi-card, .metric-card, .res-card, .result-card, .result-item, .summary-item, .stat-card';
            const metricRows = [];
            scope.querySelectorAll(metricSelectors).forEach(card => {
                const lbl = cleanCellText(card.querySelector('.kpi-label, .metric-label, .res-label, .result-label, .label, h4, h5, strong'));
                const val = cleanCellText(card.querySelector('.kpi-value, .metric-value, .res-val, .res-value, .result-value, .value, span'));
                if (lbl && val && lbl !== val) metricRows.push([lbl, val]);
            });
            if (metricRows.length) {
                rows.push(['--- Summary Metrics ---', '']);
                rows.push(['Metric', 'Value']);
                metricRows.forEach(r => rows.push(r));
                capturedOutputs += metricRows.length;
            }
        }

        if (!capturedOutputs && !inputRows.length) {
            alert('No calculation results are available to export yet.');
            return;
        }

        const csvContent = '\uFEFF' + rows.map(r => r.map(escapeCsv).join(',')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const slug = (window.location.pathname.split('/').pop() || 'calculation').replace(/\.html$/i, '') || 'calculation';
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}-calculation.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    window.printCalculationReport = function () {
        const resultsRoot = findResultsRoot();
        if (resultsRoot && !isElementVisible(resultsRoot)) {
            alert('Please run a calculation first before printing the report.');
            return;
        }
        window.print();
    };
})();
