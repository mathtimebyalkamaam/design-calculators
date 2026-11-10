#!/usr/bin/env node

/**
 * inject-semantic-math.js
 *
 * Scans all HTML files to provide semantic mathematical descriptions for AI scrapers (LLMs)
 * and screen readers via:
 * 1. Static Injection: Directly inlines <span class="sr-only"> containing the formula summary
 *    inside any element with a data-llm-summary attribute (e.g. .formula-block, .step-content)
 *    right after the formula content. This ensures crawlers/bots without JS execution see the formula.
 * 2. Client-Side Fallback: Injects <script src="/js/llm-math-reader.js" defer></script> right before
 *    the closing </body> tag to handle interactive recalculations and accessibility in the browser.
 *
 * Requirements:
 * - Uses cheerio with sourceCodeLocationInfo to parse and inspect elements safely.
 * - Idempotent: Checks if <span class="sr-only"> or the script tag is already present to prevent duplicates.
 * - Safety: Preserves all existing HTML, scripts, CSS, and MathJax formulas byte-for-byte.
 * - Supports --dry-run flag.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const isDryRun = process.argv.includes('--dry-run');
const SCRIPT_TAG = '<script src="/js/llm-math-reader.js" defer></script>';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Check if the document already has the llm-math-reader script tag
 */
function hasLlmMathReaderScript($, rawHtml) {
  const hasInDom = $('script[src*="llm-math-reader.js"]').length > 0;
  if (hasInDom) return true;
  return rawHtml.includes('/js/llm-math-reader.js');
}

/**
 * Perform static injection of <span class="sr-only"> into elements with data-llm-summary
 * Returns { updatedHtml, injectedCount, alreadyPresentCount, previews }
 */
function applyStaticInjection(rawHtml) {
  // Load with sourceCodeLocationInfo enabled to accurately target only the formula blocks
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true });
  const elements = $('[data-llm-summary]');

  const injections = [];
  const previews = [];
  let alreadyPresentCount = 0;

  elements.each((_, el) => {
    const $el = $(el);
    const summary = $el.attr('data-llm-summary');
    if (!summary || !summary.trim()) return;

    // Check if a <span class="sr-only"> already exists inside this element
    const hasSrOnly = $el.find('span.sr-only').length > 0;
    if (hasSrOnly) {
      alreadyPresentCount++;
      return;
    }

    const loc = el.sourceCodeLocation;
    const spanText = summary.trim();
    const spanTag = `<span class="sr-only">${escapeHtml(spanText)}</span>`;

    if (loc && loc.endTag) {
      // Insert right before closing tag </tag>
      injections.push({
        offset: loc.endTag.startOffset,
        html: `  ${spanTag}\n`
      });
      previews.push({
        tagName: el.tagName,
        summary: spanText,
        spanTag: spanTag
      });
    } else {
      // Fallback: If no location info for end tag, locate the element's closing tag in rawHtml
      const elHtml = $.html(el);
      const closeTagStr = `</${el.tagName}>`;
      const lastIndex = elHtml.lastIndexOf(closeTagStr);
      if (lastIndex !== -1) {
        const replacement = elHtml.slice(0, lastIndex) + `  ${spanTag}\n` + closeTagStr;
        const pos = rawHtml.indexOf(elHtml);
        if (pos !== -1) {
          injections.push({
            offset: pos,
            length: elHtml.length,
            html: replacement
          });
          previews.push({
            tagName: el.tagName,
            summary: spanText,
            spanTag: spanTag
          });
        }
      }
    }
  });

  // Sort descending by offset so insertions do not shift previous offsets
  injections.sort((a, b) => b.offset - a.offset);

  let updatedHtml = rawHtml;
  for (const inj of injections) {
    if (inj.length !== undefined) {
      updatedHtml = updatedHtml.slice(0, inj.offset) + inj.html + updatedHtml.slice(inj.offset + inj.length);
    } else {
      updatedHtml = updatedHtml.slice(0, inj.offset) + inj.html + updatedHtml.slice(inj.offset);
    }
  }

  return {
    updatedHtml,
    injectedCount: injections.length,
    alreadyPresentCount,
    previews
  };
}

/**
 * Safely injects the script tag immediately before the closing </body> tag.
 */
function injectBeforeBodyClose(rawHtml, scriptTag) {
  const bodyCloseRegex = /<\/body>/i;
  const match = rawHtml.match(bodyCloseRegex);
  if (!match) {
    throw new Error('No </body> tag found in HTML');
  }
  const index = match.index;
  return rawHtml.slice(0, index) + `    ${scriptTag}\n` + rawHtml.slice(index);
}

function run() {
  const rootDir = process.cwd();
  console.log('====================================================');
  console.log(' Semantic Math Scraper Enhancer (Static + Client)');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Simulating changes)' : 'LIVE (Applying changes)'}`);
  console.log(` Working Directory: ${rootDir}`);
  console.log('====================================================\n');

  const files = fs.readdirSync(rootDir)
    .filter(file => file.endsWith('.html') && fs.statSync(path.join(rootDir, file)).isFile())
    .sort();

  const summary = {
    totalScanned: files.length,
    filesWithStaticInjections: 0,
    staticSpansInjected: 0,
    staticSpansAlreadyPresent: 0,
    scriptsInjected: 0,
    scriptsAlreadyPresent: 0,
    errors: 0
  };

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    try {
      let rawHtml = fs.readFileSync(filePath, 'utf8');

      // 1. Static Injection for data-llm-summary
      const staticResult = applyStaticInjection(rawHtml);
      rawHtml = staticResult.updatedHtml;

      summary.staticSpansInjected += staticResult.injectedCount;
      summary.staticSpansAlreadyPresent += staticResult.alreadyPresentCount;
      if (staticResult.injectedCount > 0) {
        summary.filesWithStaticInjections++;
      }

      // 2. Client-Side Script Injection
      const $ = cheerio.load(rawHtml);
      const scriptNeeded = !hasLlmMathReaderScript($, rawHtml);

      if (scriptNeeded) {
        if (!isDryRun) {
          rawHtml = injectBeforeBodyClose(rawHtml, SCRIPT_TAG);
        }
        summary.scriptsInjected++;
      } else {
        summary.scriptsAlreadyPresent++;
      }

      // Reporting
      const hasActions = staticResult.injectedCount > 0 || scriptNeeded;
      if (hasActions) {
        const actionLabels = [];
        if (staticResult.injectedCount > 0) {
          actionLabels.push(`Static: ${staticResult.injectedCount} formula spans`);
        }
        if (scriptNeeded) {
          actionLabels.push('Client: llm-math-reader.js');
        }
        console.log(`[ACTION] ${file} -> ${actionLabels.join(', ')}`);

        if (isDryRun) {
          if (staticResult.previews.length > 0) {
            console.log(`--- [Static Preview: ${file}] ---`);
            staticResult.previews.forEach((p, idx) => {
              console.log(`  Formula [${idx + 1}] (${p.tagName}): Appended ${p.spanTag}`);
            });
          }
          if (scriptNeeded) {
            console.log(`--- [Script Preview: ${file}] ---`);
            console.log(`    ${SCRIPT_TAG}\n    </body>`);
          }
          console.log(`-----------------------------------\n`);
        }
      } else {
        // Nothing changed
        // Optionally omit verbose skip or report if spans were already present
        if (staticResult.alreadyPresentCount > 0) {
          console.log(`[UP-TO-DATE] ${file}: ${staticResult.alreadyPresentCount} static spans and script already present.`);
        }
      }

      // Save changes if not a dry run and file was modified
      if (!isDryRun && (staticResult.injectedCount > 0 || scriptNeeded)) {
        fs.writeFileSync(filePath, rawHtml, 'utf8');
      }

    } catch (err) {
      console.error(`[ERROR] Processing ${file}:`, err.message);
      summary.errors++;
    }
  }

  console.log('\n====================================================');
  console.log(' Execution Summary');
  console.log('====================================================');
  console.log(`Total HTML files scanned:              ${summary.totalScanned}`);
  console.log(`Files with static formula injections:  ${summary.filesWithStaticInjections}`);
  console.log(`Total static .sr-only spans injected:  ${summary.staticSpansInjected}`);
  console.log(`Static spans already present (skipped):${summary.staticSpansAlreadyPresent}`);
  console.log(`Client-side <script> tags injected:    ${summary.scriptsInjected}`);
  console.log(`Client-side <script> already present:  ${summary.scriptsAlreadyPresent}`);
  console.log(`Errors:                                ${summary.errors}`);
  if (isDryRun) {
    console.log('\n[DRY-RUN] No files were modified. To apply changes, run:');
    console.log('node inject-semantic-math.js');
  } else {
    console.log('\n[COMPLETED] Static and client-side injections complete.');
  }
  console.log('====================================================\n');
}

run();
