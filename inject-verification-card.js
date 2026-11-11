#!/usr/bin/env node

/**
 * inject-verification-card.js
 *
 * Reads verification-config.json and injects a visible `<section class="verification-card">`
 * immediately BEFORE `<section class="related-tools-section">` on each configured HTML page
 * using cheerio (`sourceCodeLocationInfo: true`) byte-range insertion.
 *
 * Also appends the `.verification-card` CSS rule (using existing CSS variables only) to
 * `styles.css` once, idempotently.
 *
 * Safety & CLI flags:
 *   - Insertion point only before `<section class="related-tools-section">`.
 *   - Never modifies calculator scripts, formulas, or existing sections.
 *   - Idempotent (`section.verification-card` check) and supports `--dry-run`.
 *
 * Usage:
 *   node inject-verification-card.js --dry-run
 *   node inject-verification-card.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CONFIG_FILE = 'verification-config.json';
const CSS_FILE = 'styles.css';
const CSS_MARKER = '/* --- Verification Card Section --- */';

const VERIFICATION_CSS_RULE = [
  '',
  '/* --- Verification Card Section --- */',
  '.verification-card {',
  '    padding: 36px 0;',
  '    background: var(--bg-color);',
  '    border-top: 1px solid var(--border-color);',
  '    color: var(--text-color);',
  '}',
  '',
  '.verification-card-inner {',
  '    max-width: 1200px;',
  '    margin: 0 auto;',
  '    padding: 28px;',
  '    background: var(--card-bg);',
  '    border: 1px solid var(--border-color);',
  '    border-left: 4px solid var(--primary-color);',
  '    border-radius: 12px;',
  '    box-shadow: var(--card-shadow);',
  '}',
  '',
  '.verification-card-title {',
  '    margin: 0 0 16px 0;',
  '    font-size: 1.35rem;',
  '    font-family: \'Montserrat\', sans-serif;',
  '    font-weight: 700;',
  '    color: var(--heading-color);',
  '}',
  '',
  '.verification-card-row {',
  '    margin-bottom: 14px;',
  '    line-height: 1.6;',
  '}',
  '',
  '.verification-card-row strong {',
  '    color: var(--heading-color);',
  '}',
  '',
  '.verification-card-grid {',
  '    display: grid;',
  '    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));',
  '    gap: 20px;',
  '    margin: 16px 0;',
  '}',
  '',
  '.verification-card-col h3 {',
  '    margin: 0 0 8px 0;',
  '    font-size: 1rem;',
  '    color: var(--primary-color);',
  '}',
  '',
  '.verification-card-col ul {',
  '    margin: 0;',
  '    padding-left: 20px;',
  '}',
  '',
  '.verification-card-col li {',
  '    margin-bottom: 6px;',
  '    font-size: 0.92rem;',
  '}',
  '',
  '.verification-card-meta {',
  '    display: flex;',
  '    flex-wrap: wrap;',
  '    gap: 16px;',
  '    margin-top: 16px;',
  '    padding-top: 14px;',
  '    border-top: 1px solid var(--border-color);',
  '    font-size: 0.88rem;',
  '}'
].join('\n');

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the visible `<section class="verification-card">` HTML snippet.
 */
function buildVerificationCardHtml(entry, eol = '\n', baseIndent = '    ') {
  const assumptionsLis = (entry.assumptions || [])
    .map(item => `${baseIndent}                    <li>${escapeHtml(item)}</li>`)
    .join(eol);
  const limitsLis = (entry.limits || [])
    .map(item => `${baseIndent}                    <li>${escapeHtml(item)}</li>`)
    .join(eol);

  return [
    `<section class="verification-card" aria-label="Engineering Verification and Standards Basis">`,
    `${baseIndent}    <div class="verification-card-inner">`,
    `${baseIndent}        <h2 class="verification-card-title">Engineering Verification &amp; Standards Basis</h2>`,
    `${baseIndent}        <div class="verification-card-row"><strong>Standard &amp; Clause:</strong> ${escapeHtml(entry.standard_clause)}</div>`,
    `${baseIndent}        <div class="verification-card-row"><strong>Worked Verification Example:</strong> ${escapeHtml(entry.worked_example)}</div>`,
    `${baseIndent}        <div class="verification-card-grid">`,
    `${baseIndent}            <div class="verification-card-col">`,
    `${baseIndent}                <h3>Assumptions</h3>`,
    `${baseIndent}                <ul>`,
    assumptionsLis,
    `${baseIndent}                </ul>`,
    `${baseIndent}            </div>`,
    `${baseIndent}            <div class="verification-card-col">`,
    `${baseIndent}                <h3>Validity Limits</h3>`,
    `${baseIndent}                <ul>`,
    limitsLis,
    `${baseIndent}                </ul>`,
    `${baseIndent}            </div>`,
    `${baseIndent}        </div>`,
    `${baseIndent}        <div class="verification-card-meta">`,
    `${baseIndent}            <span><strong>Reviewed by:</strong> ${escapeHtml(entry.reviewer)}</span>`,
    `${baseIndent}            <span><strong>Last reviewed:</strong> ${escapeHtml(entry.last_reviewed)}</span>`,
    `${baseIndent}            <span><strong>Next review:</strong> ${escapeHtml(entry.next_review)}</span>`,
    `${baseIndent}        </div>`,
    `${baseIndent}    </div>`,
    `${baseIndent}</section>${eol}${baseIndent}`
  ].join(eol);
}

/**
 * Appends `.verification-card` styling to `styles.css` if not already present.
 */
function ensureVerificationCss(cssText) {
  if (cssText.includes(CSS_MARKER) || /\.verification-card\s*\{/.test(cssText)) {
    return { updatedCss: cssText, changed: false };
  }
  const eol = cssText.includes('\r\n') ? '\r\n' : '\n';
  const ruleText = VERIFICATION_CSS_RULE.replace(/\n/g, eol);
  const trailingEol = cssText.endsWith('\n') ? '' : eol;
  return {
    updatedCss: cssText + trailingEol + ruleText + eol,
    changed: true
  };
}

/**
 * Injects `<section class="verification-card">` immediately before `<section class="related-tools-section">`
 * in `rawHtml` if not already present.
 */
function injectCardIntoHtml(rawHtml, entry) {
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true });

  if ($('section.verification-card').length > 0) {
    return { updatedHtml: rawHtml, changed: false, status: 'already_present' };
  }

  const relatedEl = $('section.related-tools-section').first()[0];
  if (!relatedEl || !relatedEl.sourceCodeLocation || typeof relatedEl.sourceCodeLocation.startOffset !== 'number') {
    return { updatedHtml: rawHtml, changed: false, status: 'missing_related_section' };
  }

  const insertAt = relatedEl.sourceCodeLocation.startOffset;
  const eol = rawHtml.includes('\r\n') ? '\r\n' : '\n';

  // Detect indentation of <section class="related-tools-section">
  let lineStart = insertAt;
  while (lineStart > 0 && rawHtml[lineStart - 1] !== '\n') {
    lineStart--;
  }
  const linePrefix = rawHtml.slice(lineStart, insertAt);
  const baseIndent = /^[ \t]*$/.test(linePrefix) ? linePrefix : '    ';

  const cardHtml = buildVerificationCardHtml(entry, eol, baseIndent);
  const updatedHtml = rawHtml.slice(0, insertAt) + cardHtml + rawHtml.slice(insertAt);

  return { updatedHtml, changed: true, status: 'injected' };
}

function runInjectVerificationCards(rootDir, { dryRun = false, quiet = false } = {}) {
  const configPath = path.join(rootDir, CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  // 1. Update styles.css idempotently
  const cssPath = path.join(rootDir, CSS_FILE);
  let cssChanged = false;
  if (fs.existsSync(cssPath)) {
    const rawCss = fs.readFileSync(cssPath, 'utf8');
    const cssRes = ensureVerificationCss(rawCss);
    cssChanged = cssRes.changed;
    if (cssRes.changed && !dryRun) {
      fs.writeFileSync(cssPath, cssRes.updatedCss, 'utf8');
    }
  }

  // 2. Inject cards into configured HTML pages
  const results = [];
  for (const [slug, entry] of Object.entries(config)) {
    const relFile = slug.endsWith('.html') ? slug : `${slug}.html`;
    const filePath = path.join(rootDir, relFile);
    if (!fs.existsSync(filePath)) {
      results.push({ file: relFile, status: 'file_not_found' });
      continue;
    }

    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const res = injectCardIntoHtml(rawHtml, entry);
    results.push({ file: relFile, status: res.status });
    if (res.changed && !dryRun) {
      fs.writeFileSync(filePath, res.updatedHtml, 'utf8');
    }
  }

  const modifiedCount = results.filter(r => r.status === 'injected').length;
  const skippedExistingCount = results.filter(r => r.status === 'already_present').length;

  if (!quiet) {
    console.log('====================================================');
    console.log(' Verification Card Injector');
    console.log(` Mode: ${dryRun ? 'DRY-RUN (no files written)' : 'LIVE (writing changes)'}`);
    console.log('====================================================');
    console.log(`styles.css .verification-card rule : ${cssChanged ? (dryRun ? 'Would append' : 'Appended') : 'Already present'}`);
    console.log(`Configured pages                   : ${results.length}`);
    console.log(`Pages ${dryRun ? 'queued for injection' : 'injected'}         : ${modifiedCount}`);
    console.log(`Already present (skipped)          : ${skippedExistingCount}`);
    for (const r of results) {
      console.log(` - ${r.file}: ${r.status}`);
    }
  }

  return { cssChanged, modifiedCount, skippedExistingCount, results };
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  runInjectVerificationCards(process.cwd(), { dryRun });
}

module.exports = {
  VERIFICATION_CSS_RULE,
  buildVerificationCardHtml,
  ensureVerificationCss,
  injectCardIntoHtml,
  runInjectVerificationCards
};

