#!/usr/bin/env node

/**
 * title-integrity.js
 *
 * Audits and repairs HTML <title> and <meta property="og:title"> tags using cheerio.
 *
 * Modes:
 *   --report [out.csv]
 *     Scans all .html files and writes titles-audit.csv (or specified path) with columns:
 *       file, current_title, og_title, h1, flag
 *     Sets flag=YES when <title>:
 *       1. contains ' & |' or ' & IS |'
 *       2. ends with ' &', ' (', or ' -' (including before '| ...')
 *       3. is under 25 characters
 *       4. lacks a standard number (e.g. 'IS 14615', 'IEC 60534-8') present in og_title
 *
 *   --apply <mapping.csv>
 *     Reads CSV with columns `file,new_title`, updates <head><title>...</title> and syncs
 *     <head><meta property="og:title"> to the same text (preserving the ' - Design Calculators'
 *     suffix on og:title where present).
 *
 * Safety & CLI flags:
 *   - Edits strictly inside <head> only using byte-range slices from cheerio sourceCodeLocationInfo.
 *   - Idempotent and supports `--dry-run`.
 *
 * Usage:
 *   node title-integrity.js --report
 *   node title-integrity.js --report --dry-run
 *   node title-integrity.js --apply mapping.csv --dry-run
 *   node title-integrity.js --apply mapping.csv
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const DEFAULT_REPORT_FILE = 'titles-audit.csv';
const STANDARD_NUMBER_RE =
  /\b(?:IEC|IEEE|ISA|API(?:\s+RP)?|ASME(?:\s+[A-Z]+)?|ANSI(?:\/[A-Z]+)?|ISO|BS|IS|NFPA|TEMA|OSHA|NEMA|ASHRAE|EN|ASTM|DIN|UL|AWWA|SMACNA)\s*[-/]?\s*\d+(?:[.-]\d+)*[A-Za-z]?(?:-\d+)*/g;

function normalizeSpace(str) {
  return str ? String(str).replace(/\s+/g, ' ').trim() : '';
}

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

function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(cells) {
  return cells.map(escapeCsvCell).join(',');
}

/**
 * RFC 4180 CSV parser returning an array of row arrays.
 */
function parseCsv(csvText) {
  const text = csvText.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}

function extractStandardNumbers(text) {
  if (!text) return [];
  const matches = text.match(STANDARD_NUMBER_RE) || [];
  return [...new Set(matches.map(normalizeSpace))];
}

/**
 * Determines whether a page title should be flagged and returns `{ flagged, reasons }`.
 */
function evaluateTitleIntegrity(currentTitle, ogTitle) {
  const title = normalizeSpace(currentTitle);
  const og = normalizeSpace(ogTitle);
  const reasons = [];

  if (title.includes(' & |') || title.includes(' & IS |')) {
    reasons.push("contains ' & |' or ' & IS |'");
  }

  const titleCore = title.replace(/\s*\|\s*Design\s+Calculators.*$/i, '').trimEnd();
  const trailingEndsRe = /(?: &| \(| -)$/;
  if (trailingEndsRe.test(title) || trailingEndsRe.test(titleCore)) {
    reasons.push("ends with ' &', ' (', or ' -'");
  }

  if (title.length < 25) {
    reasons.push(`under 25 chars (${title.length})`);
  }

  const ogStds = extractStandardNumbers(og);
  const normTitleUpper = title.toUpperCase();
  const missingStds = ogStds.filter(std => !normTitleUpper.includes(std.toUpperCase()));
  if (missingStds.length > 0) {
    reasons.push(`lacks standard(s) from og:title: ${missingStds.join(', ')}`);
  }

  return {
    flagged: reasons.length > 0,
    reasons
  };
}

/**
 * Computes the synced og:title string from `newTitle` while preserving the
 * ` - Design Calculators` suffix if already present on the existing og:title.
 */
function computeSyncedOgTitle(newTitle, existingOgTitle) {
  const cleanNew = normalizeSpace(newTitle);
  const cleanExistingOg = normalizeSpace(existingOgTitle);
  if (/\s-\sDesign Calculators$/i.test(cleanExistingOg)) {
    const base = cleanNew.replace(/\s*(?:\||-)\s*Design Calculators$/i, '').trim();
    return `${base} - Design Calculators`;
  }
  return cleanNew;
}

function encodeHtmlTextNode(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function encodeHtmlAttrValue(str, quoteChar) {
  let out = String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (quoteChar === "'") {
    out = out.replace(/'/g, '&#39;');
  } else {
    out = out.replace(/"/g, '&quot;');
  }
  return out;
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
 * Updates ONLY <head> elements (<title> and <meta property="og:title">) in `rawHtml`.
 */
function applyTitleMappingToHtml(rawHtml, newTitle) {
  const targetTitle = normalizeSpace(newTitle);
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true });

  const headEl = $('head').first()[0];
  if (!headEl || !headEl.sourceCodeLocation) {
    return { updatedHtml: rawHtml, changed: false, error: 'Missing <head> element' };
  }
  const headStart = headEl.sourceCodeLocation.startOffset;
  const headEnd = headEl.sourceCodeLocation.endOffset;

  const edits = [];
  const changes = [];

  // 1. Update <head><title>
  const $title = $('head > title').first();
  const titleEl = $title[0];
  if (titleEl && titleEl.sourceCodeLocation && titleEl.sourceCodeLocation.startTag && titleEl.sourceCodeLocation.endTag) {
    const start = titleEl.sourceCodeLocation.startTag.endOffset;
    const end = titleEl.sourceCodeLocation.endTag.startOffset;
    const currentTitle = normalizeSpace($title.text());

    if (start >= headStart && end <= headEnd && currentTitle !== targetTitle) {
      edits.push({ start, end, replacement: encodeHtmlTextNode(targetTitle) });
      changes.push({ tag: 'title', before: currentTitle, after: targetTitle });
    }
  }

  // 2. Sync <head><meta property="og:title">
  const $ogMeta = $('head > meta[property="og:title"]').first();
  const ogMetaEl = $ogMeta[0];
  if (ogMetaEl && ogMetaEl.sourceCodeLocation && ogMetaEl.sourceCodeLocation.attrs && ogMetaEl.sourceCodeLocation.attrs.content) {
    const attrLoc = ogMetaEl.sourceCodeLocation.attrs.content;
    const currentOg = normalizeSpace($ogMeta.attr('content'));
    const targetOg = computeSyncedOgTitle(targetTitle, currentOg);

    if (attrLoc.startOffset >= headStart && attrLoc.endOffset <= headEnd && currentOg !== targetOg) {
      const rawAttr = rawHtml.slice(attrLoc.startOffset, attrLoc.endOffset);
      const eqIdx = rawAttr.indexOf('=');
      if (eqIdx !== -1) {
        const afterEq = rawAttr.slice(eqIdx + 1).trimStart();
        const quoteChar = afterEq[0] === "'" ? "'" : '"';
        const attrNamePart = rawAttr.slice(0, rawAttr.indexOf('=') + 1);
        const replacementAttr = `${attrNamePart}${quoteChar}${encodeHtmlAttrValue(targetOg, quoteChar)}${quoteChar}`;
        edits.push({
          start: attrLoc.startOffset,
          end: attrLoc.endOffset,
          replacement: replacementAttr
        });
        changes.push({ tag: 'og:title', before: currentOg, after: targetOg });
      }
    }
  }

  if (edits.length === 0) {
    return { updatedHtml: rawHtml, changed: false, changes: [] };
  }

  const updatedHtml = applyEdits(rawHtml, edits);
  return { updatedHtml, changed: updatedHtml !== rawHtml, changes };
}

function runReport(rootDir, { outputFile = DEFAULT_REPORT_FILE, dryRun = false, quiet = false } = {}) {
  const htmlFiles = walkHtmlFiles(rootDir);
  const rows = [];
  const flaggedRows = [];

  for (const filePath of htmlFiles) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(rawHtml);

    const currentTitle = normalizeSpace($('head title').first().text());
    const ogTitle = normalizeSpace($('head meta[property="og:title"]').first().attr('content'));
    const h1 = normalizeSpace($('h1').first().text());

    const audit = evaluateTitleIntegrity(currentTitle, ogTitle);
    const flag = audit.flagged ? 'YES' : 'NO';
    const record = { file: relPath, current_title: currentTitle, og_title: ogTitle, h1, flag, reasons: audit.reasons };
    rows.push(record);
    if (audit.flagged) flaggedRows.push(record);
  }

  const csvLines = [toCsvRow(['file', 'current_title', 'og_title', 'h1', 'flag'])];
  for (const r of rows) {
    csvLines.push(toCsvRow([r.file, r.current_title, r.og_title, r.h1, r.flag]));
  }
  const csvContent = csvLines.join('\n') + '\n';

  const outPath = path.resolve(rootDir, outputFile);
  if (!dryRun) {
    fs.writeFileSync(outPath, csvContent, 'utf8');
  }

  if (!quiet) {
    console.log('====================================================');
    console.log(' Title Integrity Report');
    console.log(` Mode: ${dryRun ? 'DRY-RUN (CSV not written)' : `WRITE (${outputFile})`}`);
    console.log('====================================================');
    console.log(`Scanned HTML files : ${rows.length}`);
    console.log(`Flagged titles     : ${flaggedRows.length}`);
    for (const r of flaggedRows) {
      console.log(`\n[FLAG=YES] ${r.file}`);
      console.log(`  current_title : ${r.current_title}`);
      console.log(`  og_title      : ${r.og_title}`);
      console.log(`  h1            : ${r.h1}`);
      console.log(`  reasons       : ${r.reasons.join('; ')}`);
    }
  }

  return { scannedCount: rows.length, flaggedCount: flaggedRows.length, flaggedRows, outPath };
}

function runApply(rootDir, mappingFile, { dryRun = false, quiet = false } = {}) {
  const mappingPath = path.resolve(rootDir, mappingFile);
  if (!fs.existsSync(mappingPath)) {
    throw new Error(`Mapping CSV not found: ${mappingPath}`);
  }

  const rawCsv = fs.readFileSync(mappingPath, 'utf8');
  const parsedRows = parseCsv(rawCsv);
  if (parsedRows.length === 0) {
    throw new Error(`Mapping CSV is empty: ${mappingPath}`);
  }

  const header = parsedRows[0].map(c => c.trim().toLowerCase());
  const fileCol = header.indexOf('file');
  const newTitleCol = header.indexOf('new_title');
  if (fileCol === -1 || newTitleCol === -1) {
    throw new Error('Mapping CSV must contain header columns: file,new_title');
  }

  const modifiedFiles = [];
  let skippedMissing = 0;
  let unchangedCount = 0;

  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const relFile = (row[fileCol] || '').trim();
    const newTitle = normalizeSpace(row[newTitleCol] || '');
    if (!relFile || !newTitle) continue;

    const targetPath = path.resolve(rootDir, relFile);
    if (!fs.existsSync(targetPath)) {
      console.warn(`[WARN] Target file not found, skipping: ${relFile}`);
      skippedMissing++;
      continue;
    }

    const rawHtml = fs.readFileSync(targetPath, 'utf8');
    const res = applyTitleMappingToHtml(rawHtml, newTitle);
    if (res.changed) {
      modifiedFiles.push({ file: relFile, changes: res.changes });
      if (!dryRun) {
        fs.writeFileSync(targetPath, res.updatedHtml, 'utf8');
      }
    } else {
      unchangedCount++;
    }
  }

  if (!quiet) {
    console.log('====================================================');
    console.log(' Title Integrity Apply');
    console.log(` Mapping : ${mappingFile}`);
    console.log(` Mode    : ${dryRun ? 'DRY-RUN (no HTML files written)' : 'LIVE (writing changes)'}`);
    console.log('====================================================');
    console.log(`Modified files : ${modifiedFiles.length}`);
    console.log(`Already in sync: ${unchangedCount}`);
    if (skippedMissing > 0) console.log(`Missing files  : ${skippedMissing}`);
    for (const entry of modifiedFiles) {
      console.log(` - ${dryRun ? '[DRY-RUN] Would update' : 'Updated'}: ${entry.file}`);
      for (const c of entry.changes) {
        console.log(`     <${c.tag}>: "${c.before}" -> "${c.after}"`);
      }
    }
  }

  return { modifiedCount: modifiedFiles.length, unchangedCount, skippedMissing, modifiedFiles };
}

function parseArgs(argv) {
  const args = argv.slice(2);
  let mode = null;
  let mappingFile = null;
  let reportFile = DEFAULT_REPORT_FILE;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--dry-run') {
      dryRun = true;
    } else if (a === '--report') {
      mode = 'report';
      if (args[i + 1] && !args[i + 1].startsWith('--')) {
        reportFile = args[++i];
      }
    } else if (a === '--apply') {
      mode = 'apply';
      if (!args[i + 1] || args[i + 1].startsWith('--')) {
        throw new Error('--apply requires a <mapping.csv> file path');
      }
      mappingFile = args[++i];
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (!mode) {
    throw new Error('Specify either --report or --apply <mapping.csv>');
  }

  return { mode, mappingFile, reportFile, dryRun };
}

if (require.main === module) {
  try {
    const opts = parseArgs(process.argv);
    if (opts.mode === 'report') {
      runReport(process.cwd(), { outputFile: opts.reportFile, dryRun: opts.dryRun });
    } else {
      runApply(process.cwd(), opts.mappingFile, { dryRun: opts.dryRun });
    }
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Usage:');
    console.error('  node title-integrity.js --report [--dry-run]');
    console.error('  node title-integrity.js --apply <mapping.csv> [--dry-run]');
    process.exit(1);
  }
}

module.exports = {
  evaluateTitleIntegrity,
  computeSyncedOgTitle,
  applyTitleMappingToHtml,
  runReport,
  runApply,
  parseCsv,
  toCsvRow
};

