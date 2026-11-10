#!/usr/bin/env node

/**
 * inject-standard-faq.js
 *
 * Adds a standard 3-question engineering FAQ section to calculator pages
 * that are currently missing FAQs.
 *
 * Requirements:
 * 1. Uses cheerio to scan all .html files in the root directory.
 * 2. Identifies pages that do NOT contain any .faq-question elements.
 * 3. Constructs a standard FAQ HTML block with 3 questions:
 *    - 'Is this [Tool Name] calculator free to use?'
 *    - 'What engineering standards does this tool follow?'
 *    - 'Can I use these results for professional design?'
 * 4. Inserts this HTML block immediately before the <footer> tag.
 * 5. Customizes '[Tool Name]' using the page <title>.
 * 6. Safety: Inserts before <footer> without modifying any other content or calculator logic.
 * 7. Supports --dry-run flag to preview changes without modifying files.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const isDryRun = process.argv.includes('--dry-run');

/**
 * Clean and normalize text
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Extract clean tool name from <title>
 */
function extractToolName(rawTitle) {
  if (!rawTitle) return 'Design Calculator';

  // Extract primary name before pipes or dashes separating site branding
  let name = rawTitle.split('|')[0].trim();
  name = name.split(' - ')[0].trim();

  return name || 'Design Calculator';
}

/**
 * Construct the standard FAQ HTML block
 */
function createStandardFaqBlock(toolName) {
  const cleanNameForQuestion = toolName.replace(/\s+(calculator|calc)$/i, '');

  return `
    <!-- Standard Engineering FAQ Section -->
    <section class="faq-section" style="margin: 40px 0;">
        <div class="container">
            <div class="section-header" style="text-align: center; margin-bottom: 30px;">
                <h2>Frequently Asked Questions</h2>
                <p>Common questions about this engineering tool</p>
            </div>
            <div class="faq-list">
                <div class="faq-item">
                    <div class="faq-question">
                        <span>1. Is this ${escapeHtml(cleanNameForQuestion)} calculator free to use?</span>
                        <i class="fas fa-chevron-down faq-icon"></i>
                    </div>
                    <div class="faq-answer">
                        <p>Yes, the ${escapeHtml(toolName)} is 100% free to use online with no registration, subscription, or software installation required. You can run unlimited calculations directly in your browser.</p>
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">
                        <span>2. What engineering standards does this tool follow?</span>
                        <i class="fas fa-chevron-down faq-icon"></i>
                    </div>
                    <div class="faq-answer">
                        <p>This tool is developed following internationally recognized engineering codes and industrial standards (such as IEC, IEEE, ISA, ASME, and API where applicable). Formula implementations are verified against established engineering design practices.</p>
                    </div>
                </div>
                <div class="faq-item">
                    <div class="faq-question">
                        <span>3. Can I use these results for professional design?</span>
                        <i class="fas fa-chevron-down faq-icon"></i>
                    </div>
                    <div class="faq-answer">
                        <p>The calculations provided by the ${escapeHtml(toolName)} are intended for engineering estimation, preliminary design, and verification purposes. While formulas strictly adhere to published technical standards, final project designs for construction or safety-critical applications should always be reviewed and approved by a licensed professional engineer (PE).</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
`;
}

/**
 * Inserts the FAQ block immediately before the <footer> tag in the raw HTML string
 */
function injectBeforeFooter(rawHtml, faqBlock) {
  const footerRegex = /<footer[\s>]/i;
  const match = rawHtml.match(footerRegex);
  if (!match) {
    throw new Error('No <footer> tag found in file');
  }
  const index = match.index;
  return rawHtml.slice(0, index) + faqBlock + rawHtml.slice(index);
}

function run() {
  const rootDir = process.cwd();
  console.log('====================================================');
  console.log(' Standard Engineering FAQ Injector');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Simulating changes)' : 'LIVE (Applying changes)'}`);
  console.log(` Working Directory: ${rootDir}`);
  console.log('====================================================\n');

  const files = fs.readdirSync(rootDir)
    .filter(file => file.endsWith('.html') && fs.statSync(path.join(rootDir, file)).isFile())
    .sort();

  const summary = {
    totalScanned: files.length,
    articlesSkipped: 0,
    alreadyHasFaq: 0,
    faqsInjected: 0,
    errors: 0
  };

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    try {
      // Skip article files
      if (file.toLowerCase().startsWith('article')) {
        summary.articlesSkipped++;
        continue;
      }

      const rawHtml = fs.readFileSync(filePath, 'utf8');

      // Parse with cheerio to check for existing .faq-question elements
      const $ = cheerio.load(rawHtml);
      const existingFaqs = $('.faq-question');

      if (existingFaqs.length > 0) {
        summary.alreadyHasFaq++;
        continue;
      }

      // Check if page has footer
      if (!/<footer[\s>]/i.test(rawHtml)) {
        console.warn(`[WARN] ${file}: No <footer> tag found, skipping.`);
        continue;
      }

      const rawTitle = cleanText($('title').text());
      const toolName = extractToolName(rawTitle);
      const faqBlock = createStandardFaqBlock(toolName);

      console.log(`[INJECT FAQ] ${file} -> Tool Name: "${toolName}"`);

      if (isDryRun) {
        console.log(`--- [Preview for ${file}] ---`);
        console.log(`Tool Name: ${toolName}`);
        console.log(`Questions to inject:`);
        console.log(`  1. Is this ${toolName.replace(/\s+(calculator|calc)$/i, '')} calculator free to use?`);
        console.log(`  2. What engineering standards does this tool follow?`);
        console.log(`  3. Can I use these results for professional design?`);
        console.log(`Target: Inserted immediately before <footer ...>`);
        console.log(`------------------------------------\n`);
      } else {
        const updatedHtml = injectBeforeFooter(rawHtml, faqBlock);
        fs.writeFileSync(filePath, updatedHtml, 'utf8');
      }

      summary.faqsInjected++;
    } catch (err) {
      console.error(`[ERROR] Processing ${file}:`, err.message);
      summary.errors++;
    }
  }

  console.log('\n====================================================');
  console.log(' Execution Summary');
  console.log('====================================================');
  console.log(`Total HTML files scanned:           ${summary.totalScanned}`);
  console.log(`Calculator pages missing FAQs:      ${summary.faqsInjected}`);
  console.log(`Calculators already having FAQs:    ${summary.alreadyHasFaq}`);
  console.log(`Article files skipped:              ${summary.articlesSkipped}`);
  console.log(`Errors:                             ${summary.errors}`);
  if (isDryRun) {
    console.log('\n[DRY-RUN] No files were modified. To execute changes, run:');
    console.log('node inject-standard-faq.js');
  } else {
    console.log('\n[COMPLETED] Successfully injected standard FAQs into calculator pages.');
  }
  console.log('====================================================\n');
}

run();

