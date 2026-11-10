#!/usr/bin/env node

/**
 * inject-related-tools.js
 *
 * Implements a 'Related Engineering Tools' section across calculator and article pages
 * to boost dwell time and internal linking.
 *
 * Requirements:
 * 1. Reads related-tools-map.json (mapping filename -> [3 related filenames]).
 * 2. Uses cheerio to inspect and extract metadata safely.
 * 3. Idempotency: Checks if <section class='related-tools-section'> already exists; if yes, skips.
 * 4. Extracts <title>, <meta name="description">, and icon from each related file to create cards.
 * 5. Injects the HTML block immediately before the <footer> tag.
 * 6. Safety: Only injects immediately before <footer> without touching calculator logic or other DOM.
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
 * Clean title of site suffixes and trailing artifacts
 */
function cleanToolTitle(rawTitle, fallbackSlug) {
  if (!rawTitle) return fallbackSlug || 'Engineering Tool';

  let clean = rawTitle
    .replace(/\s*\|\s*Design\s*Calculators.*$/i, '')
    .replace(/\s*\|\s*Engineering\s*Calculators.*$/i, '')
    .replace(/\s*-\s*Free\s*Online.*$/i, '')
    .replace(/\s*\|\s*Calculators.*$/i, '')
    .replace(/\s*-\s*Design\s*Calculators.*$/i, '')
    .trim();

  // Balance unclosed parentheses if any
  const openCount = (clean.match(/\(/g) || []).length;
  const closeCount = (clean.match(/\)/g) || []).length;
  if (openCount > closeCount) {
    clean += ')';
  }

  return clean || fallbackSlug;
}

/**
 * Load tool icon map from tools_data.js and tools_db.js
 */
function loadIconMap(rootDir) {
  const iconMap = {};
  
  // Try tools_data.js
  const toolsDataPath = path.join(rootDir, 'tools_data.js');
  if (fs.existsSync(toolsDataPath)) {
    try {
      const content = fs.readFileSync(toolsDataPath, 'utf8');
      const tempEnv = {};
      eval(content.replace('const allTools', 'tempEnv.allTools'));
      if (tempEnv.allTools && Array.isArray(tempEnv.allTools)) {
        tempEnv.allTools.forEach(t => {
          if (t.href) {
            const slug = t.href.replace(/^\//, '').replace(/\.html$/, '');
            if (t.icon) iconMap[slug] = t.icon;
          }
        });
      }
    } catch (e) {
      // Ignore parse error
    }
  }

  // Try tools_db.js
  const toolsDbPath = path.join(rootDir, 'tools_db.js');
  if (fs.existsSync(toolsDbPath)) {
    try {
      const content = fs.readFileSync(toolsDbPath, 'utf8');
      const tempWindow = {};
      const runContext = (new Function('window', content));
      runContext(tempWindow);
      if (tempWindow.TOOLS_DB && Array.isArray(tempWindow.TOOLS_DB)) {
        tempWindow.TOOLS_DB.forEach(t => {
          if (t.href) {
            const slug = t.href.replace(/^\//, '').replace(/\.html$/, '');
            if (t.icon && !iconMap[slug]) iconMap[slug] = t.icon;
          }
        });
      }
    } catch (e) {
      // Ignore parse error
    }
  }

  return iconMap;
}

/**
 * Pre-cache metadata for all target files to ensure fast, safe execution
 */
function buildTargetMetadataCache(rootDir, targetsSet, iconMap) {
  const cache = {};

  for (const filename of targetsSet) {
    const filePath = path.join(rootDir, filename);
    const slug = filename.replace(/\.html$/, '');

    if (!fs.existsSync(filePath)) {
      cache[filename] = {
        title: slug,
        desc: 'Professional engineering calculator for design, analysis, and verification.',
        icon: iconMap[slug] || 'fas fa-calculator',
        slug: slug
      };
      continue;
    }

    try {
      const rawHtml = fs.readFileSync(filePath, 'utf8');
      const $ = cheerio.load(rawHtml);

      const rawTitle = cleanText($('title').text());
      const title = cleanToolTitle(rawTitle, slug);

      let desc = cleanText($('meta[name="description"]').attr('content')) ||
                 cleanText($('meta[property="og:description"]').attr('content')) || '';

      if (!desc) {
        desc = `Interactive engineering calculator for ${title}. Perform standards-compliant technical design calculations.`;
      } else if (desc.length > 150) {
        desc = desc.slice(0, 147) + '...';
      }

      const icon = iconMap[slug] || 'fas fa-calculator';

      cache[filename] = {
        title,
        desc,
        icon,
        slug
      };
    } catch (err) {
      cache[filename] = {
        title: slug,
        desc: 'Professional engineering calculation and design tool.',
        icon: iconMap[slug] || 'fas fa-calculator',
        slug: slug
      };
    }
  }

  return cache;
}

/**
 * Construct the Related Tools HTML block
 */
function createRelatedToolsBlock(relatedFiles, metadataCache) {
  const cardsHtml = relatedFiles.map(filename => {
    const meta = metadataCache[filename] || {
      title: filename.replace(/\.html$/, ''),
      desc: 'Professional engineering design calculator.',
      icon: 'fas fa-calculator',
      slug: filename.replace(/\.html$/, '')
    };

    return `                <a href="/${escapeHtml(meta.slug)}" class="related-card">
                    <h3><i class="${escapeHtml(meta.icon)}"></i> ${escapeHtml(meta.title)}</h3>
                    <p>${escapeHtml(meta.desc)}</p>
                    <div class="action-link">Open Calculator <i class="fas fa-arrow-right"></i></div>
                </a>`;
  }).join('\n');

  return `    <!-- Related Engineering Tools Section -->
    <style>
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
    </style>
    <section class="related-tools-section">
        <div class="container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
            <h2 class="related-tools-title">Related Engineering Tools</h2>
            <p class="related-tools-subtitle">Explore complementary engineering calculators to streamline your design verification and calculations.</p>
            <div class="related-grid">
${cardsHtml}
            </div>
        </div>
    </section>
    
`;
}

/**
 * Inject the block immediately before the <footer> tag in the raw HTML string
 */
function injectBeforeFooter(rawHtml, block) {
  const footerRegex = /<footer[\s>]/i;
  const match = rawHtml.match(footerRegex);
  if (!match) {
    throw new Error('No <footer> tag found in file');
  }
  const index = match.index;
  return rawHtml.slice(0, index) + block + rawHtml.slice(index);
}

function run() {
  const rootDir = process.cwd();
  const mapFile = path.join(rootDir, 'related-tools-map.json');

  console.log('====================================================');
  console.log(' Related Engineering Tools Injector');
  console.log(` Mode: ${isDryRun ? 'DRY-RUN (Simulating changes)' : 'LIVE (Applying changes)'}`);
  console.log(` Working Directory: ${rootDir}`);
  console.log(` Map File: ${mapFile}`);
  console.log('====================================================\n');

  if (!fs.existsSync(mapFile)) {
    console.error(`[ERROR] Map file "${mapFile}" not found! Run generate-related-tools-map.js first.`);
    process.exit(1);
  }

  const relatedMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
  const totalEntries = Object.keys(relatedMap).length;
  console.log(`Loaded ${totalEntries} page mappings from ${path.basename(mapFile)}.`);

  // Collect all unique target files to build cache
  const targetsSet = new Set();
  for (const targets of Object.values(relatedMap)) {
    if (Array.isArray(targets)) {
      targets.forEach(t => targetsSet.add(t));
    }
  }

  console.log(`Pre-caching metadata for ${targetsSet.size} unique target calculator files...`);
  const iconMap = loadIconMap(rootDir);
  const metadataCache = buildTargetMetadataCache(rootDir, targetsSet, iconMap);
  console.log('Metadata cache loaded successfully.\n');

  const summary = {
    totalMapped: totalEntries,
    alreadyHasSection: 0,
    injected: 0,
    fileNotFound: 0,
    missingFooter: 0,
    errors: 0
  };

  for (const [filename, relatedFiles] of Object.entries(relatedMap)) {
    const filePath = path.join(rootDir, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`[WARN] Source file "${filename}" not found on disk, skipping.`);
      summary.fileNotFound++;
      continue;
    }

    try {
      const rawHtml = fs.readFileSync(filePath, 'utf8');

      // Check if .related-tools-section already exists
      const $ = cheerio.load(rawHtml);
      const hasSectionInCheerio = $('.related-tools-section').length > 0;
      const hasSectionInRaw = /class=["'][^"']*related-tools-section[^"']*["']/i.test(rawHtml);

      if (hasSectionInCheerio || hasSectionInRaw) {
        summary.alreadyHasSection++;
        continue;
      }

      // Check for <footer> tag
      if (!/<footer[\s>]/i.test(rawHtml)) {
        console.warn(`[WARN] ${filename}: No <footer> tag found, skipping.`);
        summary.missingFooter++;
        continue;
      }

      // Generate HTML block
      const sectionHtml = createRelatedToolsBlock(relatedFiles, metadataCache);

      if (isDryRun) {
        console.log(`[DRY-RUN INJECT] ${filename}`);
        console.log(`  Related Tools (${relatedFiles.length}):`);
        relatedFiles.forEach((rf, idx) => {
          const meta = metadataCache[rf] || {};
          console.log(`    ${idx + 1}. [${meta.title || rf}] -> /${meta.slug || rf} (Icon: ${meta.icon || 'default'})`);
        });
        console.log('  Target position: Immediately before <footer>\n');
      } else {
        const updatedHtml = injectBeforeFooter(rawHtml, sectionHtml);
        fs.writeFileSync(filePath, updatedHtml, 'utf8');
        console.log(`[INJECTED] ${filename} -> Added ${relatedFiles.length} related tool cards`);
      }

      summary.injected++;
    } catch (err) {
      console.error(`[ERROR] Processing ${filename}:`, err.message);
      summary.errors++;
    }
  }

  console.log('\n====================================================');
  console.log(' Execution Summary');
  console.log('====================================================');
  console.log(`Total files in map:                 ${summary.totalMapped}`);
  console.log(`Already had related-tools-section:  ${summary.alreadyHasSection} (skipped for idempotency)`);
  console.log(`Related-tools-section injected:     ${summary.injected}`);
  console.log(`Files not found on disk:            ${summary.fileNotFound}`);
  console.log(`Files missing footer:               ${summary.missingFooter}`);
  console.log(`Errors encountered:                 ${summary.errors}`);
  console.log('====================================================\n');
}

run();

