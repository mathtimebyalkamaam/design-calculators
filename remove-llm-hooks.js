#!/usr/bin/env node

/**
 * remove-llm-hooks.js
 *
 * Removes legacy LLM scraper hooks cleanly and idempotently using cheerio:
 *   1. Removes every `data-llm-summary` attribute from any element (keeping the element itself).
 *   2. Removes every `<span class="sr-only" data-llm-injected="true">` element entirely.
 *   3. Removes every `<script src="/js/llm-math-reader.js" defer></script>` tag
 *      (matches `<script>` tags with `src="/js/llm-math-reader.js"` and `defer` attribute).
 *   4. Deletes `js/llm-math-reader.js` from the repository.
 *   5. Checks if any element in the codebase still uses class `sr-only`:
 *      - If NONE remain, removes `.sr-only { ... }` from `styles.css`.
 *      - If any remain, keeps `.sr-only` in `styles.css` (if present) and reports them.
 *
 * Safety rules:
 *   - Uses cheerio with `sourceCodeLocationInfo: true` and applies byte-range splices so
 *     MathJax formulas, JSON-LD schemas, calculation scripts, and all other spans/attributes
 *     remain completely untouched.
 *   - Idempotent and supports `--dry-run`.
 *
 * Usage:
 *   node remove-llm-hooks.js --dry-run
 *   node remove-llm-hooks.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

function walkFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
  return out;
}

/**
 * Computes surgical byte edits in rawHtml without re-serializing unrelated markup.
 */
function planHtmlEdits(rawHtml) {
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true });
  const edits = [];
  const counts = {
    dataLlmSummaryRemoved: 0,
    injectedSpanRemoved: 0,
    scriptTagRemoved: 0
  };

  // 1. Remove <span class="sr-only" data-llm-injected="true"> elements entirely
  const removedElementRanges = [];
  $('span.sr-only[data-llm-injected="true"]').each((_, el) => {
    const loc = el.sourceCodeLocation;
    if (!loc || typeof loc.startOffset !== 'number' || typeof loc.endOffset !== 'number') return;
    const start = loc.startOffset;
    let end = loc.endOffset;
    if (rawHtml.slice(end, end + 2) === '\r\n') end += 2;
    else if (rawHtml[end] === '\n') end += 1;

    edits.push({ start, end, replacement: '' });
    removedElementRanges.push({ start, end });
    counts.injectedSpanRemoved++;
  });

  // 2. Remove every data-llm-summary attribute (keep element intact)
  $('[data-llm-summary]').each((_, el) => {
    const loc = el.sourceCodeLocation;
    const attrLoc = loc && loc.attrs && loc.attrs['data-llm-summary'];
    if (!attrLoc || typeof attrLoc.startOffset !== 'number' || typeof attrLoc.endOffset !== 'number') return;

    // Skip if inside an element already queued for full removal
    const insideRemoved = removedElementRanges.some(
      r => attrLoc.startOffset >= r.start && attrLoc.endOffset <= r.end
    );
    if (insideRemoved) return;

    let start = attrLoc.startOffset;
    if (start > 0 && (rawHtml[start - 1] === ' ' || rawHtml[start - 1] === '\t')) {
      start--;
    }
    edits.push({ start, end: attrLoc.endOffset, replacement: '' });
    counts.dataLlmSummaryRemoved++;
  });

  // 3. Remove <script src="/js/llm-math-reader.js" defer></script> tags
  $('script[src="/js/llm-math-reader.js"]').each((_, el) => {
    const $el = $(el);
    if ($el.attr('defer') === undefined) return;
    const loc = el.sourceCodeLocation;
    if (!loc || typeof loc.startOffset !== 'number' || typeof loc.endOffset !== 'number') return;

    let start = loc.startOffset;
    let end = loc.endOffset;

    // If alone on its line, remove horizontal leading indentation and trailing newline
    let lineStart = start;
    while (lineStart > 0 && (rawHtml[lineStart - 1] === ' ' || rawHtml[lineStart - 1] === '\t')) {
      lineStart--;
    }
    const atLineStart = lineStart === 0 || rawHtml[lineStart - 1] === '\n';
    if (atLineStart) {
      start = lineStart;
      while (end < rawHtml.length && (rawHtml[end] === ' ' || rawHtml[end] === '\t')) end++;
      if (rawHtml.slice(end, end + 2) === '\r\n') end += 2;
      else if (rawHtml[end] === '\n') end += 1;
    }

    edits.push({ start, end, replacement: '' });
    counts.scriptTagRemoved++;
  });

  if (edits.length === 0) {
    return { updatedHtml: rawHtml, counts };
  }

  let updatedHtml = rawHtml;
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  for (const e of sorted) {
    updatedHtml = updatedHtml.slice(0, e.start) + e.replacement + updatedHtml.slice(e.end);
  }

  return { updatedHtml, counts };
}

/**
 * Counts remaining elements using class `sr-only` in the given HTML text.
 */
function countRemainingSrOnlyInHtml(htmlText) {
  const $ = cheerio.load(htmlText);
  return $('.sr-only').length;
}

/**
 * Removes standalone `.sr-only { ... }` CSS rule(s) from styles.css if present.
 */
function removeSrOnlyCssRule(cssText) {
  const ruleRe = /\s*(?:\/\*[^\n]*sr-only[^\n]*\*\/\s*)?\.sr-only\s*\{[^}]*\}\s*/gi;
  let removed = 0;
  const updated = cssText.replace(ruleRe, () => {
    removed++;
    return '\n';
  });
  return { updated, removed };
}

function run(rootDir, isDryRun) {
  const allFiles = walkFiles(rootDir).sort();
  const htmlFiles = allFiles.filter(f => f.endsWith('.html'));

  const totals = {
    htmlFilesScanned: htmlFiles.length,
    htmlFilesModified: 0,
    dataLlmSummaryRemoved: 0,
    injectedSpanRemoved: 0,
    scriptTagRemoved: 0,
    readerFileDeleted: 0,
    remainingSrOnlyCount: 0,
    srOnlyFilesRemaining: [],
    stylesCssRuleRemoved: 0
  };

  console.log('====================================================');
  console.log(' Remove LLM Hooks');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (no files modified)' : 'LIVE (modifying files)'}`);
  console.log(` Root: ${rootDir}`);
  console.log('====================================================\n');

  const finalHtmlByFile = new Map();

  for (const filePath of htmlFiles) {
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const { updatedHtml, counts } = planHtmlEdits(rawHtml);

    const changed =
      counts.dataLlmSummaryRemoved > 0 ||
      counts.injectedSpanRemoved > 0 ||
      counts.scriptTagRemoved > 0;

    if (changed) {
      totals.htmlFilesModified++;
      totals.dataLlmSummaryRemoved += counts.dataLlmSummaryRemoved;
      totals.injectedSpanRemoved += counts.injectedSpanRemoved;
      totals.scriptTagRemoved += counts.scriptTagRemoved;

      const rel = path.relative(rootDir, filePath);
      console.log(
        `[${isDryRun ? 'DRY-RUN' : 'CLEANED'}] ${rel}: ` +
        `data-llm-summary=-${counts.dataLlmSummaryRemoved}, ` +
        `injected-span=-${counts.injectedSpanRemoved}, ` +
        `script=-${counts.scriptTagRemoved}`
      );

      if (!isDryRun) {
        fs.writeFileSync(filePath, updatedHtml, 'utf8');
      }
    }

    finalHtmlByFile.set(filePath, updatedHtml);
  }

  // Delete js/llm-math-reader.js
  const readerPath = path.join(rootDir, 'js', 'llm-math-reader.js');
  if (fs.existsSync(readerPath)) {
    totals.readerFileDeleted = 1;
    console.log(`\n[${isDryRun ? 'DRY-RUN' : 'DELETE'}] js/llm-math-reader.js`);
    if (!isDryRun) {
      fs.unlinkSync(readerPath);
    }
  } else {
    console.log('\n[SKIP] js/llm-math-reader.js already absent.');
  }

  // Check if any element in the entire codebase still uses class `sr-only` after removal
  for (const [filePath, htmlText] of finalHtmlByFile.entries()) {
    const count = countRemainingSrOnlyInHtml(htmlText);
    if (count > 0) {
      totals.remainingSrOnlyCount += count;
      totals.srOnlyFilesRemaining.push({ file: path.relative(rootDir, filePath), count });
    }
  }

  const stylesPath = path.join(rootDir, 'styles.css');
  const stylesExists = fs.existsSync(stylesPath);
  const stylesText = stylesExists ? fs.readFileSync(stylesPath, 'utf8') : '';
  const hasSrOnlyCssRule = /\.sr-only\s*\{/.test(stylesText);

  if (totals.remainingSrOnlyCount === 0) {
    if (hasSrOnlyCssRule) {
      const { updated, removed } = removeSrOnlyCssRule(stylesText);
      totals.stylesCssRuleRemoved = removed;
      console.log(`\n[${isDryRun ? 'DRY-RUN' : 'CLEANED'}] styles.css: Removed ${removed} .sr-only CSS rule(s).`);
      if (!isDryRun && removed > 0) {
        fs.writeFileSync(stylesPath, updated, 'utf8');
      }
    } else {
      console.log('\n[INFO] No .sr-only elements remain; styles.css has no .sr-only CSS rule.');
    }
  } else {
    console.log(
      `\n[KEEP] ${totals.remainingSrOnlyCount} element(s) with class="sr-only" still remain across ` +
      `${totals.srOnlyFilesRemaining.length} HTML file(s)` +
      (hasSrOnlyCssRule ? ' — keeping .sr-only rule in styles.css.' : ' (note: styles.css currently has no .sr-only rule).')
    );
  }

  console.log('\n--- Summary ---');
  console.log(`HTML files scanned:                                      ${totals.htmlFilesScanned}`);
  console.log(`HTML files modified:                                     ${totals.htmlFilesModified}`);
  console.log(`data-llm-summary attributes removed:                     ${totals.dataLlmSummaryRemoved}`);
  console.log(`<span class='sr-only' data-llm-injected='true'> removed: ${totals.injectedSpanRemoved}`);
  console.log(`<script src='/js/llm-math-reader.js' defer> removed:     ${totals.scriptTagRemoved}`);
  console.log(`js/llm-math-reader.js deleted:                           ${totals.readerFileDeleted}`);
  console.log(`Remaining elements with class='sr-only':                 ${totals.remainingSrOnlyCount} (in ${totals.srOnlyFilesRemaining.length} files)`);
  console.log(`.sr-only CSS rules removed from styles.css:              ${totals.stylesCssRuleRemoved}`);

  return totals;
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  run(process.cwd(), isDryRun);
}

module.exports = { planHtmlEdits, countRemainingSrOnlyInHtml, removeSrOnlyCssRule, run };

