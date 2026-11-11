#!/usr/bin/env node

/**
 * entity-consistency.js
 *
 * Ensures consistent JSON-LD Person and Organization schema entities across all .html files
 * using cheerio (`sourceCodeLocationInfo: true`) with byte-range edits so calculation scripts
 * and unrelated markup remain completely untouched.
 *
 * Rules enforced on ALL JSON-LD blocks (<script type="application/ld+json">):
 *   1. If a Person node's `description` contains `'over 15 years of experience'`, replace it with:
 *      'Senior industrial engineer with 25+ years of experience in Electrical, Mechanical, and Instrumentation design. Specialist in IEC, IEEE, ASME and ISO standards.'
 *   2. Ensure every Person node has:
 *      - `@id`: 'https://designcalculators.co.in/#person'
 *      - `name`: 'Anil Sharma'
 *      - `sameAs`: [
 *          'https://www.linkedin.com/in/anil-sharma-engineering',
 *          'https://www.youtube.com/@designcalculators'
 *        ]
 *
 * Additional rule for index.html and about.html ONLY:
 *   - If an existing `@graph` array is present and lacks an Organization node, add:
 *       {
 *         "@type": "Organization",
 *         "@id": "https://designcalculators.co.in/#organization",
 *         "name": "Design Calculators",
 *         "url": "https://designcalculators.co.in",
 *         "logo": "https://designcalculators.co.in/logo.png",
 *         "sameAs": [
 *           "https://www.linkedin.com/in/anil-sharma-engineering",
 *           "https://www.youtube.com/@designcalculators"
 *         ]
 *       }
 *     and set the Person node's `worksFor` to `{ "@id": "https://designcalculators.co.in/#organization" }`.
 *
 * Visible Text Audit (report only, NEVER auto-modified):
 *   - Reports any visible <body> text matching 'A Sharma' or 'A. Sharma'.
 *
 * Idempotent and supports `--dry-run`.
 *
 * Usage:
 *   node entity-consistency.js --dry-run
 *   node entity-consistency.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const PERSON_ID = 'https://designcalculators.co.in/#person';
const ORG_ID = 'https://designcalculators.co.in/#organization';
const CANONICAL_NAME = 'Anil Sharma';
const CANONICAL_SAME_AS = [
  'https://www.linkedin.com/in/anil-sharma-engineering',
  'https://www.youtube.com/@designcalculators'
];
const CANONICAL_DESCRIPTION =
  'Senior industrial engineer with 25+ years of experience in Electrical, Mechanical, and Instrumentation design. Specialist in IEC, IEEE, ASME and ISO standards.';

const ORG_TARGET_FILES = new Set(['index.html', 'about.html']);

function buildOrganizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'Design Calculators',
    url: 'https://designcalculators.co.in',
    logo: 'https://designcalculators.co.in/logo.png',
    sameAs: [...CANONICAL_SAME_AS]
  };
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

function isTypeMatch(node, expectedType) {
  if (!node || typeof node !== 'object') return false;
  const t = node['@type'];
  return t === expectedType || (Array.isArray(t) && t.includes(expectedType));
}

function walkJsonNodes(node, visitor) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) walkJsonNodes(item, visitor);
    return;
  }
  visitor(node);
  for (const val of Object.values(node)) {
    walkJsonNodes(val, visitor);
  }
}

function sameArrayStrings(a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((v, idx) => v === b[idx])
  );
}

/**
 * Formats updated JSON preserving the <script> block's indentation and line endings.
 */
function formatJsonPreservingWrapper(rawScriptContent, data, eol) {
  const leadMatch = rawScriptContent.match(/^(\s*)/);
  const trailMatch = rawScriptContent.match(/(\s*)$/);
  const leadingWs = leadMatch ? leadMatch[1] : '';
  const trailingWs = trailMatch ? trailMatch[1] : '';

  const lines = rawScriptContent.split(/\r?\n/);
  let baseIndent = '    ';
  for (const line of lines) {
    if (line.trim().startsWith('{')) {
      baseIndent = line.match(/^(\s*)/)[1];
      break;
    }
  }

  let stepIndent = 4;
  for (const line of lines) {
    if (line.trim().startsWith('"@context"') || line.trim().startsWith('"@graph"') || line.trim().startsWith('"@type"')) {
      const innerIndent = line.match(/^(\s*)/)[1];
      if (innerIndent.length > baseIndent.length) {
        stepIndent = innerIndent.length - baseIndent.length;
      }
      break;
    }
  }

  const formatted = JSON.stringify(data, null, stepIndent)
    .split('\n')
    .map((line, idx) => (idx === 0 ? line : baseIndent + line))
    .join(eol);

  const hasLeadingNewline = leadingWs.includes('\n') || leadingWs.includes('\r');
  const prefix = hasLeadingNewline ? `${eol}${baseIndent}` : leadingWs;
  const hasTrailingNewline = trailingWs.includes('\n') || trailingWs.includes('\r');
  const suffix = hasTrailingNewline ? `${eol}${baseIndent.slice(0, Math.max(0, baseIndent.length - 4))}` : trailingWs;

  return `${prefix}${formatted}${suffix}`;
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
 * Finds visible <body> text occurrences using 'A Sharma' or 'A. Sharma' (report only).
 */
function findVisibleShortAuthorText(rawHtml) {
  const $ = cheerio.load(rawHtml);
  const $body = $('body');
  if ($body.length === 0) return [];

  const $clone = $body.clone();
  $clone.find('script, style, noscript, template').remove();
  const visibleText = $clone.text().replace(/\s+/g, ' ').trim();

  const matches = [];
  const re = /\bA\.?\s+Sharma\b/gi;
  let m;
  while ((m = re.exec(visibleText)) !== null) {
    const start = Math.max(0, m.index - 35);
    const end = Math.min(visibleText.length, m.index + m[0].length + 45);
    matches.push({
      match: m[0],
      snippet: visibleText.slice(start, end).trim()
    });
  }
  return matches;
}

/**
 * Updates JSON-LD blocks and scans visible text in `rawHtml` for `relPath`.
 * Never modifies non-JSON-LD scripts, CSS, or visible text.
 */
function processHtmlEntityConsistency(rawHtml, relPath) {
  const normalizedRel = relPath.replace(/\\/g, '/');
  const isOrgTarget = ORG_TARGET_FILES.has(normalizedRel);
  const eol = rawHtml.includes('\r\n') ? '\r\n' : '\n';

  const visibleAuthorHits = findVisibleShortAuthorText(rawHtml);
  const $ = cheerio.load(rawHtml, { sourceCodeLocationInfo: true });

  const edits = [];
  const counts = {
    jsonLdBlocks: 0,
    descriptionUpdated: 0,
    personIdUpdated: 0,
    personNameUpdated: 0,
    personSameAsUpdated: 0,
    orgAdded: 0,
    worksForUpdated: 0
  };
  let foundGraphInOrgTarget = false;
  let parseWarnings = [];

  $('script[type="application/ld+json"]').each((idx, el) => {
    counts.jsonLdBlocks++;
    const loc = el.sourceCodeLocation;
    if (!loc || !loc.startTag || !loc.endTag) return;

    const start = loc.startTag.endOffset;
    const end = loc.endTag.startOffset;
    if (typeof start !== 'number' || typeof end !== 'number' || end <= start) return;

    const rawScript = rawHtml.slice(start, end);
    let data;
    try {
      data = JSON.parse(rawScript);
    } catch (err) {
      parseWarnings.push(`JSON-LD block #${idx} parse error: ${err.message}`);
      return;
    }

    let blockChanged = false;
    const hasGraph = Array.isArray(data['@graph']);
    if (isOrgTarget && hasGraph) {
      foundGraphInOrgTarget = true;
      const orgExists = data['@graph'].some(
        node => isTypeMatch(node, 'Organization') && (node['@id'] === ORG_ID || !node['@id'])
      );
      if (!orgExists) {
        data['@graph'].push(buildOrganizationNode());
        counts.orgAdded++;
        blockChanged = true;
      } else {
        const orgNode = data['@graph'].find(node => isTypeMatch(node, 'Organization'));
        if (orgNode) {
          if (orgNode['@id'] !== ORG_ID) { orgNode['@id'] = ORG_ID; blockChanged = true; }
          if (orgNode.name !== 'Design Calculators') { orgNode.name = 'Design Calculators'; blockChanged = true; }
          if (orgNode.url !== 'https://designcalculators.co.in') { orgNode.url = 'https://designcalculators.co.in'; blockChanged = true; }
          if (orgNode.logo !== 'https://designcalculators.co.in/logo.png') { orgNode.logo = 'https://designcalculators.co.in/logo.png'; blockChanged = true; }
          if (!sameArrayStrings(orgNode.sameAs, CANONICAL_SAME_AS)) {
            orgNode.sameAs = [...CANONICAL_SAME_AS];
            blockChanged = true;
          }
        }
      }
    }

    walkJsonNodes(data, node => {
      if (!isTypeMatch(node, 'Person')) return;

      if (typeof node.description === 'string' && node.description.includes('over 15 years of experience')) {
        if (node.description !== CANONICAL_DESCRIPTION) {
          node.description = CANONICAL_DESCRIPTION;
          counts.descriptionUpdated++;
          blockChanged = true;
        }
      }

      if (node['@id'] !== PERSON_ID) {
        node['@id'] = PERSON_ID;
        counts.personIdUpdated++;
        blockChanged = true;
      }

      if (node.name !== CANONICAL_NAME) {
        node.name = CANONICAL_NAME;
        counts.personNameUpdated++;
        blockChanged = true;
      }

      if (!sameArrayStrings(node.sameAs, CANONICAL_SAME_AS)) {
        node.sameAs = [...CANONICAL_SAME_AS];
        counts.personSameAsUpdated++;
        blockChanged = true;
      }

      if (isOrgTarget && hasGraph) {
        const worksForOk =
          node.worksFor &&
          typeof node.worksFor === 'object' &&
          node.worksFor['@id'] === ORG_ID;
        if (!worksForOk) {
          node.worksFor = { '@id': ORG_ID };
          counts.worksForUpdated++;
          blockChanged = true;
        }
      }
    });

    if (blockChanged) {
      const replacement = formatJsonPreservingWrapper(rawScript, data, eol);
      // Sanity check that the replacement still parses as valid JSON
      JSON.parse(replacement);
      edits.push({ start, end, replacement });
    }
  });

  const updatedHtml = edits.length > 0 ? applyEdits(rawHtml, edits) : rawHtml;
  return {
    updatedHtml,
    changed: edits.length > 0 && updatedHtml !== rawHtml,
    counts,
    visibleAuthorHits,
    missingGraphNote: isOrgTarget && !foundGraphInOrgTarget,
    parseWarnings
  };
}

function runEntityConsistency(rootDir, { dryRun = false, quiet = false } = {}) {
  const htmlFiles = walkHtmlFiles(rootDir);
  const modifiedFiles = [];
  const visibleReports = [];
  const missingGraphNotes = [];
  const parseWarnings = [];

  const totals = {
    scannedFiles: htmlFiles.length,
    jsonLdBlocks: 0,
    modifiedFiles: 0,
    descriptionUpdated: 0,
    personIdUpdated: 0,
    personNameUpdated: 0,
    personSameAsUpdated: 0,
    orgAdded: 0,
    worksForUpdated: 0
  };

  for (const filePath of htmlFiles) {
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
    const rawHtml = fs.readFileSync(filePath, 'utf8');
    const res = processHtmlEntityConsistency(rawHtml, relPath);

    totals.jsonLdBlocks += res.counts.jsonLdBlocks;
    totals.descriptionUpdated += res.counts.descriptionUpdated;
    totals.personIdUpdated += res.counts.personIdUpdated;
    totals.personNameUpdated += res.counts.personNameUpdated;
    totals.personSameAsUpdated += res.counts.personSameAsUpdated;
    totals.orgAdded += res.counts.orgAdded;
    totals.worksForUpdated += res.counts.worksForUpdated;

    if (res.changed) {
      totals.modifiedFiles++;
      modifiedFiles.push({ file: relPath, counts: res.counts });
      if (!dryRun) {
        fs.writeFileSync(filePath, res.updatedHtml, 'utf8');
      }
    }

    if (res.visibleAuthorHits.length > 0) {
      visibleReports.push({ file: relPath, hits: res.visibleAuthorHits });
    }
    if (res.missingGraphNote) {
      missingGraphNotes.push(relPath);
    }
    for (const w of res.parseWarnings) {
      parseWarnings.push(`${relPath}: ${w}`);
    }
  }

  if (!quiet) {
    console.log('====================================================');
    console.log(' JSON-LD Entity Consistency & Author Audit');
    console.log(` Mode: ${dryRun ? 'DRY-RUN (no files written)' : 'LIVE (writing changes)'}`);
    console.log('====================================================');
    console.log(`Scanned HTML files          : ${totals.scannedFiles}`);
    console.log(`Total JSON-LD blocks checked: ${totals.jsonLdBlocks}`);
    console.log(`Files modified              : ${totals.modifiedFiles}`);
    console.log(` - Person description updated (25+ yrs): ${totals.descriptionUpdated}`);
    console.log(` - Person @id set/fixed                : ${totals.personIdUpdated}`);
    console.log(` - Person name set/fixed               : ${totals.personNameUpdated}`);
    console.log(` - Person sameAs normalized            : ${totals.personSameAsUpdated}`);
    console.log(` - Organization nodes added            : ${totals.orgAdded}`);
    console.log(` - Person worksFor linked              : ${totals.worksForUpdated}`);
    if (missingGraphNotes.length > 0) {
      console.log(`\n[NOTE] No existing @graph found in: ${missingGraphNotes.join(', ')}`);
    }
    if (parseWarnings.length > 0) {
      console.log('\n[WARN] JSON-LD parse errors:');
      for (const w of parseWarnings) console.log(' - ' + w);
    }
    console.log(`\nVisible <body> text using "A Sharma" / "A. Sharma" (report only): ${visibleReports.length} file(s)`);
    for (const r of visibleReports) {
      for (const h of r.hits) {
        console.log(` - ${r.file}: "${h.match}" in "...${h.snippet}..."`);
      }
    }
  }

  return { totals, modifiedFiles, visibleReports, missingGraphNotes, parseWarnings };
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  runEntityConsistency(process.cwd(), { dryRun });
}

module.exports = {
  PERSON_ID,
  ORG_ID,
  CANONICAL_NAME,
  CANONICAL_SAME_AS,
  CANONICAL_DESCRIPTION,
  findVisibleShortAuthorText,
  processHtmlEntityConsistency,
  runEntityConsistency
};

