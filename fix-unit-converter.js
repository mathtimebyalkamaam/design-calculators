#!/usr/bin/env node

/**
 * fix-unit-converter.js
 *
 * Surgically fixes 3 specific bugs in unit-converter-mechanical.html using cheerio:
 *   Bug 1 (Duplicate AdSense): Removes duplicate <script> tags with src containing adsbygoogle.js,
 *     keeping only the first one.
 *   Bug 2 (MathJax Config): Updates the <script> block containing `MathJax = {` so inlineMath
 *     and displayMath use the safe standard configuration:
 *       inlineMath: [['\\(', '\\)'], ['$', '$']],
 *       displayMath: [['\\[', '\\]'], ['$$', '$$']]
 *   Bug 3 (Missing Related Tools): If <section class="related-tools-section"> does not exist,
 *     reads related-tools-map.json for unit-converter-mechanical.html and injects the standard
 *     related tools block (matching steamflow.html's template) immediately before <footer>.
 *
 * Safety rules:
 *   - Targets ONLY unit-converter-mechanical.html.
 *   - Uses byte-range edits guided by cheerio so calculator logic, CSS variables, and form
 *     elements remain completely untouched.
 *   - Supports --dry-run to preview changes without modifying the file.
 *
 * Usage:
 *   node fix-unit-converter.js --dry-run
 *   node fix-unit-converter.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const TARGET_FILE = 'unit-converter-mechanical.html';
const MAP_FILE = 'related-tools-map.json';

function cleanText(text) {
  return text ? text.replace(/\s+/g, ' ').trim() : '';
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cleanToolTitle(rawTitle, fallbackSlug) {
  if (!rawTitle) return fallbackSlug || 'Engineering Tool';
  let clean = rawTitle
    .replace(/\s*\|\s*Design\s*Calculators.*$/i, '')
    .replace(/\s*\|\s*Engineering\s*Calculators.*$/i, '')
    .replace(/\s*-\s*Free\s*Online.*$/i, '')
    .replace(/\s*\|\s*Calculators.*$/i, '')
    .replace(/\s*-\s*Design\s*Calculators.*$/i, '')
    .trim();

  const openCount = (clean.match(/\(/g) || []).length;
  const closeCount = (clean.match(/\)/g) || []).length;
  if (openCount > closeCount) clean += ')';
  return clean || fallbackSlug;
}

function loadIconMap(rootDir) {
  const iconMap = {};

  const toolsDataPath = path.join(rootDir, 'tools_data.js');
  if (fs.existsSync(toolsDataPath)) {
    try {
      const content = fs.readFileSync(toolsDataPath, 'utf8');
      const tempEnv = {};
      eval(content.replace('const allTools', 'tempEnv.allTools'));
      if (Array.isArray(tempEnv.allTools)) {
        for (const t of tempEnv.allTools) {
          if (t.href && t.icon) {
            const slug = t.href.replace(/^\//, '').replace(/\.html$/, '');
            iconMap[slug] = t.icon;
          }
        }
      }
    } catch (_) {
      // Ignore parse errors
    }
  }

  const toolsDbPath = path.join(rootDir, 'tools_db.js');
  if (fs.existsSync(toolsDbPath)) {
    try {
      const content = fs.readFileSync(toolsDbPath, 'utf8');
      const tempWindow = {};
      new Function('window', content)(tempWindow);
      if (Array.isArray(tempWindow.TOOLS_DB)) {
        for (const t of tempWindow.TOOLS_DB) {
          if (t.href && t.icon) {
            const slug = t.href.replace(/^\//, '').replace(/\.html$/, '');
            if (!iconMap[slug]) iconMap[slug] = t.icon;
          }
        }
      }
    } catch (_) {
      // Ignore parse errors
    }
  }

  return iconMap;
}

function getToolMetadata(rootDir, filename, iconMap) {
  const slug = filename.replace(/\.html$/, '');
  const filePath = path.join(rootDir, filename);

  if (!fs.existsSync(filePath)) {
    return {
      slug,
      title: slug,
      desc: 'Professional engineering calculator for design, analysis, and verification.',
      icon: iconMap[slug] || 'fas fa-calculator'
    };
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(raw);
  const title = cleanToolTitle(cleanText($('title').text()), slug);
  let desc =
    cleanText($('meta[name="description"]').attr('content')) ||
    cleanText($('meta[property="og:description"]').attr('content')) ||
    `Interactive engineering calculator for ${title}.`;
  if (desc.length > 150) desc = desc.slice(0, 147) + '...';

  return {
    slug,
    title,
    desc,
    icon: iconMap[slug] || 'fas fa-calculator'
  };
}

/**
 * Builds the <section class="related-tools-section"> markup using the same template as steamflow.html.
 */
function buildRelatedToolsSection(rootDir, relatedFiles, eol) {
  const iconMap = loadIconMap(rootDir);
  const cards = relatedFiles.map(filename => {
    const meta = getToolMetadata(rootDir, filename, iconMap);
    return [
      `                <a href="/${escapeHtml(meta.slug)}" class="related-card">`,
      `                    <h3><i class="${escapeHtml(meta.icon)}"></i> ${escapeHtml(meta.title)}</h3>`,
      `                    <p>${escapeHtml(meta.desc)}</p>`,
      `                    <div class="action-link">Open Calculator <i class="fas fa-arrow-right"></i></div>`,
      `                </a>`
    ].join(eol);
  }).join(eol);

  return [
    `<section class="related-tools-section">`,
    `        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">`,
    `            <h2 class="related-tools-title">Related Engineering Tools</h2>`,
    `            <p class="related-tools-subtitle">Explore complementary engineering calculators to streamline your design verification and calculations.</p>`,
    `            <div class="related-grid">`,
    cards,
    `            </div>`,
    `        </div>`,
    `    </section>${eol}`
  ].join(eol);
}

/**
 * Replaces the bracketed array value for a given key (e.g., "inlineMath" or "displayMath")
 * using bracket-depth and string-quote tracking so inner `']'` characters never break matching.
 */
function replaceArrayProp(scriptText, propName, newValue) {
  const keyRe = new RegExp(`\\b${propName}\\s*:\\s*\\[`);
  const match = keyRe.exec(scriptText);
  if (!match) return null;

  const arrayStart = match.index + match[0].length - 1;
  let depth = 0;
  let quote = null;
  let escaped = false;
  let arrayEnd = -1;

  for (let i = arrayStart; i < scriptText.length; i++) {
    const ch = scriptText[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote) {
      if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '\'' || ch === '"') {
      quote = ch;
    } else if (ch === '[') {
      depth++;
    } else if (ch === ']') {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }

  if (arrayEnd === -1) return null;
  return scriptText.slice(0, match.index) + `${propName}: ${newValue}` + scriptText.slice(arrayEnd + 1);
}
function applyEdits(source, edits) {
  let out = source;
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return out;
}

function fixUnitConverter(rootDir, isDryRun) {
  const targetPath = path.join(rootDir, TARGET_FILE);
  if (!fs.existsSync(targetPath)) {
    throw new Error(`Target file not found: ${targetPath}`);
  }

  const rawHtml = fs.readFileSync(targetPath, 'utf8');
  const eol = rawHtml.includes('\r\n') ? '\r\n' : '\n';
  const $ = cheerio.load(rawHtml, {
    xml: { xmlMode: false, withStartIndices: true, withEndIndices: true }
  });

  const edits = [];
  const actions = [];

  // Bug 1: Duplicate AdSense <script> tags containing adsbygoogle.js
  const adsScripts = $('script[src*="adsbygoogle.js"]').toArray();
  if (adsScripts.length > 1) {
    for (let i = 1; i < adsScripts.length; i++) {
      const el = adsScripts[i];
      let end = el.endIndex + 1;
      while (end < rawHtml.length && (rawHtml[end] === ' ' || rawHtml[end] === '\t')) end++;
      if (rawHtml.slice(end, end + 2) === '\r\n') end += 2;
      else if (rawHtml[end] === '\n') end += 1;

      edits.push({
        start: el.startIndex,
        end,
        replacement: '',
        label: `Bug 1: Remove duplicate AdSense <script> #${i + 1}`
      });
      actions.push(`Bug 1 (Duplicate AdSense): Remove duplicate <script src*="adsbygoogle.js"> at bytes ${el.startIndex}..${end}`);
    }
  } else {
    actions.push('Bug 1 (Duplicate AdSense): No duplicates found (kept existing script).');
  }

  // Bug 2: MathJax Config inlineMath / displayMath
  const mathJaxScript = $('script').toArray().find(el => {
    if ($(el).attr('src')) return false;
    return $(el).html().includes('MathJax = {');
  });

  if (mathJaxScript && typeof mathJaxScript.startIndex === 'number') {
    const scriptRaw = rawHtml.slice(mathJaxScript.startIndex, mathJaxScript.endIndex + 1);
    const safeInlineVal = "[['\\\\(', '\\\\)'], ['$', '$']]";
    const safeDisplayVal = "[['\\\\[', '\\\\]'], ['$$', '$$']]";

    let updatedScript = replaceArrayProp(scriptRaw, 'inlineMath', safeInlineVal) || scriptRaw;
    const withDisplay = replaceArrayProp(updatedScript, 'displayMath', safeDisplayVal);
    if (withDisplay) {
      updatedScript = withDisplay;
    } else if (/inlineMath\s*:/.test(updatedScript)) {
      updatedScript = updatedScript.replace(
        /\binlineMath\s*:\s*\[\[[^\n]*\]\s*,?/,
        (match) => `${match}${eol}                displayMath: ${safeDisplayVal},`
      );
    }

    if (updatedScript !== scriptRaw) {
      edits.push({
        start: mathJaxScript.startIndex,
        end: mathJaxScript.endIndex + 1,
        replacement: updatedScript,
        label: 'Bug 2: Update MathJax inlineMath and displayMath configuration'
      });
      actions.push(`Bug 2 (MathJax Config): Update inlineMath to [['\\\\(', '\\\\)'], ['$', '$']] and displayMath to [['\\\\[', '\\\\]'], ['$$', '$$']]`);
    } else {
      actions.push('Bug 2 (MathJax Config): Already using safe standard configuration.');
    }
  } else {
    actions.push('Bug 2 (MathJax Config): No <script> containing "MathJax = {" found.');
  }

  // Bug 3: Missing <section class="related-tools-section"> before <footer>
  const hasRelatedSection = $('section.related-tools-section').length > 0;
  if (!hasRelatedSection) {
    const mapPath = path.join(rootDir, MAP_FILE);
    if (!fs.existsSync(mapPath)) {
      throw new Error(`Map file not found: ${mapPath}`);
    }
    const relatedMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    const relatedFiles = relatedMap[TARGET_FILE];
    if (!Array.isArray(relatedFiles) || relatedFiles.length === 0) {
      throw new Error(`No entry for ${TARGET_FILE} in ${MAP_FILE}`);
    }

    const footerEl = $('footer').first()[0];
    if (!footerEl || typeof footerEl.startIndex !== 'number') {
      throw new Error(`No <footer> tag found in ${TARGET_FILE}`);
    }

    const block = buildRelatedToolsSection(rootDir, relatedFiles, eol);
    edits.push({
      start: footerEl.startIndex,
      end: footerEl.startIndex,
      replacement: block,
      label: 'Bug 3: Inject <section class="related-tools-section"> before <footer>'
    });
    actions.push(`Bug 3 (Missing Related Tools): Inject <section class="related-tools-section"> before <footer> with cards [${relatedFiles.join(', ')}]`);
  } else {
    actions.push('Bug 3 (Missing Related Tools): <section class="related-tools-section"> already present.');
  }

  console.log('====================================================');
  console.log(` Fix Unit Converter Mechanical (${TARGET_FILE})`);
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (no changes written)' : 'LIVE (writing changes)'}`);
  console.log('====================================================');
  for (const a of actions) {
    console.log(' - ' + a);
  }

  if (edits.length === 0) {
    console.log('\nNo changes needed.');
    return { changed: false, editsCount: 0 };
  }

  const updatedHtml = applyEdits(rawHtml, edits);
  if (!isDryRun) {
    fs.writeFileSync(targetPath, updatedHtml, 'utf8');
    console.log(`\nSuccessfully applied ${edits.length} fix(es) to ${TARGET_FILE}.`);
  } else {
    console.log(`\nDry-run complete: ${edits.length} edit(s) queued for ${TARGET_FILE}.`);
  }

  return { changed: true, editsCount: edits.length, updatedHtml };
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  fixUnitConverter(process.cwd(), isDryRun);
}

module.exports = { fixUnitConverter };
