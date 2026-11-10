#!/usr/bin/env node

/**
 * fix-duplicate-related.js
 *
 * Removes duplicate old related-tools sections while keeping the new related-tools-section,
 * removes inline <style> blocks for .related-tools-section, and appends the CSS rules
 * to styles.css (idempotently).
 *
 * Requirements:
 * 1. Uses cheerio to parse and check HTML safely.
 * 2. Scans all .html files.
 * 3. For each file, checks if BOTH exist:
 *    a. A <section> containing the comment <!-- Related Tools Section (Auto-generated) --> OR containing .silo-card links
 *    b. A <section class='related-tools-section'>
 *    If BOTH exist: removes the OLD section (the one with silo-card links) and keeps the NEW section.
 *    If only the OLD section exists: keeps it untouched.
 * 4. Removes orphaned <style> blocks injected inline for .related-tools-section.
 * 5. Appends the CSS rules to styles.css (only once, idempotently).
 * 6. Supports --dry-run flag.
 * 7. Safety: Does NOT touch any <script> tags, MathJax, or calculation logic.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const isDryRun = process.argv.includes('--dry-run');

const RELATED_CSS_RULES = `
/* --- Related Engineering Tools Section --- */
.related-tools-section {
    padding: 50px 0;
    background: var(--bg, #f8fafc);
    border-top: 1px solid var(--border, #e2e8f0);
    transition: background-color 0.3s;
}

.related-tools-title {
    text-align: center;
    font-size: 1.8rem;
    margin-bottom: 10px;
    color: var(--heading, #1e293b);
    font-family: 'Montserrat', sans-serif;
    font-weight: 700;
}

.related-tools-subtitle {
    text-align: center;
    max-width: 650px;
    margin: 0 auto 35px auto;
    color: var(--text, #64748b);
    font-size: 0.95rem;
    line-height: 1.6;
}

.related-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
    margin-top: 25px;
}

.related-card {
    background: var(--card, #ffffff);
    border: 1px solid var(--border, #e2e8f0);
    border-radius: 12px;
    padding: 24px;
    text-decoration: none;
    color: inherit;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.related-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.08);
    border-color: var(--secondary, #2563eb);
}

.related-card h3 {
    margin: 0 0 10px 0;
    font-size: 1.15rem;
    color: var(--heading, #1e293b);
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
}

.related-card h3 i {
    color: var(--secondary, #2563eb);
    font-size: 1.2rem;
}

.related-card p {
    margin: 0 0 15px 0;
    font-size: 0.875rem;
    color: var(--text, #64748b);
    line-height: 1.5;
    flex-grow: 1;
}

.related-card .action-link {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--secondary, #2563eb);
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: auto;
}

.related-card .action-link i {
    transition: transform 0.2s;
}

.related-card:hover .action-link i {
    transform: translateX(4px);
}

@media (max-width: 768px) {
    .related-grid {
        grid-template-columns: 1fr;
    }
}
`;

// Regex matching the inline <style> block injected for .related-tools-section
const INLINE_STYLE_REGEX = /(?:[ \t]*<!--\s*Related Engineering Tools Section\s*-->\s*)?<style>\s*\.related-tools-section\s*\{[\s\S]*?<\/style>\s*/i;

/**
 * Updates styles.css idempotently
 */
function updateStylesCss(rootDir) {
  const cssPath = path.join(rootDir, 'styles.css');
  if (!fs.existsSync(cssPath)) {
    console.warn(`[WARN] styles.css not found at ${cssPath}`);
    return false;
  }

  const existingCss = fs.readFileSync(cssPath, 'utf8');
  if (existingCss.includes('.related-tools-section')) {
    console.log('[CSS] styles.css already contains .related-tools-section rules (skipped).');
    return false;
  }

  if (isDryRun) {
    console.log('[DRY-RUN] [CSS] Would append .related-tools-section rules to styles.css.');
    return true;
  }

  fs.appendFileSync(cssPath, '\n' + RELATED_CSS_RULES.trim() + '\n', 'utf8');
  console.log('[CSS] Successfully appended .related-tools-section rules to styles.css.');
  return true;
}

/**
 * Finds the exact [start, end] byte range of the old related section in rawHtml
 */
function findOldSectionRange(rawHtml, heading) {
  const autoCommentStr = '<!-- Related Tools Section (Auto-generated) -->';
  const commentIdx = rawHtml.indexOf(autoCommentStr);

  if (commentIdx !== -1) {
    const sectionStart = rawHtml.indexOf('<section', commentIdx);
    if (sectionStart !== -1 && sectionStart - commentIdx < 200) {
      const sectionEnd = rawHtml.indexOf('</section>', sectionStart);
      if (sectionEnd !== -1) {
        let end = sectionEnd + '</section>'.length;
        // Also consume trailing whitespace/newline
        while (end < rawHtml.length && (rawHtml[end] === ' ' || rawHtml[end] === '\t' || rawHtml[end] === '\r' || rawHtml[end] === '\n')) {
          end++;
        }
        return { start: commentIdx, end };
      }
    }
  }

  if (heading) {
    const headingIdx = rawHtml.indexOf(heading);
    if (headingIdx !== -1) {
      const sectionStart = rawHtml.lastIndexOf('<section', headingIdx);
      if (sectionStart !== -1) {
        const sectionEnd = rawHtml.indexOf('</section>', headingIdx);
        if (sectionEnd !== -1) {
          let start = sectionStart;
          // Check for preceding comment (e.g. <!-- Related Engineering ... -->)
          const beforeSnippet = rawHtml.slice(Math.max(0, sectionStart - 120), sectionStart);
          const m = beforeSnippet.match(/(<!--[^-]*-->\s*)$/);
          if (m && m[1].toLowerCase().includes('related')) {
            start = sectionStart - m[1].length;
          }
          let end = sectionEnd + '</section>'.length;
          while (end < rawHtml.length && (rawHtml[end] === ' ' || rawHtml[end] === '\t' || rawHtml[end] === '\r' || rawHtml[end] === '\n')) {
            end++;
          }
          return { start, end };
        }
      }
    }
  }

  return null;
}

function run() {
  const rootDir = process.cwd();

  console.log('====================================================');
  console.log(' Duplicate Related Tools Section Fixer');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Simulating changes)' : 'LIVE (Applying changes)'}`);
  console.log(` Working Directory: ${rootDir}`);
  console.log('====================================================\n');

  // Step 1: Update styles.css
  updateStylesCss(rootDir);
  console.log('');

  const files = fs.readdirSync(rootDir)
    .filter(f => f.endsWith('.html') && fs.statSync(path.join(rootDir, f)).isFile())
    .sort();

  const summary = {
    totalScanned: files.length,
    bothFound: 0,
    oldSectionsRemoved: 0,
    onlyOldKept: 0,
    onlyNewFound: 0,
    neitherFound: 0,
    inlineStylesRemoved: 0,
    errors: 0
  };

  for (const file of files) {
    const filePath = path.join(rootDir, file);

    try {
      let rawHtml = fs.readFileSync(filePath, 'utf8');
      const $ = cheerio.load(rawHtml);

      // Check b: <section class='related-tools-section'>
      const hasNewSection = $('section.related-tools-section').length > 0;

      // Check a: <section> containing comment <!-- Related Tools Section (Auto-generated) --> OR containing .silo-card links
      const oldSectionCandidates = [];

      $('section').each((idx, el) => {
        if ($(el).hasClass('related-tools-section')) return;

        const html = $(el).html();
        const hasAutoCommentInside = html.includes('Related Tools Section (Auto-generated)');

        let prevHasAutoComment = false;
        let prev = el.prev;
        while (prev) {
          if (prev.type === 'comment' && prev.data && prev.data.includes('Related Tools Section (Auto-generated)')) {
            prevHasAutoComment = true;
            break;
          }
          if (prev.type === 'tag') break;
          prev = prev.prev;
        }

        const siloLinks = $(el).find('a.silo-card, a[class*="silo-card"], .silo-card');
        const hasSiloLinks = siloLinks.length > 0;

        // Skip category catalog directories on hub pages (which have > 10 cards)
        if (siloLinks.length > 10) return;

        if (hasAutoCommentInside || prevHasAutoComment || hasSiloLinks) {
          const heading = $(el).find('h1, h2, h3, h4').first().text().trim();
          oldSectionCandidates.push({
            el,
            heading,
            hasAuto: hasAutoCommentInside || prevHasAutoComment,
            siloCount: siloLinks.length
          });
        }
      });

      const hasOldSection = oldSectionCandidates.length > 0;
      let modified = false;

      // Check inline style block
      const hasInlineStyle = INLINE_STYLE_REGEX.test(rawHtml);

      // Logic:
      // If BOTH exist: remove OLD section and keep NEW section
      // If only OLD exists: keep it (do not remove)
      if (hasNewSection && hasOldSection) {
        summary.bothFound++;

        for (const oldSec of oldSectionCandidates) {
          const range = findOldSectionRange(rawHtml, oldSec.heading);
          if (range) {
            const removedText = rawHtml.slice(range.start, range.end);
            // Verify safety: must not contain the new related-tools-section
            if (removedText.includes('class="related-tools-section"')) {
              console.error(`[ERROR] Safety guard triggered for ${file}: old section range overlapped new section!`);
              summary.errors++;
              continue;
            }

            rawHtml = rawHtml.slice(0, range.start) + rawHtml.slice(range.end);
            modified = true;
            summary.oldSectionsRemoved++;

            if (isDryRun) {
              console.log(`[DRY-RUN] [REMOVE OLD] ${file} -> Removed old section: "${oldSec.heading}"`);
            } else {
              console.log(`[REMOVE OLD] ${file} -> Removed old section: "${oldSec.heading}"`);
            }
          } else {
            console.warn(`[WARN] Could not find byte range for old section in ${file} (Heading: "${oldSec.heading}")`);
          }
        }
      } else if (hasOldSection && !hasNewSection) {
        summary.onlyOldKept++;
        console.log(`[KEEP OLD] ${file} -> Only old section exists, keeping untouched.`);
      } else if (hasNewSection && !hasOldSection) {
        summary.onlyNewFound++;
      } else {
        summary.neitherFound++;
      }

      // Remove orphaned inline <style> block if present
      if (hasInlineStyle) {
        rawHtml = rawHtml.replace(INLINE_STYLE_REGEX, '');
        modified = true;
        summary.inlineStylesRemoved++;

        if (isDryRun) {
          console.log(`[DRY-RUN] [REMOVE STYLE] ${file} -> Removed inline <style> block for .related-tools-section`);
        } else {
          console.log(`[REMOVE STYLE] ${file} -> Removed inline <style> block for .related-tools-section`);
        }
      }

      // Write changes if not dry-run and file was modified
      if (!isDryRun && modified) {
        fs.writeFileSync(filePath, rawHtml, 'utf8');
      }
    } catch (err) {
      console.error(`[ERROR] Processing ${file}:`, err.message);
      summary.errors++;
    }
  }

  console.log('\n====================================================');
  console.log(' Execution Summary');
  console.log('====================================================');
  console.log(`Total HTML files scanned:             ${summary.totalScanned}`);
  console.log(`Files with BOTH sections:             ${summary.bothFound}`);
  console.log(`Old sections removed:                 ${summary.oldSectionsRemoved}`);
  console.log(`Files with ONLY old section (kept):   ${summary.onlyOldKept}`);
  console.log(`Files with ONLY new section:          ${summary.onlyNewFound}`);
  console.log(`Files with NEITHER section:           ${summary.neitherFound}`);
  console.log(`Inline <style> blocks removed:        ${summary.inlineStylesRemoved}`);
  console.log(`Errors encountered:                   ${summary.errors}`);
  console.log('====================================================\n');
}

run();

