#!/usr/bin/env node

/**
 * erase-ghost-sections.js
 *
 * Scans all .html files in the repository root directory using cheerio and removes
 * legacy/ghost related-tools <section> elements that match EITHER:
 *   a) Has an inline style attribute containing `padding: 40px 0` AND contains an <a> tag with class `silo-card`
 *   b) Contains the exact HTML comment `<!-- Related Tools Section (Auto-generated) -->`
 *
 * Safety rules:
 *   - Never touches `<section class="related-tools-section">`
 *   - Never touches any `<script>` tags containing calculation logic (splices only exact matched <section> byte ranges)
 *
 * Usage:
 *   node erase-ghost-sections.js --dry-run
 *   node erase-ghost-sections.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const EXACT_COMMENT = '<!-- Related Tools Section (Auto-generated) -->';
const PADDING_STYLE_RE = /padding\s*:\s*40px\s+0(?:\s|;|$)/i;

/**
 * Recursively checks whether a Cheerio/domhandler node contains the exact HTML comment.
 * @param {object} node
 * @returns {boolean}
 */
function hasExactAutoComment(node) {
  if (!node) return false;
  if (node.type === 'comment' && `<!--${node.data}-->` === EXACT_COMMENT) {
    return true;
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      if (hasExactAutoComment(child)) return true;
    }
  }
  return false;
}

/**
 * Finds matching ghost <section> ranges in raw HTML using cheerio AST + byte indices.
 * @param {string} rawHtml
 * @returns {{ matches: Array<{start: number, end: number, reasons: string[], preview: string}>, skippedProtected: number }}
 */
function findGhostSections(rawHtml) {
  const $ = cheerio.load(rawHtml, {
    xml: { xmlMode: false, withStartIndices: true, withEndIndices: true }
  });

  const rawMatches = [];
  let skippedProtected = 0;

  $('section').each((_, el) => {
    const $el = $(el);

    // Safety Rule 1: Never touch <section class="related-tools-section">
    if ($el.hasClass('related-tools-section')) {
      return;
    }

    const styleAttr = $el.attr('style') || '';
    const condA = PADDING_STYLE_RE.test(styleAttr) && $el.find('a.silo-card').length > 0;
    const condB = hasExactAutoComment(el);

    if (!condA && !condB) return;

    // Safety Rule 2: Never touch anything wrapping .related-tools-section or <script> calculation tags
    if ($el.find('section.related-tools-section, .related-tools-section').length > 0 || $el.find('script').length > 0) {
      skippedProtected++;
      return;
    }

    if (typeof el.startIndex !== 'number' || typeof el.endIndex !== 'number') {
      return;
    }

    const reasons = [];
    if (condA) reasons.push('inline style `padding: 40px 0` + `a.silo-card`');
    if (condB) reasons.push('contains exact comment <!-- Related Tools Section (Auto-generated) -->');

    let start = el.startIndex;
    let end = el.endIndex + 1;

    // Consume trailing spaces/newline cleanly
    while (end < rawHtml.length && (rawHtml[end] === ' ' || rawHtml[end] === '\t')) {
      end++;
    }
    if (rawHtml.slice(end, end + 2) === '\r\n') {
      end += 2;
    } else if (rawHtml[end] === '\n') {
      end += 1;
    }

    const heading = $el.find('h1, h2, h3, h4').first().text().trim().replace(/\s+/g, ' ');
    const snippet = rawHtml.slice(el.startIndex, Math.min(rawHtml.length, el.startIndex + 100)).replace(/\s+/g, ' ').trim();

    rawMatches.push({
      start,
      end,
      reasons,
      preview: heading ? `${heading} (${snippet}...)` : `${snippet}...`
    });
  });

  // Sort ascending and drop any nested sub-sections already covered by an ancestor match
  rawMatches.sort((a, b) => a.start - b.start);
  const matches = [];
  for (const m of rawMatches) {
    const last = matches[matches.length - 1];
    if (last && m.start >= last.start && m.end <= last.end) {
      continue;
    }
    matches.push(m);
  }

  return { matches, skippedProtected };
}

/**
 * Removes matched ranges from rawHtml without re-serializing <script> or unrelated DOM nodes.
 * @param {string} rawHtml
 * @param {Array<{start: number, end: number}>} matches
 * @returns {string}
 */
function removeMatchedRanges(rawHtml, matches) {
  let result = rawHtml;
  const descending = [...matches].sort((a, b) => b.start - a.start);
  for (const m of descending) {
    result = result.slice(0, m.start) + result.slice(m.end);
  }
  return result;
}

function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const rootDir = process.cwd();

  const htmlFiles = fs.readdirSync(rootDir)
    .filter(f => f.endsWith('.html') && fs.statSync(path.join(rootDir, f)).isFile())
    .sort();

  console.log('====================================================');
  console.log(' Ghost Related-Tools Section Cleaner');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (no files modified)' : 'LIVE (modifying matched files)'}`);
  console.log(` Directory: ${rootDir}`);
  console.log('====================================================\n');

  let filesModified = 0;
  let totalRemoved = 0;
  let totalSkippedProtected = 0;

  for (const file of htmlFiles) {
    const filePath = path.join(rootDir, file);
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const { matches, skippedProtected } = findGhostSections(rawHtml);

    totalSkippedProtected += skippedProtected;

    if (matches.length === 0) continue;

    filesModified++;
    totalRemoved += matches.length;

    console.log(`[${isDryRun ? 'DRY-RUN' : 'REMOVE'}] ${file} (${matches.length} section(s)):`);
    for (const m of matches) {
      console.log(`  - Reason: ${m.reasons.join(' AND ')}`);
      console.log(`    Preview: ${m.preview}`);
    }

    if (!isDryRun) {
      const updatedHtml = removeMatchedRanges(rawHtml, matches);
      fs.writeFileSync(filePath, updatedHtml, 'utf8');
    }
  }

  console.log('\n--- Summary ---');
  console.log(`HTML files scanned: ${htmlFiles.length}`);
  console.log(`Files with matches: ${filesModified}`);
  console.log(`Ghost <section> blocks ${isDryRun ? 'to remove' : 'removed'}: ${totalRemoved}`);
  if (totalSkippedProtected > 0) {
    console.log(`Protected blocks skipped (safety rule): ${totalSkippedProtected}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = { findGhostSections, removeMatchedRanges, hasExactAutoComment };

