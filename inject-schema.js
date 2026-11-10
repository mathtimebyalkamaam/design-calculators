#!/usr/bin/env node

/**
 * inject-schema.js
 *
 * Safely injects JSON-LD Schema into HTML files in the root directory.
 *
 * Requirements:
 * 1. Uses the cheerio library to parse the HTML safely (preserves MathJax/CSS).
 * 2. Scans all .html files in the root directory.
 * 3. Identifies File Type by checking if filename starts with 'article' (case-insensitive):
 *    - If Article:
 *        Injects Article schema block into <head> with author 'Anil Sharma' and <title> as headline.
 *    - If Calculator (Not Article):
 *        a. ALWAYS injects a SoftwareApplication schema block into <head>
 *           - name: extracted from <title>
 *           - applicationCategory: "EngineeringApplication"
 *           - operatingSystem: "Browser"
 *           - offers: { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
 *        b. IF .faq-question elements are found, ALSO injects FAQPage schema.
 *        c. IF no FAQs are found, STILL injects SoftwareApplication schema.
 * 4. Idempotency: Checks if SoftwareApplication, Article, or FAQPage schema already exists before injecting.
 * 5. Safety Rule: Only modifies <head> (injects immediately before </head>). <body> and scripts are untouched.
 * 6. Console Output: Reports "SoftwareApplication schemas injected" separately from "FAQPage schemas injected".
 * 7. CLI flags: Supports --dry-run and --force.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// CLI Flags
const isDryRun = process.argv.includes('--dry-run');
const isForce = process.argv.includes('--force');

/**
 * Normalize whitespace in extracted text
 */
function cleanText(text) {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Check if the document already contains a schema of the given @type.
 * Inspects all ld+json script tags (direct @type and inside @graph array).
 */
function hasExistingSchema($, targetType) {
  let exists = false;

  $('script[type="application/ld+json"]').each((_, el) => {
    const rawContent = $(el).text();
    try {
      const parsed = JSON.parse(rawContent);
      if (parsed['@type'] === targetType) {
        exists = true;
      } else if (Array.isArray(parsed['@graph'])) {
        if (parsed['@graph'].some(item => item && item['@type'] === targetType)) {
          exists = true;
        }
      }
    } catch {
      // Substring fallback in case of unescaped/template strings
      if (rawContent.includes(`"@type": "${targetType}"`) || rawContent.includes(`"@type":"${targetType}"`)) {
        exists = true;
      }
    }
  });

  return exists;
}

/**
 * Extract FAQ pairs from .faq-question and corresponding answers using cheerio
 */
function extractFaqs($, rootHtml) {
  const questionElements = $('.faq-question');
  if (questionElements.length === 0) return [];

  const allAnswers = $('.faq-answer');
  const faqs = [];

  questionElements.each((index, el) => {
    const $q = $(el);
    const questionText = cleanText($q.text());
    if (!questionText) return;

    let answerText = '';

    // Strategy 1: Immediate next sibling with class .faq-answer
    const nextAns = $q.next('.faq-answer');
    if (nextAns.length) {
      answerText = cleanText(nextAns.text());
    }

    // Strategy 2: Sibling within common wrapper (e.g. .faq-item)
    if (!answerText) {
      const containerAns = $q.closest('.faq-item').find('.faq-answer');
      if (containerAns.length) {
        answerText = cleanText(containerAns.text());
      }
    }

    // Strategy 3: General sibling with class .faq-answer
    if (!answerText) {
      const siblingAns = $q.siblings('.faq-answer');
      if (siblingAns.length) {
        answerText = cleanText(siblingAns.text());
      }
    }

    // Strategy 4: By element index in document
    if (!answerText && allAnswers.length > index) {
      answerText = cleanText(allAnswers.eq(index).text());
    }

    // Strategy 5: Sibling <div> or <p> (for non-standard FAQ items without .faq-answer class)
    if (!answerText) {
      const nextDiv = $q.next('div, p');
      if (nextDiv.length) {
        answerText = cleanText(nextDiv.text());
      }
    }

    if (questionText && answerText) {
      faqs.push({
        "@type": "Question",
        "name": questionText,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": answerText
        }
      });
    }
  });

  return faqs;
}

/**
 * Format a JSON-LD schema object into an indented <script> tag
 */
function createSchemaTag(schemaObject) {
  const jsonString = JSON.stringify(schemaObject, null, 2);
  const indentedJson = jsonString
    .split('\n')
    .map(line => '    ' + line)
    .join('\n');

  return `<!-- Auto-generated JSON-LD Schema by inject-schema.js -->\n    <script type="application/ld+json">\n${indentedJson}\n    </script>\n`;
}

/**
 * Safely injects script block(s) right before </head>.
 * This ensures ONLY the <head> is modified, and the <body> (including calculation scripts)
 * is 100% untouched byte-for-byte.
 */
function injectIntoHead(originalHtml, scriptBlocks) {
  const headCloseRegex = /<\/head>/i;
  const match = originalHtml.match(headCloseRegex);
  if (!match) {
    throw new Error('No </head> tag found in HTML');
  }
  const insertIndex = match.index;
  return originalHtml.slice(0, insertIndex) + '    ' + scriptBlocks + originalHtml.slice(insertIndex);
}

function run() {
  const rootDir = process.cwd();
  console.log('====================================================');
  console.log(' JSON-LD Schema Injector (cheerio-powered)');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Simulating changes)' : 'LIVE (Applying changes)'}`);
  console.log(` Working Directory: ${rootDir}`);
  console.log('====================================================\n');

  const files = fs.readdirSync(rootDir)
    .filter(file => file.endsWith('.html') && fs.statSync(path.join(rootDir, file)).isFile())
    .sort();

  const summary = {
    totalScanned: files.length,
    articlesInjected: 0,
    softwareAppsInjected: 0,
    faqsInjected: 0,
    skippedArticleAlreadyPresent: 0,
    skippedAppAlreadyPresent: 0,
    skippedFaqAlreadyPresent: 0,
    errors: 0
  };

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    try {
      const rawHtml = fs.readFileSync(filePath, 'utf8');

      // 1. Parse HTML safely with cheerio
      const $ = cheerio.load(rawHtml);

      const isArticle = file.toLowerCase().startsWith('article');
      const pageTitle = cleanText($('title').text()) || path.basename(file, '.html');

      if (isArticle) {
        // --- Article Logic ---
        if (!isForce && hasExistingSchema($, 'Article')) {
          console.log(`[SKIP] ${file}: Article schema already present.`);
          summary.skippedArticleAlreadyPresent++;
          continue;
        }

        const articleSchema = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": pageTitle,
          "author": {
            "@type": "Person",
            "name": "Anil Sharma"
          }
        };

        const scriptTag = createSchemaTag(articleSchema);
        console.log(`[INJECT ARTICLE] ${file} -> Headline: "${pageTitle}"`);

        if (isDryRun) {
          console.log(`--- [Preview: ${file}] ---`);
          console.log(scriptTag.trim());
          console.log(`--------------------------\n`);
        } else {
          const updatedHtml = injectIntoHead(rawHtml, scriptTag);
          fs.writeFileSync(filePath, updatedHtml, 'utf8');
        }

        summary.articlesInjected++;

      } else {
        // --- Calculator (Not Article) Logic ---
        let blocksToInject = '';
        let injectApp = false;
        let injectFaq = false;

        // a. SoftwareApplication Schema: ALWAYS required for calculators
        const appAlreadyExists = hasExistingSchema($, 'SoftwareApplication');
        if (!isForce && appAlreadyExists) {
          summary.skippedAppAlreadyPresent++;
        } else {
          injectApp = true;
          const softwareAppSchema = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": pageTitle,
            "applicationCategory": "EngineeringApplication",
            "operatingSystem": "Browser",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            }
          };
          blocksToInject += createSchemaTag(softwareAppSchema);
        }

        // b. FAQPage Schema: If .faq-question elements exist
        const faqs = extractFaqs($, rawHtml);
        if (faqs.length > 0) {
          const faqAlreadyExists = hasExistingSchema($, 'FAQPage');
          if (!isForce && faqAlreadyExists) {
            summary.skippedFaqAlreadyPresent++;
          } else {
            injectFaq = true;
            const faqSchema = {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs
            };
            blocksToInject += createSchemaTag(faqSchema);
          }
        }

        // Report actions
        if (!injectApp && !injectFaq) {
          console.log(`[SKIP] ${file}: SoftwareApplication${faqs.length > 0 ? ' & FAQPage' : ''} schema already present.`);
          continue;
        }

        const actionParts = [];
        if (injectApp) actionParts.push('SoftwareApplication');
        if (injectFaq) actionParts.push(`FAQPage (${faqs.length} Q&As)`);
        console.log(`[INJECT CALCULATOR] ${file} -> ${actionParts.join(' + ')}`);

        if (isDryRun) {
          console.log(`--- [Preview: ${file} -> ${actionParts.join(' + ')}] ---`);
          console.log(blocksToInject.trim());
          console.log(`------------------------------------------------------\n`);
        } else {
          const updatedHtml = injectIntoHead(rawHtml, blocksToInject);
          fs.writeFileSync(filePath, updatedHtml, 'utf8');
        }

        if (injectApp) summary.softwareAppsInjected++;
        if (injectFaq) summary.faqsInjected++;
      }
    } catch (err) {
      console.error(`[ERROR] Processing ${file}:`, err.message);
      summary.errors++;
    }
  }

  console.log('\n====================================================');
  console.log(' Execution Summary');
  console.log('====================================================');
  console.log(`Total HTML files scanned:              ${summary.totalScanned}`);
  console.log(`Article schemas injected:              ${summary.articlesInjected}`);
  console.log(`SoftwareApplication schemas injected:  ${summary.softwareAppsInjected}`);
  console.log(`FAQPage schemas injected:              ${summary.faqsInjected}`);
  console.log(`SoftwareApplication already present:   ${summary.skippedAppAlreadyPresent}`);
  console.log(`FAQPage already present:               ${summary.skippedFaqAlreadyPresent}`);
  console.log(`Article already present:               ${summary.skippedArticleAlreadyPresent}`);
  console.log(`Errors:                                ${summary.errors}`);
  if (isDryRun) {
    console.log('\n[DRY-RUN] No files were modified. To execute changes, run:');
    console.log('node inject-schema.js');
  } else {
    console.log('\n[COMPLETED] Schema injection completed successfully.');
  }
  console.log('====================================================\n');
}

run();
