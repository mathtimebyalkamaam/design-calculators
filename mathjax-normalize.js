#!/usr/bin/env node

/**
 * mathjax-normalize.js
 *
 * Scans all .html files for inline <script> blocks containing a MathJax
 * configuration object (`MathJax = {` or `window.MathJax = {`), detects unsafe
 * delimiter configurations where:
 *   - `inlineMath` contains bare '(' or ')' delimiters (including single-escaped '\(' / '\)')
 *   - `displayMath` contains bare '[' or ']' delimiters (including single-escaped '\[' / '\]')
 *
 * Replaces ONLY those unsafe delimiter array literals with the safe standard:
 *   - inlineMath: [['\\(', '\\)'], ['$', '$']]
 *   - displayMath: [['\\[', '\\]'], ['$$', '$$']]
 *
 * Preserves all other config keys (processEscapes, svg, options, comments, formatting)
 * as well as all other scripts, CSS, and HTML untouched via byte-range edits guided
 * by cheerio's sourceCodeLocationInfo.
 *
 * Idempotent and supports `--dry-run`.
 *
 * Usage:
 *   node mathjax-normalize.js --dry-run
 *   node mathjax-normalize.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cheerio = require('cheerio');

const SAFE_INLINE_MATH = "[['\\\\(', '\\\\)'], ['$', '$']]";
const SAFE_DISPLAY_MATH = "[['\\\\[', '\\\\]'], ['$$', '$$']]";

/**
 * Recursively collects all .html files under `dir`, skipping node_modules and .git.
 */
function walkHtmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkHtmlFiles(fullPath, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      out.push(fullPath);
    }
  }
  return out.sort();
}

/**
 * If `src[i]` starts a JS string literal or comment, returns the index right after it;
 * otherwise returns -1.
 */
function skipStringOrComment(src, i, limit = src.length) {
  const ch = src[i];
  if (ch === '\'' || ch === '"' || ch === '`') {
    let j = i + 1;
    let escaped = false;
    while (j < limit) {
      const c = src[j];
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === ch) {
        return j + 1;
      }
      j++;
    }
    return limit;
  }

  if (ch === '/' && i + 1 < limit) {
    if (src[i + 1] === '/') {
      const nl = src.indexOf('\n', i + 2);
      return nl === -1 || nl >= limit ? limit : nl + 1;
    }
    if (src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      return close === -1 || close + 2 > limit ? limit : close + 2;
    }
  }

  return -1;
}

/**
 * Finds all `{ start, end }` spans (inclusive of outer `{` and `}`) for
 * `MathJax = { ... }` or `window.MathJax = { ... }` inside `scriptText`.
 */
function findMathJaxObjectRanges(scriptText) {
  const ranges = [];
  const len = scriptText.length;
  let i = 0;

  while (i < len) {
    const skipped = skipStringOrComment(scriptText, i, len);
    if (skipped !== -1) {
      i = skipped;
      continue;
    }

    const prevCh = i > 0 ? scriptText[i - 1] : '';
    const isBoundary = !prevCh || !/[\w$.]/.test(prevCh);
    if (isBoundary) {
      const slice = scriptText.slice(i);
      const match = /^(?:window\.)?MathJax\s*=\s*\{/.exec(slice);
      if (match) {
        const braceStart = i + match[0].length - 1;
        let depth = 0;
        let j = braceStart;
        let braceEnd = -1;

        while (j < len) {
          const skipInner = skipStringOrComment(scriptText, j, len);
          if (skipInner !== -1) {
            j = skipInner;
            continue;
          }
          if (scriptText[j] === '{') depth++;
          else if (scriptText[j] === '}') {
            depth--;
            if (depth === 0) {
              braceEnd = j + 1;
              break;
            }
          }
          j++;
        }

        if (braceEnd !== -1) {
          ranges.push({ start: braceStart, end: braceEnd });
          i = braceEnd;
          continue;
        }
      }
    }
    i++;
  }

  return ranges;
}

/**
 * Finds all array value ranges `{ start, end, raw }` for `propName: [...]`
 * inside `src.slice(rangeStart, rangeEnd)`, ignoring strings and comments.
 */
function findPropertyArrayRanges(src, rangeStart, rangeEnd, propName) {
  const results = [];
  const propRegex = new RegExp(`^${propName}\\s*:\\s*\\[`);
  let i = rangeStart;

  while (i < rangeEnd) {
    const skipped = skipStringOrComment(src, i, rangeEnd);
    if (skipped !== -1) {
      i = skipped;
      continue;
    }

    const prevCh = i > 0 ? src[i - 1] : '';
    const isWordStart = !prevCh || !/[\w$]/.test(prevCh);
    if (isWordStart) {
      const m = propRegex.exec(src.slice(i, rangeEnd));
      if (m) {
        const arrayStart = i + m[0].length - 1;
        let depth = 0;
        let j = arrayStart;
        let arrayEnd = -1;

        while (j < rangeEnd) {
          const skipInner = skipStringOrComment(src, j, rangeEnd);
          if (skipInner !== -1) {
            j = skipInner;
            continue;
          }
          if (src[j] === '[') depth++;
          else if (src[j] === ']') {
            depth--;
            if (depth === 0) {
              arrayEnd = j + 1;
              break;
            }
          }
          j++;
        }

        if (arrayEnd !== -1) {
          results.push({
            start: arrayStart,
            end: arrayEnd,
            raw: src.slice(arrayStart, arrayEnd)
          });
          i = arrayEnd;
          continue;
        }
      }
    }
    i++;
  }

  return results;
}

/**
 * Evaluates a delimiter array literal string (e.g. `[['(', ')']]`) safely.
 * Note: in JS string literals, both `'('` and `'\('` evaluate to `'('`,
 * whereas `'\\('` evaluates to the two-character string `'\\('`.
 */
function parseDelimiterPairs(arrayStr) {
  try {
    const parsed = vm.runInNewContext(`(${arrayStr})`, Object.create(null), { timeout: 100 });
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

/**
 * Checks whether an `inlineMath` or `displayMath` delimiter list contains
 * bare open/close characters (`(` / `)` for inlineMath, `[` / `]` for displayMath).
 */
function isUnsafePairList(arrayStr, openDelim, closeDelim) {
  const pairs = parseDelimiterPairs(arrayStr);
  if (pairs) {
    return pairs.some(
      pair =>
        Array.isArray(pair) &&
        pair.length >= 2 &&
        (pair[0] === openDelim || pair[1] === closeDelim)
    );
  }
  return false;
}

function applyEdits(source, edits) {
  let out = source;
  const sorted = [...edits].sort((a, b) => b.start - a.start);
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return out;
}

/**
 * Inspects and normalizes unsafe MathJax delimiter arrays in `rawHtml`.
 * Returns `{ updatedHtml, changed, changes }`.
 */
function normalizeMathJaxInHtml(rawHtml) {
  if (!rawHtml.includes('MathJax')) {
    return { updatedHtml: rawHtml, changed: false, changes: [] };
  }

  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true });
  const edits = [];
  const changes = [];

  $('script').each((_, el) => {
    if ($(el).attr('src') !== undefined) return;
    const loc = el.sourceCodeLocation;
    if (!loc || !loc.startTag || !loc.endTag) return;

    const scriptStart = loc.startTag.endOffset;
    const scriptEnd = loc.endTag.startOffset;
    if (typeof scriptStart !== 'number' || typeof scriptEnd !== 'number' || scriptEnd <= scriptStart) {
      return;
    }

    const scriptText = rawHtml.slice(scriptStart, scriptEnd);
    const objRanges = findMathJaxObjectRanges(scriptText);
    if (objRanges.length === 0) return;

    for (const objRange of objRanges) {
      const inlineMatches = findPropertyArrayRanges(scriptText, objRange.start, objRange.end, 'inlineMath');
      for (const m of inlineMatches) {
        if (isUnsafePairList(m.raw, '(', ')') && m.raw !== SAFE_INLINE_MATH) {
          edits.push({
            start: scriptStart + m.start,
            end: scriptStart + m.end,
            replacement: SAFE_INLINE_MATH
          });
          changes.push({ property: 'inlineMath', before: m.raw, after: SAFE_INLINE_MATH });
        }
      }

      const displayMatches = findPropertyArrayRanges(scriptText, objRange.start, objRange.end, 'displayMath');
      for (const m of displayMatches) {
        if (isUnsafePairList(m.raw, '[', ']') && m.raw !== SAFE_DISPLAY_MATH) {
          edits.push({
            start: scriptStart + m.start,
            end: scriptStart + m.end,
            replacement: SAFE_DISPLAY_MATH
          });
          changes.push({ property: 'displayMath', before: m.raw, after: SAFE_DISPLAY_MATH });
        }
      }
    }
  });

  if (edits.length === 0) {
    return { updatedHtml: rawHtml, changed: false, changes: [] };
  }

  const updatedHtml = applyEdits(rawHtml, edits);
  return { updatedHtml, changed: updatedHtml !== rawHtml, changes };
}

/**
 * Scans all .html files in `rootDir` and normalizes unsafe MathJax delimiter configs.
 */
function scanAndNormalizeMathJax(rootDir, { dryRun = false, quiet = false } = {}) {
  const htmlFiles = walkHtmlFiles(rootDir);
  const modifiedFiles = [];

  for (const filePath of htmlFiles) {
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const result = normalizeMathJaxInHtml(rawHtml);
    if (result.changed) {
      const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
      modifiedFiles.push({ file: relPath, changes: result.changes });
      if (!dryRun) {
        fs.writeFileSync(filePath, result.updatedHtml, 'utf8');
      }
    }
  }

  if (!quiet) {
    console.log('====================================================');
    console.log(' MathJax Delimiter Normalizer');
    console.log(` Mode: ${dryRun ? 'DRY-RUN (no files written)' : 'LIVE (writing changes)'}`);
    console.log('====================================================');
    console.log(`Scanned HTML files : ${htmlFiles.length}`);
    console.log(`Files with unsafe MathJax delimiters : ${modifiedFiles.length}`);
    for (const entry of modifiedFiles) {
      console.log(` - ${dryRun ? '[DRY-RUN] Would modify' : 'Modified'}: ${entry.file}`);
      for (const c of entry.changes) {
        console.log(`     ${c.property}: ${c.before} -> ${c.after}`);
      }
    }
  }

  return {
    scannedCount: htmlFiles.length,
    modifiedCount: modifiedFiles.length,
    modifiedFiles
  };
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  scanAndNormalizeMathJax(process.cwd(), { dryRun });
}

module.exports = {
  SAFE_INLINE_MATH,
  SAFE_DISPLAY_MATH,
  isUnsafePairList,
  normalizeMathJaxInHtml,
  scanAndNormalizeMathJax
};

