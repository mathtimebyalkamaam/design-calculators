#!/usr/bin/env python3
"""
Generate seo-config/inventory.json
Scans all .html files and creates an inventory with:
- file path
- current <title>
- meta description (or null)
- H1 text (or null)
- detected primary standard (IEEE/IEC/ASME/API/ISA/IS number, or null)
- whether a self-referencing <link rel="canonical"> exists
- exact repeated shared header and footer HTML strings
"""

import glob
import json
import os
import re
import sys
from collections import Counter

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PATTERNS = [
    # IEEE
    (r'\bIEEE\s+(?:Std\.?\s+)?\d+(?:[\.-]\d+)*(?:-\d+)?\b', re.IGNORECASE),
    # IEC
    (r'\bIEC\s+(?:Std\.?\s+)?\d+(?:[\.-]\d+)*(?:-\d+)?\b', re.IGNORECASE),
    # ASME: Section VIII, B31.3, PTC 19.3, etc.
    (r'\bASME\s+(?:(?:BPVC\s+)?(?:Section|Sec\.?)\s+)?(?:(?:VIII|IX|IV|I|B31\.[0-9]+|B16\.[0-9]+|PTC(?:\s+[0-9]+(?:\.[0-9]+)?)?)(?:\s+Div(?:ision)?\.?\s*[0-9]+)?)\b', re.IGNORECASE),
    # API
    (r'\bAPI\s+(?:(?:Std\.?|RP|Standard)\s+)?\d+[A-Z0-9-]*(?!\.)\b', re.IGNORECASE),
    # ISA
    (r'\bISA\s*(?:-|\s+)(?:(?:Std\.?|RP|TR|Standard)\s+)?\d+(?:\.\d+)*\b', re.IGNORECASE),
    # IS: Indian Standards
    (r'\bIS\s+\d+(?:-\d+)?(?:\s*\(\s*Part\s*\d+\s*\))?\b', 0)
]

def clean_text(text):
    if not text:
        return None
    # Strip HTML tags
    t = re.sub(r'<[^>]+>', ' ', text)
    # Unescape common html entities
    t = t.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
    t = re.sub(r'\s+', ' ', t).strip()
    return t if t else None

def extract_primary_standard(html):
    # Head priority text
    title_m = re.search(r'<title[^>]*>(.*?)</title>', html, re.DOTALL | re.IGNORECASE)
    desc_m = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', html, re.IGNORECASE)
    kw_m = re.search(r'<meta[^>]*name=["\']keywords["\'][^>]*content=["\'](.*?)["\']', html, re.IGNORECASE)
    h1_m = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.DOTALL | re.IGNORECASE)

    title = title_m.group(1) if title_m else ""
    desc = desc_m.group(1) if desc_m else ""
    keywords = kw_m.group(1) if kw_m else ""
    h1 = h1_m.group(1) if h1_m else ""

    head_text = f"{title} {desc} {keywords} {h1}"
    head_matches = []
    for pattern, flags in PATTERNS:
        matches = re.findall(pattern, head_text, flags)
        for m in matches:
            cleaned = re.sub(r'\s+', ' ', m).strip()
            if not re.match(r'^(?:ASME|API|ISA)\s*$', cleaned, re.I):
                head_matches.append(cleaned)
    if head_matches:
        return Counter(head_matches).most_common(1)[0][0]

    # Body text (exclude header, footer, nav, script, style)
    body = re.sub(r'<(header|footer|nav|script|style)[^>]*>.*?</\1>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    body_text = re.sub(r'<[^>]+>', ' ', body)

    body_candidates = []
    for pattern, flags in PATTERNS:
        matches = re.findall(pattern, body_text, flags)
        for m in matches:
            cleaned = re.sub(r'\s+', ' ', m).strip()
            if not re.match(r'^(?:ASME|API|ISA)\s*$', cleaned, re.I):
                if 'whatsapp' not in cleaned.lower() and not cleaned.lower().startswith('api.com'):
                    body_candidates.append(cleaned)

    if body_candidates:
        return Counter(body_candidates).most_common(1)[0][0]

    return None

def build_inventory():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pattern = os.path.join(base_dir, '*.html')
    html_files = sorted(glob.glob(pattern))

    headers = []
    footers = []
    pages = []

    for fpath in html_files:
        rel_path = os.path.basename(fpath)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
            content = fp.read()

        # Header and footer collection
        hm = re.search(r'(<header\b[^>]*>.*?</header>)', content, re.DOTALL | re.IGNORECASE)
        fm = re.search(r'(<footer\b[^>]*>.*?</footer>)', content, re.DOTALL | re.IGNORECASE)
        if hm:
            headers.append(hm.group(1))
        if fm:
            footers.append(fm.group(1))

        # Title
        title_m = re.search(r'<title[^>]*>(.*?)</title>', content, re.DOTALL | re.IGNORECASE)
        title = clean_text(title_m.group(1)) if title_m else None

        # Meta description
        desc_m = re.search(r'<meta[^>]*name=["\']description["\'][^>]*content=["\'](.*?)["\']', content, re.IGNORECASE)
        meta_desc = clean_text(desc_m.group(1)) if desc_m else None

        # H1
        h1_m = re.search(r'<h1[^>]*>(.*?)</h1>', content, re.DOTALL | re.IGNORECASE)
        h1 = clean_text(h1_m.group(1)) if h1_m else None

        # Standard
        standard = extract_primary_standard(content)

        # Canonical
        can_m = re.search(r'<link\s+[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']+)["\']', content, re.IGNORECASE)
        if not can_m:
            can_m = re.search(r'<link\s+[^>]*href=["\']([^"\']+)["\'][^>]*rel=["\']canonical["\']', content, re.IGNORECASE)

        canonical_exists = can_m is not None
        canonical_href = can_m.group(1) if can_m else None

        stem = os.path.splitext(rel_path)[0].lower()
        expected_url = "https://designcalculators.co.in/" if stem == "index" else f"https://designcalculators.co.in/{stem}"

        is_self_referencing = False
        if canonical_href:
            norm_href = canonical_href.rstrip('/').lower()
            norm_exp = expected_url.rstrip('/').lower()
            is_self_referencing = (norm_href == norm_exp or norm_href == f"{norm_exp}.html")

        pages.append({
            "filePath": rel_path,
            "title": title,
            "metaDescription": meta_desc,
            "h1": h1,
            "detectedPrimaryStandard": standard,
            "canonicalExists": canonical_exists,
            "hasSelfReferencingCanonical": is_self_referencing,
            "isCanonicalSelfReferencing": is_self_referencing,
            "canonicalHref": canonical_href
        })

    # Most common repeated header and footer
    shared_header = Counter(headers).most_common(1)[0][0] if headers else ""
    shared_footer = Counter(footers).most_common(1)[0][0] if footers else ""

    inventory_data = {
        "totalPages": len(pages),
        "sharedHeader": shared_header,
        "sharedFooter": shared_footer,
        "pages": pages
    }

    out_dir = os.path.join(base_dir, 'seo-config')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'inventory.json')

    with open(out_file, 'w', encoding='utf-8') as fp:
        json.dump(inventory_data, fp, indent=2, ensure_ascii=False)

    print(f"Inventory generated at {out_file}")
    print(f"Total pages indexed: {len(pages)}")
    print(f"Pages with self-referencing canonicals: {sum(1 for p in pages if p['isCanonicalSelfReferencing'])}")
    print(f"Pages with primary standard: {sum(1 for p in pages if p['detectedPrimaryStandard'] is not None)}")

if __name__ == '__main__':
    build_inventory()
