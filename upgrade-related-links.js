#!/usr/bin/env node

/**
 * upgrade-related-links.js
 *
 * Replaces every legacy or unstyled related-links <section> across HTML files with ONE
 * standardized <section class="rtx-section"> card grid styled by /rtx-related.css.
 *
 * Uses cheerio with source-location offsets (`sourceCodeLocationInfo: true`,
 * `withStartIndices: true`, `withEndIndices: true`) and applies byte-range splices ONLY
 * — never re-serializes the full HTML document and never touches calculator scripts,
 * MathJax blocks, JSON-LD schemas, forms, inputs, or existing CSS.
 *
 * Flags:
 *   --dry-run             Preview changes without writing files
 *   --only=filename.html  Target only the specified HTML file
 *   --rebuild             Remove existing .rtx-section and rebuild it cleanly
 *
 * Usage:
 *   node upgrade-related-links.js --dry-run
 *   node upgrade-related-links.js --only=cable-sizing.html --dry-run
 *   node upgrade-related-links.js --only=cable-sizing.html
 *   node upgrade-related-links.js --rebuild --dry-run
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const MAP_FILE = 'related-tools-map.json';
const ACCENTS = ['blue', 'green', 'amber', 'violet', 'cyan', 'rose'];

const CANDIDATE_HEADING_RE = /^(?:related|level\s+up|explore|expand|continue|companion|next\s+step)/i;
const CTA_ONLY_RE = /^(?:open calculator|try calculator|launch tool|view tool|open tool|calculate now|learn more|read more|explore tool|go to tool|click here)[\s→➜>]*$/i;

const SVG_ICONS = {
  layers:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
  battery:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="18" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><line x1="6" y1="10" x2="6" y2="14"/><line x1="10" y1="10" x2="10" y2="14"/></svg>',
  ground:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="3" x2="12" y2="13"/><line x1="4" y1="13" x2="20" y2="13"/><line x1="7" y1="17" x2="17" y2="17"/><line x1="10" y1="21" x2="14" y2="21"/></svg>',
  plug:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></svg>',
  shield:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  valve:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="4" x2="16" y2="4"/><line x1="12" y1="4" x2="12" y2="12"/><polygon points="3 8 12 13 3 18 3 8"/><polygon points="21 8 12 13 21 18 21 8"/></svg>',
  droplet:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
  thermometer:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>',
  fan:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.827 16.379a6.082 6.082 0 0 1-8.618-7.002l5.412 1.45a6.082 6.082 0 0 1 7.002-8.618l-1.45 5.412a6.082 6.082 0 0 1 8.618 7.002l-5.412-1.45a6.082 6.082 0 0 1-7.002 8.618l1.45-5.412Z"/><circle cx="12" cy="12" r="1"/></svg>',
  sliders:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="2" y1="14" x2="6" y2="14"/><line x1="10" y1="8" x2="14" y2="8"/><line x1="18" y1="16" x2="22" y2="16"/></svg>',
  calculator:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/><line x1="16" y1="18" x2="16.01" y2="18"/></svg>',
  lightning:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  arrow:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>'
};

function cleanSpace(text) {
  return text ? String(text).replace(/\s+/g, ' ').trim() : '';
}

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
 * Strips leading bullet/arrow markers and whitespace from harvested titles.
 */
function sanitizeTitle(text) {
  let out = cleanSpace(text);
  out = out.replace(/^[\s•·▪▸►→➜➤➔\-–—*>]+/, '').trim();
  return out;
}

/**
 * Removes trailing " | Design Calculators" / " - Design Calculators" suffixes from <title>.
 */
function stripSiteTitleSuffix(rawTitle) {
  let t = cleanSpace(rawTitle);
  let prev;
  do {
    prev = t;
    t = t
      .replace(/\s*(?:\||\-|–)\s*Design Calculators\s*$/i, '')
      .replace(/\s*\|\s*Free Engineering Calculators\s*$/i, '')
      .trim();
  } while (t !== prev);
  return t;
}

/**
 * Truncates description to ~170 characters cleanly at a word boundary.
 */
function truncateDescription(text, maxLen = 170) {
  const clean = cleanSpace(text);
  if (!clean || clean.length <= maxLen) return clean;
  const slice = clean.slice(0, maxLen - 3);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > maxLen * 0.6 ? slice.slice(0, lastSpace) : slice;
  return cut.replace(/[,;:\-]+$/, '').trim() + '...';
}

/**
 * Chooses an inline SVG icon key by slug keywords.
 */
function chooseIconKey(slug) {
  const s = String(slug).toLowerCase();
  if (/(?:battery|ups)/.test(s)) return 'battery';
  if (/(?:earth|ground)/.test(s)) return 'ground';
  if (/(?:cable|conductor|conduit)/.test(s)) return 'plug';
  if (/(?:relay|protection|breaker)/.test(s)) return 'shield';
  if (/(?:valve|orifice)/.test(s)) return 'valve';
  if (/(?:heat|thermal|steam|temp)/.test(s)) return 'thermometer';
  if (/(?:fan|duct|hvac|air)/.test(s)) return 'fan';
  if (/(?:pump|pipe|flow|level)/.test(s)) return 'droplet';
  if (/(?:pid|plc|signal|instrument)/.test(s)) return 'sliders';
  if (/(?:converter|unit|weight|gear)/.test(s)) return 'calculator';
  if (/(?:volt|power|short|arc|motor|transformer)/.test(s)) return 'lightning';
  return 'layers';
}

/**
 * Normalizes an internal href to `/slug` (accepts `/slug.html`, `slug.html`, same-domain
 * URLs). Returns null for external, hash-only, mailto/tel/js, homepage, or self links.
 */
function normalizeInternalHref(href, selfSlug) {
  if (!href) return null;
  let h = String(href).trim();
  if (!h || h.startsWith('#') || /^(?:mailto|tel|javascript):/i.test(h)) return null;

  if (/^https?:\/\//i.test(h)) {
    try {
      const parsed = new URL(h);
      if (!/^(?:www\.)?designcalculators\.co\.in$/i.test(parsed.hostname)) {
        return null;
      }
      h = parsed.pathname;
    } catch (_) {
      return null;
    }
  }

  h = h.split('#')[0].split('?')[0].trim();
  if (!h) return null;
  if (!h.startsWith('/')) h = '/' + h.replace(/^\.\//, '');
  h = h.replace(/\.html$/i, '');
  if (!h || h === '/' || h.toLowerCase() === '/index') return null;

  const targetSlug = h.slice(1);
  if (selfSlug && targetSlug.toLowerCase() === selfSlug.toLowerCase()) return null;
  return h;
}

/**
 * Loads metadata (`title`, `desc`) for every root `.html` file so fallback harvesting
 * and `related-tools-map.json` top-ups remain consistent and fast.
 */
function buildMetadataIndex(rootDir, htmlFiles) {
  const index = new Map();
  for (const file of htmlFiles) {
    const slug = file.replace(/\.html$/i, '').toLowerCase();
    const raw = fs.readFileSync(path.join(rootDir, file), 'utf8');
    const $ = cheerio.load(raw);
    const cleanedTitle = stripSiteTitleSuffix($('head title').first().text());
    const h1 = cleanSpace($('h1').first().text());
    const metaDesc =
      cleanSpace($('head meta[name="description"]').attr('content')) ||
      cleanSpace($('head meta[property="og:description"]').attr('content')) ||
      `Engineering calculation tool for ${cleanedTitle || h1 || slug}.`;

    index.set(slug, {
      slug: file.replace(/\.html$/i, ''),
      title: cleanedTitle || h1 || file.replace(/\.html$/i, ''),
      desc: truncateDescription(metaDesc, 170)
    });
  }
  return index;
}

function getLocationSpan(el) {
  const loc = el && el.sourceCodeLocation;
  if (loc && typeof loc.startOffset === 'number' && typeof loc.endOffset === 'number' && loc.endOffset > loc.startOffset) {
    return { start: loc.startOffset, end: loc.endOffset };
  }
  if (el && typeof el.startIndex === 'number' && typeof el.endIndex === 'number' && el.endIndex > el.startIndex) {
    return { start: el.startIndex, end: el.endIndex };
  }
  return null;
}

function hasAutoGeneratedComment(el) {
  if (!el || !el.children) return false;
  for (const child of el.children) {
    if (child.type === 'comment' && child.data && child.data.includes('Related Tools Section (Auto-generated)')) {
      return true;
    }
    if (hasAutoGeneratedComment(child)) return true;
  }
  return false;
}

/**
 * Checks whether a <section> matches ALL safety guards and at least one related-section signal.
 */
function isCandidateSection($, el, rawHtml, selfSlug, rebuild) {
  const $s = $(el);

  // Guard 1: never touch interactive calculator / embed sections
  if ($s.find('script, form, input, select, textarea, canvas, iframe').length > 0) {
    return false;
  }

  // Guard 2: between 1 and 8 internal anchors (protects 50+ link hub directories)
  let internalCount = 0;
  $s.find('a[href]').each((_, a) => {
    const norm = normalizeInternalHref($(a).attr('href'), null);
    if (norm) internalCount++;
  });
  if (internalCount < 1 || internalCount > 8) {
    return false;
  }

  // Guard 3: match at least one related-tools signal
  if ($s.hasClass('related-tools-section')) return true;
  if (rebuild && $s.hasClass('rtx-section')) return true;
  if ($s.find('.silo-card').length > 0) return true;
  if (hasAutoGeneratedComment(el)) return true;

  const span = getLocationSpan(el);
  if (span && rawHtml.slice(span.start, span.end).includes('<!-- Related Tools Section (Auto-generated) -->')) {
    return true;
  }

  const firstHeading = cleanSpace($s.find('h2, h3').first().text());
  if (CANDIDATE_HEADING_RE.test(firstHeading)) {
    return true;
  }

  return false;
}

/**
 * Extracts card title & description from a harvested anchor element with fallbacks.
 */
function extractCardFromAnchor($, $a, hrefNorm, metaIndex) {
  const slugKey = hrefNorm.slice(1).toLowerCase();
  const meta = metaIndex.get(slugKey) || { slug: hrefNorm.slice(1), title: hrefNorm.slice(1), desc: '' };

  // Title: inner h3/h4/strong -> anchor text -> sibling card heading -> target page <title>
  let title = sanitizeTitle($a.find('h3, h4, strong').first().text());
  if (!title) {
    const anchorText = sanitizeTitle($a.text());
    if (anchorText && !CTA_ONLY_RE.test(anchorText)) {
      title = anchorText;
    }
  }
  if (!title) {
    const $parent = $a.parent();
    if ($parent.length && $parent.find('a').length === 1) {
      const siblingHeading = sanitizeTitle($parent.find('h3, h4, strong').first().text());
      if (siblingHeading && !CTA_ONLY_RE.test(siblingHeading)) {
        title = siblingHeading;
      }
    }
  }
  if (!title) {
    title = meta.title;
  }

  // Description: inner <p> -> sibling <p> -> parent card <p> -> target meta description
  let desc = cleanSpace($a.find('p').first().text());
  if (!desc) {
    desc = cleanSpace($a.siblings('p').first().text());
  }
  if (!desc) {
    const $parent = $a.parent();
    if ($parent.length && $parent.find('a').length === 1) {
      desc = cleanSpace($parent.find('p').first().text());
    }
  }
  if (!desc) {
    desc = meta.desc || `Engineering calculation tool for ${title}.`;
  }

  return {
    href: `/${meta.slug}`,
    slug: meta.slug,
    title,
    desc: truncateDescription(desc, 170)
  };
}

/**
 * Builds the polished <section class="rtx-section"> HTML string.
 */
function buildRtxSectionHtml(cards, eol = '\n', indent = '    ') {
  const cardHtml = cards
    .map((card, idx) => {
      const accent = ACCENTS[idx % ACCENTS.length];
      const iconSvg = SVG_ICONS[chooseIconKey(card.slug)] || SVG_ICONS.layers;
      return [
        `${indent}            <a href="${escapeHtml(card.href)}" class="rtx-card rtx-a-${accent}">`,
        `${indent}                <span class="rtx-icon" aria-hidden="true">${iconSvg}</span>`,
        `${indent}                <h3 class="rtx-card-title">${escapeHtml(card.title)}</h3>`,
        `${indent}                <p class="rtx-card-desc">${escapeHtml(card.desc)}</p>`,
        `${indent}                <span class="rtx-cta">Try Calculator ${SVG_ICONS.arrow}</span>`,
        `${indent}            </a>`
      ].join(eol);
    })
    .join(eol);

  return [
    `<section class="rtx-section" aria-label="Related Engineering Tools">`,
    `${indent}    <div class="rtx-inner">`,
    `${indent}        <div class="rtx-head">`,
    `${indent}            <span class="rtx-head-icon" aria-hidden="true">${SVG_ICONS.layers}</span>`,
    `${indent}            <h2 class="rtx-title">Level Up Your Engineering</h2>`,
    `${indent}            <p class="rtx-sub">Complete your design with these standards-compliant companion calculators.</p>`,
    `${indent}        </div>`,
    `${indent}        <div class="rtx-grid">`,
    cardHtml,
    `${indent}        </div>`,
    `${indent}    </div>`,
    `${indent}</section>${eol}`
  ].join(eol);
}

function applyEdits(source, edits) {
  let out = source;
  // Sort descending by startOffset; for equal start, apply pure insertions (start===end) first
  const sorted = [...edits].sort((a, b) => {
    if (b.start !== a.start) return b.start - a.start;
    return (a.end - a.start) - (b.end - b.start);
  });
  for (const e of sorted) {
    out = out.slice(0, e.start) + e.replacement + out.slice(e.end);
  }
  return out;
}

/**
 * Plans and applies byte-range upgrades on a single HTML string.
 */
function upgradeHtmlContent(rawHtml, filename, { rebuild = false, relatedMap = {}, metaIndex = new Map() } = {}) {
  const selfSlug = filename.replace(/\.html$/i, '');
  const eol = rawHtml.includes('\r\n') ? '\r\n' : '\n';

  const $ = cheerio.load(rawHtml, {
    sourceCodeLocationInfo: true,
    withStartIndices: true,
    withEndIndices: true
  });

  if (!rebuild && $('section.rtx-section').length > 0) {
    return {
      updatedHtml: rawHtml,
      status: 'skipped',
      reason: 'already has .rtx-section (pass --rebuild to rebuild)',
      blocksRemoved: 0,
      cardsInjected: 0,
      targetHrefs: []
    };
  }

  // Locate candidate sections and verify reliable source offsets for ALL of them before editing
  const candidateEls = [];
  let missingOffsetWarning = null;

  $('section').each((_, el) => {
    if (!isCandidateSection($, el, rawHtml, selfSlug, rebuild)) return;
    const span = getLocationSpan(el);
    if (!span) {
      missingOffsetWarning = 'Candidate <section> lacked reliable source offsets; skipped without partial edits.';
      return false;
    }
    const snippet = rawHtml.slice(span.start, span.end);
    if (!/^<section\b/i.test(snippet) || !/<\/section>\s*$/i.test(snippet)) {
      missingOffsetWarning = 'Candidate <section> source span boundaries did not align with <section>...</section>; skipped.';
      return false;
    }
    candidateEls.push({ el, span });
  });

  if (missingOffsetWarning) {
    return {
      updatedHtml: rawHtml,
      status: 'warning',
      reason: missingOffsetWarning,
      blocksRemoved: 0,
      cardsInjected: 0,
      targetHrefs: []
    };
  }

  // Filter out nested candidates if any (outer contains inner)
  const topCandidates = candidateEls.filter(
    (c, i) => !candidateEls.some((other, j) => i !== j && other.span.start <= c.span.start && c.span.end <= other.span.end)
  );

  // Locate insertion point before <footer> (fallback </body>)
  const footerEl = $('footer').first()[0];
  const bodyEl = $('body').first()[0];
  let insertOffset = null;
  if (footerEl) {
    const fLoc = getLocationSpan(footerEl);
    if (fLoc) insertOffset = fLoc.start;
  } else if (bodyEl && bodyEl.sourceCodeLocation && bodyEl.sourceCodeLocation.endTag) {
    insertOffset = bodyEl.sourceCodeLocation.endTag.startOffset;
  }

  if (typeof insertOffset !== 'number') {
    return {
      updatedHtml: rawHtml,
      status: 'warning',
      reason: 'Could not determine reliable byte offset for <footer> or </body>.',
      blocksRemoved: 0,
      cardsInjected: 0,
      targetHrefs: []
    };
  }

  // Locate </head> if /rtx-related.css stylesheet link is absent
  const hasRtxCss = $('link[rel="stylesheet"]').toArray().some(el => {
    const href = ($(el).attr('href') || '').trim();
    return /(?:^|\/)rtx-related\.css(?:$|\?)/i.test(href);
  });

  let headEndOffset = null;
  if (!hasRtxCss) {
    const headEl = $('head').first()[0];
    if (headEl && headEl.sourceCodeLocation && headEl.sourceCodeLocation.endTag && typeof headEl.sourceCodeLocation.endTag.startOffset === 'number') {
      headEndOffset = headEl.sourceCodeLocation.endTag.startOffset;
    } else {
      const headCloseMatch = rawHtml.match(/<\/head\s*>/i);
      if (headCloseMatch && headCloseMatch.index < insertOffset) {
        headEndOffset = headCloseMatch.index;
      } else {
        return {
          updatedHtml: rawHtml,
          status: 'warning',
          reason: 'Missing </head> source offset for inserting /rtx-related.css.',
          blocksRemoved: 0,
          cardsInjected: 0,
          targetHrefs: []
        };
      }
    }
  }

  // Harvest up to 3 unique cards in document order from candidate sections
  const cards = [];
  const seenSlugs = new Set();

  for (const cand of topCandidates) {
    if (cards.length >= 3) break;
    $(cand.el)
      .find('a[href]')
      .each((_, a) => {
        if (cards.length >= 3) return false;
        const norm = normalizeInternalHref($(a).attr('href'), selfSlug);
        if (!norm) return;
        const slugKey = norm.slice(1).toLowerCase();
        if (seenSlugs.has(slugKey)) return;
        seenSlugs.add(slugKey);
        cards.push(extractCardFromAnchor($, $(a), norm, metaIndex));
      });
  }

  // Top up from related-tools-map.json if fewer than 3 cards harvested
  const mapEntries = relatedMap[filename] || relatedMap[`${selfSlug}.html`] || [];
  for (const targetFile of mapEntries) {
    if (cards.length >= 3) break;
    const norm = normalizeInternalHref(`/${targetFile}`, selfSlug);
    if (!norm) continue;
    const slugKey = norm.slice(1).toLowerCase();
    if (seenSlugs.has(slugKey)) continue;
    seenSlugs.add(slugKey);

    const meta = metaIndex.get(slugKey);
    const resolvedSlug = (meta && meta.slug) || norm.slice(1);
    const resolvedTitle = (meta && stripSiteTitleSuffix(meta.title)) || resolvedSlug;
    const resolvedDesc = truncateDescription(meta && (meta.desc || meta.description)) || `Engineering calculation tool for ${resolvedSlug}.`;
    cards.push({
      href: `/${resolvedSlug}`,
      slug: resolvedSlug,
      title: resolvedTitle,
      desc: resolvedDesc
    });
  }

  if (cards.length === 0 && topCandidates.length === 0) {
    return {
      updatedHtml: rawHtml,
      status: 'skipped',
      reason: 'no candidate sections and no map entries',
      blocksRemoved: 0,
      cardsInjected: 0,
      targetHrefs: []
    };
  }

  // Build non-overlapping byte edits
  const edits = [];

  if (!hasRtxCss && headEndOffset !== null) {
    edits.push({
      start: headEndOffset,
      end: headEndOffset,
      replacement: `    <link rel="stylesheet" href="/rtx-related.css">${eol}`
    });
  }

  for (const cand of topCandidates) {
    let removeEnd = cand.span.end;
    // Trim trailing horizontal spaces + a single newline if not crossing insertOffset
    while (removeEnd < insertOffset && (rawHtml[removeEnd] === ' ' || rawHtml[removeEnd] === '\t')) {
      removeEnd++;
    }
    if (removeEnd + 2 <= insertOffset && rawHtml.slice(removeEnd, removeEnd + 2) === '\r\n') {
      removeEnd += 2;
    } else if (removeEnd + 1 <= insertOffset && rawHtml[removeEnd] === '\n') {
      removeEnd += 1;
    }

    edits.push({
      start: cand.span.start,
      end: removeEnd,
      replacement: ''
    });
  }

  if (cards.length > 0) {
    let lineStart = insertOffset;
    while (lineStart > 0 && rawHtml[lineStart - 1] !== '\n') lineStart--;
    const linePrefix = rawHtml.slice(lineStart, insertOffset);
    const baseIndent = /^[ \t]*$/.test(linePrefix) ? linePrefix : '    ';

    edits.push({
      start: insertOffset,
      end: insertOffset,
      replacement: buildRtxSectionHtml(cards, eol, baseIndent)
    });
  }

  const updatedHtml = applyEdits(rawHtml, edits);
  return {
    updatedHtml,
    status: updatedHtml !== rawHtml ? 'upgraded' : 'skipped',
    reason: updatedHtml !== rawHtml ? 'ok' : 'no changes required',
    blocksRemoved: topCandidates.length,
    cardsInjected: cards.length,
    targetHrefs: cards.map(c => c.href)
  };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let dryRun = false;
  let rebuild = false;
  let only = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--rebuild') {
      rebuild = true;
    } else if (a.startsWith('--only=')) {
      only = a.slice('--only='.length).trim();
    } else if (a === '--only') {
      if (!args[i + 1] || args[i + 1].startsWith('--')) {
        throw new Error('--only requires a filename argument');
      }
      only = args[++i].trim();
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  return { dryRun, rebuild, only };
}

function runUpgradeRelatedLinks(rootDir, { dryRun = false, rebuild = false, only = null, quiet = false } = {}) {
  const allRootHtml = fs
    .readdirSync(rootDir)
    .filter(f => f.toLowerCase().endsWith('.html'))
    .sort();

  const metaIndex = buildMetadataIndex(rootDir, allRootHtml);
  const mapPath = path.join(rootDir, MAP_FILE);
  const relatedMap = fs.existsSync(mapPath) ? JSON.parse(fs.readFileSync(mapPath, 'utf8')) : {};

  let targetFiles = allRootHtml;
  if (only) {
    const normalizedOnly = only.endsWith('.html') ? path.basename(only) : `${path.basename(only)}.html`;
    if (!fs.existsSync(path.join(rootDir, normalizedOnly))) {
      throw new Error(`Target file not found in repository root: ${normalizedOnly}`);
    }
    targetFiles = [normalizedOnly];
  }

  const summary = {
    scanned: targetFiles.length,
    upgraded: 0,
    skipped: 0,
    warnings: 0,
    details: []
  };

  if (!quiet) {
    console.log('====================================================');
    console.log(' Upgrade Related Links (.rtx-section)');
    console.log(` Mode    : ${dryRun ? 'DRY-RUN (no files written)' : 'LIVE (writing changes)'}${rebuild ? ' + REBUILD' : ''}`);
    if (only) console.log(` Scope   : --only=${targetFiles[0]}`);
    console.log('====================================================');
  }

  for (const filename of targetFiles) {
    const filePath = path.join(rootDir, filename);
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const res = upgradeHtmlContent(rawHtml, filename, { rebuild, relatedMap, metaIndex });

    summary.details.push({ file: filename, ...res });
    if (res.status === 'upgraded') {
      summary.upgraded++;
      if (!dryRun) {
        fs.writeFileSync(filePath, res.updatedHtml, 'utf8');
      }
      if (!quiet) {
        console.log(
          `[${dryRun ? 'DRY-RUN' : 'UPGRADED'}] ${filename} | blocks removed: ${res.blocksRemoved} | cards injected: ${res.cardsInjected} | hrefs: [${res.targetHrefs.join(', ')}]`
        );
      }
    } else if (res.status === 'warning') {
      summary.warnings++;
      if (!quiet) {
        console.warn(`[WARN] ${filename}: ${res.reason}`);
      }
    } else {
      summary.skipped++;
      if (!quiet && (only || res.reason !== 'already has .rtx-section (pass --rebuild to rebuild)')) {
        console.log(`[SKIP] ${filename}: ${res.reason}`);
      }
    }
  }

  if (!quiet) {
    console.log('----------------------------------------------------');
    console.log(`Summary: scanned=${summary.scanned}, upgraded=${summary.upgraded}, skipped=${summary.skipped}, warnings=${summary.warnings}`);
  }

  return summary;
}

if (require.main === module) {
  try {
    const opts = parseArgs(process.argv);
    runUpgradeRelatedLinks(process.cwd(), opts);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  ACCENTS,
  SVG_ICONS,
  chooseIconKey,
  normalizeInternalHref,
  stripSiteTitleSuffix,
  truncateDescription,
  isCandidateSection,
  buildMetadataIndex,
  upgradeHtmlContent,
  runUpgradeRelatedLinks
};
