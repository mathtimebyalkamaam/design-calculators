/**
 * llm-math-reader.js
 * 
 * Enhances MathJax formulas and calculations for AI scrapers, search crawlers,
 * and screen readers by exposing semantic plain-text mathematical descriptions.
 * 
 * Logic:
 * 1. Waits for MathJax.startup.promise (or DOMContentLoaded / immediate execution).
 * 2. Scans for elements matching .formula-block or .step-content having a data-llm-summary attribute.
 * 3. Appends a hidden <span class="sr-only"> containing the summary text.
 * 4. Ensures the .sr-only CSS utility rule is present.
 * 5. Uses a MutationObserver to handle dynamically rendered step calculations.
 */

(function () {
  'use strict';

  // Inject .sr-only styles if not already defined in the page styles
  function ensureSrOnlyStyle() {
    if (document.getElementById('llm-math-reader-style')) return;

    var style = document.createElement('style');
    style.id = 'llm-math-reader-style';
    style.textContent = [
      '/* Screen reader and AI scraper utility: visually hidden, crawler readable */',
      '.sr-only {',
      '  position: absolute !important;',
      '  width: 1px !important;',
      '  height: 1px !important;',
      '  padding: 0 !important;',
      '  margin: -1px !important;',
      '  overflow: hidden !important;',
      '  clip: rect(1px, 1px, 1px, 1px) !important;',
      '  clip-path: inset(50%) !important;',
      '  white-space: nowrap !important;',
      '  border: 0 !important;',
      '}'
    ].join('\n');

    var target = document.head || document.documentElement;
    if (target) {
      target.appendChild(style);
    }
  }

  // Scan and inject hidden semantic summary spans
  function processMathBlocks() {
    ensureSrOnlyStyle();

    var selector = '.formula-block[data-llm-summary], .step-content[data-llm-summary]';
    var elements = document.querySelectorAll(selector);

    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      var summaryText = el.getAttribute('data-llm-summary');
      if (!summaryText || !summaryText.trim()) continue;

      // Check if .sr-only span was already added to prevent duplicates
      var existingSpan = el.querySelector(':scope > span.sr-only[data-llm-injected="true"]');
      if (!existingSpan) {
        var span = document.createElement('span');
        span.className = 'sr-only';
        span.setAttribute('data-llm-injected', 'true');
        span.setAttribute('aria-hidden', 'false');
        span.textContent = summaryText.trim();
        el.appendChild(span);
      } else if (existingSpan.textContent !== summaryText.trim()) {
        existingSpan.textContent = summaryText.trim();
      }
    }
  }

  // Initialize after MathJax rendering or DOM ready
  function init() {
    if (window.MathJax && window.MathJax.startup && window.MathJax.startup.promise) {
      window.MathJax.startup.promise
        .then(function () {
          processMathBlocks();
        })
        .catch(function () {
          processMathBlocks();
        });
    } else {
      processMathBlocks();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Observe dynamic content updates (e.g. calculation step updates)
  if (typeof MutationObserver !== 'undefined') {
    var observer = new MutationObserver(function (mutations) {
      var needsProcessing = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          needsProcessing = true;
          break;
        } else if (m.type === 'attributes' && m.attributeName === 'data-llm-summary') {
          needsProcessing = true;
          break;
        }
      }
      if (needsProcessing) {
        processMathBlocks();
      }
    });

    var startObserving = function () {
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['data-llm-summary']
        });
      }
    };

    if (document.body) {
      startObserving();
    } else {
      document.addEventListener('DOMContentLoaded', startObserving);
    }
  }
})();

