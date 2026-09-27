#!/usr/bin/env python3
"""
Dependency-free SEO Migration & Canonical Injection Script
1. Rewrites hrefs matching any variant of the 6 redirected slugs across all .html files.
2. Injects a self-referencing canonical tag before </head> for any .html file missing one.
3. Preserves UTF-8 encoding without modifying calculator logic or inline scripts.
4. Idempotent: safe to run multiple times.
"""

import glob
import os
import re
import sys

# Ensure UTF-8 output on Windows
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

SLUG_MAP = {
    'indexele': 'electrical-calculators',
    'indexinst': 'instrumentation-calculators',
    'indexmech': 'mechanical-calculators',
    'thermowellwakefreq': 'thermowell-wake',
    'reynoldsnumbercal': 'reynolds-number',
    'articlegroundingdesign': 'ieee-80-substation-grounding-design-step-touch-potential'
}

def rewrite_slug_href(url):
    """
    Check if URL matches any of the 6 slugs in any variant (with/without .html, relative/absolute).
    Returns (new_url, matched)
    """
    for old_slug, new_slug in SLUG_MAP.items():
        pattern = rf'^(https?://designcalculators\.co\.in)?(\.?/)?({re.escape(old_slug)})(?:\.html)?([?#].*)?$'
        match = re.match(pattern, url, re.IGNORECASE)
        if match:
            domain = match.group(1) or ''
            prefix = match.group(2) or ''
            suffix = match.group(4) or ''

            if domain:
                new_url = f"{domain}/{new_slug}{suffix}"
            elif prefix.startswith('./'):
                new_url = f"./{new_slug}{suffix}"
            else:
                new_url = f"/{new_slug}{suffix}"

            return new_url, True
    return url, False

def process_html_file(file_path):
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    links_rewritten_in_file = 0
    rewritten_details = []

    def href_repl(m):
        nonlocal links_rewritten_in_file
        quote = m.group(1)
        original_url = m.group(2)
        new_url, changed = rewrite_slug_href(original_url)
        if changed:
            links_rewritten_in_file += 1
            rewritten_details.append((original_url, new_url))
            return f'href={quote}{new_url}{quote}'
        return m.group(0)

    # 1. Rewrite hrefs
    new_content = re.sub(r'href=(["\'])(.*?)\1', href_repl, content, flags=re.IGNORECASE)

    # 2. Check canonical
    has_canonical = bool(
        re.search(r'<link\s+[^>]*rel=["\']canonical["\']', new_content, re.IGNORECASE) or
        re.search(r'<link\s+[^>]*href=[^>]+rel=["\']canonical["\']', new_content, re.IGNORECASE)
    )

    canonical_added = False
    if not has_canonical:
        # Determine path
        stem = os.path.splitext(os.path.basename(file_path))[0].lower()
        if stem == 'index':
            canonical_url = 'https://designcalculators.co.in/'
        else:
            canonical_url = f'https://designcalculators.co.in/{stem}'

        canonical_tag = f'    <link rel="canonical" href="{canonical_url}">\n'
        # Insert before </head>
        head_match = re.search(r'(</head>)', new_content, re.IGNORECASE)
        if head_match:
            idx = head_match.start(1)
            new_content = new_content[:idx] + canonical_tag + new_content[idx:]
            canonical_added = True

    # 3. Write back if modified
    if links_rewritten_in_file > 0 or canonical_added:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

    return links_rewritten_in_file, canonical_added, rewritten_details

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pattern = os.path.join(base_dir, '*.html')
    html_files = sorted(glob.glob(pattern))

    total_scanned = len(html_files)
    total_links_rewritten = 0
    total_canonicals_added = 0
    files_with_changes = 0

    print(f"Scanning {total_scanned} HTML files in {base_dir}...")

    for file_path in html_files:
        links_count, canonical_added, details = process_html_file(file_path)
        if links_count > 0 or canonical_added:
            files_with_changes += 1
            total_links_rewritten += links_count
            if canonical_added:
                total_canonicals_added += 1

    print("\n--- Summary ---")
    print(f"Files scanned:       {total_scanned}")
    print(f"Files modified:      {files_with_changes}")
    print(f"Links rewritten:     {total_links_rewritten}")
    print(f"Canonicals added:    {total_canonicals_added}")

if __name__ == '__main__':
    main()
