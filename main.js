document.addEventListener('DOMContentLoaded', () => {
    // --- COOKIE CONSENT & ADSENSE LOGIC START ---
    const cookieBanner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('accept-cookies');
    const declineBtn = document.getElementById('decline-cookies');
    const consent = localStorage.getItem('cookieConsent');

    // Function to load AdSense dynamically
    function loadAdSense() {
        const script = document.createElement('script');
        script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5936527763614780";
        script.async = true;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
        console.log('AdSense script loaded.');
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

        // Close mobile menu when a link is clicked
        navLinkItems.forEach(link => {
            link.addEventListener('click', () => {
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
            if (question) {
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
        const allTools = Array.from(document.querySelectorAll('.silo-card')).map(link => {
            let category = 'electrical';
            if (link.classList.contains('instrumentation')) category = 'instrumentation';
            else if (link.classList.contains('mechanical')) category = 'mechanical';

            return {
                name: link.querySelector('span').textContent.trim(),
                href: link.getAttribute('href'),
                category: category,
                icon: link.querySelector('i').className
            };
        });

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
                tool.name.toLowerCase().includes(searchTerm)
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
