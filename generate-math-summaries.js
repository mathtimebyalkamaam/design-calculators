#!/usr/bin/env node

/**
 * generate-math-summaries.js
 *
 * Populates data-llm-summary attributes on .formula-block and .step-content elements
 * to provide semantic context for LLMs, AI search scrapers, and screen readers.
 *
 * Requirements:
 * 1. Uses cheerio to scan all .html files in the root directory.
 * 2. Finds all .formula-block or .step-content elements lacking data-llm-summary.
 * 3. Heuristic Logic: Locates the nearest preceding <h3> or <h4> heading above the formula block.
 * 4. Generation: Sets data-llm-summary to:
 *    'This formula is used for [Heading Text]. It calculates the key engineering parameter based on the inputs provided above.'
 * 5. Safety: Only adds the attribute directly to the opening tag. Does not alter any other content.
 * 6. Supports --dry-run flag.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const isDryRun = process.argv.includes('--dry-run');

/**
 * Normalize whitespace in extracted text
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Escape quotes and special characters for HTML attribute insertion
 */
function escapeAttr(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Finds the nearest preceding <h3> or <h4> heading above a target element
 */
function findNearestPrecedingHeading($, el) {
  const $el = $(el);
  const loc = el.sourceCodeLocation;
  const targetOffset = loc && loc.startTag ? loc.startTag.startOffset : (loc ? loc.startOffset : -1);

  let headingText = '';

  // Strategy 1: Check preceding siblings in immediate container and parent containers
  let curr = $el;
  while (curr.length && !headingText && curr[0].name !== 'body' && curr[0].name !== 'html') {
    // 1a. Direct preceding sibling that is h3/h4
    const prevH = curr.prevAll('h3, h4');
    if (prevH.length) {
      headingText = cleanText(prevH.first().text());
      break;
    }

    // 1b. Heading inside a preceding sibling container
    const prevSiblings = curr.prevAll();
    prevSiblings.each((_, sib) => {
      const found = $(sib).find('h3, h4');
      if (found.length) {
        headingText = cleanText(found.last().text());
        return false; // break loop
      }
    });

    if (headingText) break;
    curr = curr.parent();
  }

  // Strategy 2: Using source offsets across the document
  if (!headingText && targetOffset > 0) {
    let closestOffset = -1;
    $('h3, h4').each((_, h) => {
      if (h.sourceCodeLocation && h.sourceCodeLocation.startOffset < targetOffset) {
        if (h.sourceCodeLocation.startOffset > closestOffset) {
          closestOffset = h.sourceCodeLocation.startOffset;
          headingText = cleanText($(h).text());
        }
      }
    });
  }

  // Strategy 3: Fallback to h2, h1, or title
  if (!headingText) {
    const fallbackH = $('h2, h1').first();
    if (fallbackH.length) {
      headingText = cleanText(fallbackH.text());
    } else {
      const titleText = cleanText($('title').text());
      headingText = titleText.split('|')[0].trim() || 'engineering calculations';
    }
  }

  return headingText;
}

/**
 * Process a single HTML file to inject data-llm-summary attributes
 */
function processHtmlFile(filePath) {
  const rawHtml = fs.readFileSync(filePath, 'utf8');

  // Fast check: Skip if file contains neither target class
  if (!rawHtml.includes('formula-block') && !rawHtml.includes('step-content')) {
    return { modified: false, addedCount: 0, skippedCount: 0, previews: [] };
  }

  // Load with sourceCodeLocationInfo to pinpoint exact opening tags
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true });

  const targetSelector = '.formula-block:not([data-llm-summary]), .step-content:not([data-llm-summary])';
  const elements = $(targetSelector);

  const existingWithSummary = $('.formula-block[data-llm-summary], .step-content[data-llm-summary]').length;

  if (elements.length === 0) {
    return {
      modified: false,
      addedCount: 0,
      skippedCount: existingWithSummary,
      previews: []
    };
  }

  const modifications = [];
  const previews = [];

  elements.each((index, el) => {
    const loc = el.sourceCodeLocation;
    if (!loc || !loc.startTag) return;

    const startOffset = loc.startTag.startOffset;
    const endOffset = loc.startTag.endOffset;
    const tagSlice = rawHtml.slice(startOffset, endOffset);
    const gtIndex = tagSlice.lastIndexOf('>');
    if (gtIndex === -1) return;

    const headingText = findNearestPrecedingHeading($, el);
    const summaryText = `This formula is used for ${headingText}. It calculates the key engineering parameter based on the inputs provided above.`;
    const escapedSummary = escapeAttr(summaryText);

    // Insert data-llm-summary right before the closing '>' of the start tag
    const replacement = tagSlice.slice(0, gtIndex) + ` data-llm-summary="${escapedSummary}"` + tagSlice.slice(gtIndex);

    modifications.push({
      startOffset,
      endOffset,
      replacement
    });

    previews.push({
      line: loc.startTag.startLine,
      tag: el.tagName,
      className: $(el).attr('class') || '',
      heading: headingText,
      summary: summaryText
    });
  });

  if (modifications.length === 0) {
    return {
      modified: false,
      addedCount: 0,
      skippedCount: existingWithSummary,
      previews: []
    };
  }

  // Sort descending by offset so earlier insertions don't invalidate subsequent offsets
  modifications.sort((a, b) => b.startOffset - a.startOffset);

  let updatedHtml = rawHtml;
  for (const mod of modifications) {
    updatedHtml = updatedHtml.slice(0, mod.startOffset) + mod.replacement + updatedHtml.slice(mod.endOffset);
  }

  return {
    modified: true,
    addedCount: modifications.length,
    skippedCount: existingWithSummary,
    updatedHtml,
    previews
  };
}

function run() {
  const rootDir = process.cwd();
  console.log('====================================================');
  console.log(' Formula data-llm-summary Generator');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Simulating changes)' : 'LIVE (Applying changes)'}`);
  console.log(` Working Directory: ${rootDir}`);
  console.log('====================================================\n');

  const files = fs.readdirSync(rootDir)
    .filter(file => file.endsWith('.html') && fs.statSync(path.join(rootDir, file)).isFile())
    .sort();

  const summary = {
    totalScanned: files.length,
    filesModified: 0,
    attributesAdded: 0,
    alreadyHadSummary: 0,
    errors: 0
  };

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    try {
      const result = processHtmlFile(filePath);

      summary.alreadyHadSummary += result.skippedCount;

      if (result.modified && result.addedCount > 0) {
        summary.filesModified++;
        summary.attributesAdded += result.addedCount;

        console.log(`[GENERATE] ${file} -> Added ${result.addedCount} data-llm-summary attribute(s)`);

        if (isDryRun) {
          console.log(`--- [Preview for ${file}] ---`);
          result.previews.forEach((p, idx) => {
            console.log(`  [${idx + 1}] Line ${p.line} <${p.tag} class="${p.className}">`);
            console.log(`      Heading: "${p.heading}"`);
            console.log(`      Summary: "${p.summary}"`);
          });
          console.log(`------------------------------------\n`);
        } else {
          fs.writeFileSync(filePath, result.updatedHtml, 'utf8');
        }
      }
    } catch (err) {
      console.error(`[ERROR] Processing ${file}:`, err.message);
      summary.errors++;
    }
  }

  console.log('\n====================================================');
  console.log(' Execution Summary');
  console.log('====================================================');
  console.log(`Total HTML files scanned:           ${summary.totalScanned}`);
  console.log(`Files modified / with additions:    ${summary.filesModified}`);
  console.log(`Total data-llm-summary added:       ${summary.attributesAdded}`);
  console.log(`Formula blocks already had summary: ${summary.alreadyHadSummary}`);
  console.log(`Errors:                             ${summary.errors}`);
  if (isDryRun) {
    console.log('\n[DRY-RUN] No files were modified. To execute changes, run:');
    console.log('node generate-math-summaries.js');
  } else {
    console.log('\n[COMPLETED] Successfully populated data-llm-summary attributes.');
  }
  console.log('====================================================\n');
}

run();

