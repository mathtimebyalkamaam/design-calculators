#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cheerio = require('cheerio');

/**
 * Extracts normalized executable JS <script> signatures (excluding JSON-LD data blocks)
 * so we can detect any change to calculation or page scripts.
 */
function extractScriptSignatures(html) {
  const $ = cheerio.load(html);
  const sigs = [];
  $('script').each((_, el) => {
    const type = ($(el).attr('type') || '').trim().toLowerCase();
    if (type === 'application/ld+json' || type === 'application/json') {
      return;
    }
    const src = ($(el).attr('src') || '').trim();
    const body = $(el).html() || '';
    sigs.push({ src, type, body });
  });
  return sigs;
}

/**
 * Resolves an internal .rtx-card href to a root HTML filename in rootDir.
 * Returns { targetFile, exists, external } or null if empty.
 */
function resolveCardHref(rawHref, rootDir) {
  if (!rawHref) return null;
  let href = String(rawHref).trim();
  if (!href || href.startsWith('#') || /^(?:mailto|tel|javascript):/i.test(href)) {
    return { raw: rawHref, targetFile: null, exists: false, external: true };
  }

  if (/^https?:\/\//i.test(href)) {
    try {
      const parsed = new URL(href);
      if (!/^(?:www\.)?designcalculators\.co\.in$/i.test(parsed.hostname)) {
        return { raw: rawHref, targetFile: null, exists: false, external: true };
      }
      href = parsed.pathname;
    } catch (_) {
      return { raw: rawHref, targetFile: null, exists: false, external: true };
    }
  }

  href = href.split('#')[0].split('?')[0].trim();
  if (!href || href === '/') {
    const exists = fs.existsSync(path.join(rootDir, 'index.html'));
    return { raw: rawHref, targetFile: 'index.html', exists, external: false };
  }

  const cleanSlug = href.replace(/^\/+/, '').replace(/\/+$/, '');
  const targetFile = cleanSlug.toLowerCase().endsWith('.html') ? cleanSlug : `${cleanSlug}.html`;
  const exists = fs.existsSync(path.join(rootDir, targetFile));
  return { raw: rawHref, targetFile, exists, external: false };
}

/**
 * Reads HEAD:<filename> from git if available; returns null if untracked or unavailable.
 */
function readGitHeadFile(rootDir, filename) {
  try {
    return execFileSync('git', ['show', `HEAD:${filename}`], {
      cwd: rootDir,
      encoding: 'utf8',
      maxBuffer: 25 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (_) {
    return null;
  }
}

/**
 * Verifies a single HTML document against all checks without writing any files.
 */
function verifyHtmlContent(rawHtml, filename, { rootDir, headHtml = undefined } = {}) {
  const $ = cheerio.load(rawHtml);

  const rtxCount = $('.rtx-section').length;
  const legacyCount = $('.related-tools-section').length;

  const cssInHead = $('head link[rel="stylesheet"]').toArray().some(el => {
    const href = ($(el).attr('href') || '').trim();
    return /(?:^|\/)rtx-related\.css(?:$|\?)/i.test(href);
  });

  const cssAnywhere = $('link[rel="stylesheet"]').toArray().some(el => {
    const href = ($(el).attr('href') || '').trim();
    return /(?:^|\/)rtx-related\.css(?:$|\?)/i.test(href);
  });

  const brokenLinks = [];
  $('.rtx-card[href]').each((_, el) => {
    const resolved = resolveCardHref($(el).attr('href'), rootDir);
    if (!resolved || resolved.external || !resolved.exists) {
      brokenLinks.push($(el).attr('href') || '(empty)');
    }
  });

  const resolvedHeadHtml = headHtml !== undefined ? headHtml : readGitHeadFile(rootDir, filename);
  let scriptStatus = 'N/A';
  let scriptReason = '';
  if (resolvedHeadHtml !== null) {
    const headSigs = extractScriptSignatures(resolvedHeadHtml);
    const currSigs = extractScriptSignatures(rawHtml);
    if (headSigs.length !== currSigs.length) {
      scriptStatus = 'CHANGED';
      scriptReason = `script count ${headSigs.length}->${currSigs.length}`;
    } else {
      let alteredIdx = -1;
      for (let i = 0; i < headSigs.length; i++) {
        if (
          headSigs[i].src !== currSigs[i].src ||
          headSigs[i].type !== currSigs[i].type ||
          headSigs[i].body !== currSigs[i].body
        ) {
          alteredIdx = i;
          break;
        }
      }
      if (alteredIdx !== -1) {
        scriptStatus = 'CHANGED';
        scriptReason = `script[${alteredIdx}] modified vs HEAD`;
      } else {
        scriptStatus = 'OK';
      }
    }
  }

  const failures = [];
  if (rtxCount > 1) {
    failures.push(`.rtx-section count=${rtxCount} (>1)`);
  }
  if (legacyCount > 0) {
    failures.push(`.related-tools-section count=${legacyCount} (>0)`);
  }
  if (!cssInHead) {
    failures.push(cssAnywhere ? 'rtx-related.css outside <head>' : 'missing rtx-related.css in <head>');
  }
  if (brokenLinks.length > 0) {
    failures.push(`broken .rtx-card hrefs: ${brokenLinks.join(', ')}`);
  }
  if (scriptStatus === 'CHANGED') {
    failures.push(scriptReason);
  }

  return {
    file: filename,
    rtxCount,
    legacyCount,
    cssInHead,
    cssAnywhere,
    brokenLinks,
    scriptStatus,
    pass: failures.length === 0,
    failures
  };
}

function padRight(str, width) {
  const s = String(str);
  return s.length >= width ? s : s + ' '.repeat(width - s.length);
}

/**
 * Verifies all root *.html files in rootDir, prints a pass/fail table, and returns summary.
 */
function verifyAll(rootDir, { quiet = false } = {}) {
  const files = fs
    .readdirSync(rootDir)
    .filter(f => f.toLowerCase().endsWith('.html'))
    .sort();

  const results = [];
  for (const filename of files) {
    const rawHtml = fs.readFileSync(path.join(rootDir, filename), 'utf8');
    results.push(verifyHtmlContent(rawHtml, filename, { rootDir }));
  }

  const passed = results.filter(r => r.pass).length;
  const failed = results.length - passed;

  if (!quiet) {
    const fileColWidth = Math.min(48, Math.max(18, ...results.map(r => r.file.length)));
    const header =
      `${padRight('File', fileColWidth)} | RTX | Legacy | CSS(<head>) | Broken | Scripts | Result | Details`;
    const divider = '-'.repeat(header.length + 12);

    console.log(divider);
    console.log(header);
    console.log(divider);

    for (const r of results) {
      const nameDisplay = r.file.length > fileColWidth ? r.file.slice(0, fileColWidth - 3) + '...' : r.file;
      const line = [
        padRight(nameDisplay, fileColWidth),
        padRight(r.rtxCount, 3),
        padRight(r.legacyCount, 6),
        padRight(r.cssInHead ? 'YES' : 'NO', 11),
        padRight(r.brokenLinks.length, 6),
        padRight(r.scriptStatus, 7),
        padRight(r.pass ? 'PASS' : 'FAIL', 6),
        r.failures.join('; ')
      ].join(' | ');
      console.log(line);
    }

    console.log(divider);
    console.log(`Summary: scanned=${results.length}, passed=${passed}, failed=${failed}`);
  }

  return {
    scanned: results.length,
    passed,
    failed,
    results
  };
}

if (require.main === module) {
  const summary = verifyAll(process.cwd());
  process.exit(summary.failed > 0 ? 1 : 0);
}

module.exports = {
  extractScriptSignatures,
  resolveCardHref,
  verifyHtmlContent,
  verifyAll
};

