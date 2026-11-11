#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const FORBIDDEN_CHILD_SELECTOR = 'script, form, input, select, textarea, canvas, iframe';
const CUSTOM_FAQ_HEADING_RE = /\b(?:frequently asked questions|faqs?|questions\s*&\s*answers|q\s*&\s*a|interview questions)\b/i;

function getLocationSpan(el) {
  const loc = el && el.sourceCodeLocation;
  if (loc && typeof loc.startOffset === 'number' && typeof loc.endOffset === 'number') {
    return { start: loc.startOffset, end: loc.endOffset };
  }
  if (el && typeof el.startIndex === 'number' && typeof el.endIndex === 'number') {
    return { start: el.startIndex, end: el.endIndex + 1 };
  }
  return null;
}

function applyEdits(rawHtml, edits) {
  const ordered = [...edits].sort((a, b) => b.start - a.start);
  let lastStart = rawHtml.length + 1;
  let result = rawHtml;
  for (const edit of ordered) {
    if (edit.end > lastStart) {
      throw new Error(`Overlapping byte edit [${edit.start}, ${edit.end}] before ${lastStart}`);
    }
    result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
    lastStart = edit.start;
  }
  return result;
}

/**
 * Expands removal end across trailing spaces and a single newline so we don't leave blank gaps.
 */
function expandLineRemoval(rawHtml, start, end) {
  let remStart = start;
  while (remStart > 0 && (rawHtml[remStart - 1] === ' ' || rawHtml[remStart - 1] === '\t')) {
    remStart--;
  }
  if (remStart > 0 && rawHtml[remStart - 1] !== '\n') {
    remStart = start;
  }

  let remEnd = end;
  while (remEnd < rawHtml.length && (rawHtml[remEnd] === ' ' || rawHtml[remEnd] === '\t')) {
    remEnd++;
  }
  if (rawHtml.slice(remEnd, remEnd + 2) === '\r\n') {
    remEnd += 2;
  } else if (rawHtml[remEnd] === '\n') {
    remEnd += 1;
  }
  return { start: remStart, end: remEnd };
}

/**
 * Identifies redundant generic 3-Q FAQ <section> blocks and legacy <div> Level Up / Related
 * tool card blocks using strict guards, and removes them via byte-range splicing only.
 */
function cleanupHtmlContent(rawHtml) {
  const $ = cheerio.load(rawHtml, {
    sourceCodeLocationInfo: true,
    withStartIndices: true,
    withEndIndices: true
  });

  const removalSpans = [];
  const reasons = [];
  let warning = null;

  // --- 1. Redundant Generic 3-Q FAQ Section ---
  const genericFaqEls = [];
  $('section.faq-section').each((_, el) => {
    if ($(el).find(FORBIDDEN_CHILD_SELECTOR).length > 0) return;
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (/Common questions about this engineering tool/i.test(text) && /1\.\s*Is this .* free to use\?/i.test(text)) {
      genericFaqEls.push(el);
    }
  });

  if (genericFaqEls.length > 0) {
    let hasCustomFaq = false;
    $('h2, h3, h4').each((_, h) => {
      if (genericFaqEls.some(g => $.contains(g, h))) return;
      const t = $(h).text().replace(/\s+/g, ' ').trim();
      if (CUSTOM_FAQ_HEADING_RE.test(t)) {
        hasCustomFaq = true;
        return false;
      }
    });

    if (hasCustomFaq) {
      for (const el of genericFaqEls) {
        const span = getLocationSpan(el);
        if (!span) {
          warning = 'Generic FAQ <section> lacked reliable source offsets.';
          break;
        }
        const snippet = rawHtml.slice(span.start, span.end);
        if (!/^<section\b/i.test(snippet) || !/<\/section>\s*$/i.test(snippet)) {
          warning = 'Generic FAQ <section> span boundaries did not align cleanly.';
          break;
        }
        removalSpans.push({
          ...expandLineRemoval(rawHtml, span.start, span.end),
          label: 'generic-3q-faq'
        });
        reasons.push('generic-3q-faq');
      }
    } else if (genericFaqEls.length > 1) {
      // Edge safety: if somehow two identical generic FAQs exist with no custom FAQ, drop extras only
      for (let i = 1; i < genericFaqEls.length; i++) {
        const span = getLocationSpan(genericFaqEls[i]);
        if (span) {
          removalSpans.push({
            ...expandLineRemoval(rawHtml, span.start, span.end),
            label: 'extra-generic-faq'
          });
          reasons.push('extra-generic-faq');
        }
      }
    }
  }

  if (warning) {
    return { updatedHtml: rawHtml, status: 'warning', reason: warning, removals: [] };
  }

  // --- 2. Legacy <div> Level Up / Related Tools Blocks (only when .rtx-section exists) ---
  const hasRtxSection = $('section.rtx-section').length > 0;
  if (hasRtxSection) {
    const legacyDivCandidates = [];

    // Pattern A: explicit legacy containers outside .rtx-section / nav / footer
    $('div#related-tools-grid, div.levelup-section, div.related-tools-section').each((_, el) => {
      if ($(el).closest('.rtx-section, header, nav, footer').length > 0) return;
      if ($(el).find(FORBIDDEN_CHILD_SELECTOR).length > 0) return;
      const linkCount = $(el).find('a[href]').length;
      if (linkCount >= 1 && linkCount <= 12) {
        legacyDivCandidates.push({ kind: 'div', el, desc: `div#${$(el).attr('id') || ''}.${$(el).attr('class') || ''}` });
      }
    });

    // Pattern B: div wrapping .ecosystem-container with heading "Explore More Engineering Calculators"
    $('div.ecosystem-container').each((_, eco) => {
      if ($(eco).closest('.rtx-section, header, nav, footer').length > 0) return;
      const parentDiv = eco.parent;
      if (!parentDiv || parentDiv.tagName !== 'div') return;
      if ($(parentDiv).find(FORBIDDEN_CHILD_SELECTOR).length > 0) return;
      const hText = $(parentDiv).children('h2, h3').first().text().replace(/\s+/g, ' ').trim();
      const linkCount = $(parentDiv).find('a[href]').length;
      if (/^Explore More Engineering/i.test(hText) && linkCount >= 1 && linkCount <= 12) {
        legacyDivCandidates.push({ kind: 'div', el: parentDiv, desc: 'div[Explore More Engineering]' });
      }
    });

    // Pattern C: sibling <h3> + <p> + <div class="related-tools-grid"> not wrapped in a dedicated .related-tools-section
    $('div.related-tools-grid').each((_, grid) => {
      if ($(grid).closest('.rtx-section, .related-tools-section, #related-tools-grid, header, nav, footer').length > 0) return;
      if ($(grid).find(FORBIDDEN_CHILD_SELECTOR).length > 0) return;
      const linkCount = $(grid).find('a[href]').length;
      if (linkCount < 1 || linkCount > 12) return;

      const gridSpan = getLocationSpan(grid);
      if (!gridSpan) {
        warning = 'Legacy .related-tools-grid lacked reliable source offsets.';
        return false;
      }

      // Check immediately preceding <p> and <h3> ("Explore Related Engineering Calculators")
      let startOffset = gridSpan.start;
      const prev1 = $(grid).prev();
      const prev2 = prev1.length ? prev1.prev() : $();
      if (prev1.is('p') && prev2.is('h2, h3') && /Explore Related Engineering/i.test(prev2.text())) {
        const hSpan = getLocationSpan(prev2[0]);
        if (hSpan && $(prev2[0]).find(FORBIDDEN_CHILD_SELECTOR).length === 0) {
          startOffset = hSpan.start;
        }
      } else if (prev1.is('h2, h3') && /Explore Related Engineering/i.test(prev1.text())) {
        const hSpan = getLocationSpan(prev1[0]);
        if (hSpan && $(prev1[0]).find(FORBIDDEN_CHILD_SELECTOR).length === 0) {
          startOffset = hSpan.start;
        }
      }

      const snippet = rawHtml.slice(startOffset, gridSpan.end);
      if (!/<\/div>\s*$/i.test(snippet)) {
        warning = 'Legacy .related-tools-grid end boundary did not align cleanly.';
        return false;
      }

      legacyDivCandidates.push({
        kind: 'span',
        start: startOffset,
        end: gridSpan.end,
        desc: 'related-tools-grid-block'
      });
    });

    if (warning) {
      return { updatedHtml: rawHtml, status: 'warning', reason: warning, removals: [] };
    }

    for (const cand of legacyDivCandidates) {
      if (cand.kind === 'div') {
        const span = getLocationSpan(cand.el);
        if (!span) {
          return { updatedHtml: rawHtml, status: 'warning', reason: `${cand.desc} lacked reliable source offsets.`, removals: [] };
        }
        const snippet = rawHtml.slice(span.start, span.end);
        if (!/^<div\b/i.test(snippet) || !/<\/div>\s*$/i.test(snippet)) {
          return { updatedHtml: rawHtml, status: 'warning', reason: `${cand.desc} span boundaries did not align with <div>...</div>.`, removals: [] };
        }
        removalSpans.push({
          ...expandLineRemoval(rawHtml, span.start, span.end),
          label: cand.desc
        });
        reasons.push(cand.desc);
      } else {
        removalSpans.push({
          ...expandLineRemoval(rawHtml, cand.start, cand.end),
          label: cand.desc
        });
        reasons.push(cand.desc);
      }
    }
  }

  if (removalSpans.length === 0) {
    return { updatedHtml: rawHtml, status: 'skipped', reason: 'clean', removals: [] };
  }

  // Deduplicate / guard against nested overlaps
  const deduped = [];
  for (const r of removalSpans) {
    const insideExisting = deduped.some(e => e.start <= r.start && r.end <= e.end);
    if (!insideExisting) {
      deduped.push({ start: r.start, end: r.end, replacement: '', label: r.label });
    }
  }

  const updatedHtml = applyEdits(rawHtml, deduped);
  return {
    updatedHtml,
    status: updatedHtml !== rawHtml ? 'cleaned' : 'skipped',
    reason: reasons.join(', '),
    removals: deduped.map(d => d.label)
  };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let dryRun = false;
  let only = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') dryRun = true;
    else if (args[i].startsWith('--only=')) only = args[i].slice(7).trim();
    else if (args[i] === '--only') only = args[++i]?.trim();
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  return { dryRun, only };
}

function runCleanup(rootDir, { dryRun = false, only = null, quiet = false } = {}) {
  let files = fs.readdirSync(rootDir).filter(f => f.toLowerCase().endsWith('.html')).sort();
  if (only) {
    const normalized = only.endsWith('.html') ? path.basename(only) : `${path.basename(only)}.html`;
    if (!fs.existsSync(path.join(rootDir, normalized))) {
      throw new Error(`Target file not found: ${normalized}`);
    }
    files = [normalized];
  }

  const summary = { scanned: files.length, cleaned: 0, skipped: 0, warnings: 0, details: [] };
  if (!quiet) {
    console.log('====================================================');
    console.log(' Deduplicate FAQ & Legacy Level-Up Blocks');
    console.log(` Mode  : ${dryRun ? 'DRY-RUN (no files written)' : 'LIVE (writing changes)'}`);
    if (only) console.log(` Scope : --only=${files[0]}`);
    console.log('====================================================');
  }

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const res = cleanupHtmlContent(rawHtml);
    summary.details.push({ file, ...res });

    if (res.status === 'cleaned') {
      summary.cleaned++;
      if (!dryRun) fs.writeFileSync(filePath, res.updatedHtml, 'utf8');
      if (!quiet) {
        console.log(`[${dryRun ? 'DRY-RUN' : 'CLEANED'}] ${file} | removed: ${res.removals.join(' + ')}`);
      }
    } else if (res.status === 'warning') {
      summary.warnings++;
      if (!quiet) console.warn(`[WARN] ${file}: ${res.reason}`);
    } else {
      summary.skipped++;
    }
  }

  if (!quiet) {
    console.log('----------------------------------------------------');
    console.log(`Summary: scanned=${summary.scanned}, cleaned=${summary.cleaned}, skipped=${summary.skipped}, warnings=${summary.warnings}`);
  }
  return summary;
}

if (require.main === module) {
  try {
    const opts = parseArgs(process.argv);
    runCleanup(process.cwd(), opts);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { cleanupHtmlContent, runCleanup };

