import glob
import os
import re

# Dominant standard header (used across the entire site)
with open('about.html', 'r', encoding='utf-8') as f:
    DOMINANT_HEADER = re.search(r'<header\b[^>]*>[\s\S]*?</header>', f.read(), re.I).group(0).strip()

# Dominant standard footer (with Live Simulators and standard classes)
with open('adc-resolution.html', 'r', encoding='utf-8') as f:
    DOMINANT_FOOTER = re.search(r'<footer\b[^>]*>[\s\S]*?</footer>', f.read(), re.I).group(0).strip()

html_files = sorted(glob.glob('*.html'))
header_updated = []
footer_updated = []

for fpath in html_files:
    fname = os.path.basename(fpath)
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as fp:
        content = fp.read()

    modified = False

    # 1. Update Header:
    # index.html keeps its hero section inside <header>, so we do not overwrite its entire header block,
    # but all other 206 pages get the exact unified DOMINANT_HEADER!
    if fname != 'index.html':
        h_match = re.search(r'<header\b[^>]*>[\s\S]*?</header>', content, re.IGNORECASE)
        if h_match and h_match.group(0).strip() != DOMINANT_HEADER:
            content = content[:h_match.start()] + DOMINANT_HEADER + content[h_match.end():]
            header_updated.append(fname)
            modified = True

    # 2. Update Footer:
    # All 207 pages should have DOMINANT_FOOTER!
    f_match = re.search(r'<footer\b[^>]*>[\s\S]*?</footer>', content, re.IGNORECASE)
    if f_match:
        if f_match.group(0).strip() != DOMINANT_FOOTER:
            content = content[:f_match.start()] + DOMINANT_FOOTER + content[f_match.end():]
            footer_updated.append(fname)
            modified = True
    else:
        # File was missing footer completely (e.g. metalweight.html, pipescheduletool.html, shaft-power-torque.html)
        # Inject DOMINANT_FOOTER before <button id="back-to-top" or </body>
        btn_match = re.search(r'(\s*<button\s+id=["\']back-to-top["\'])', content, re.IGNORECASE)
        if btn_match:
            idx = btn_match.start(1)
            content = content[:idx] + "\n\n    " + DOMINANT_FOOTER + content[idx:]
        else:
            body_end = re.search(r'(\s*</body>)', content, re.IGNORECASE)
            if body_end:
                idx = body_end.start(1)
                content = content[:idx] + "\n\n    " + DOMINANT_FOOTER + "\n\n    <button id=\"back-to-top\" aria-label=\"Back to top\"><i class=\"fas fa-arrow-up\"></i></button>\n" + content[idx:]
        footer_updated.append(fname)
        modified = True

    # 3. Ensure <script src="main.js"></script> is present before </body>
    if 'src="main.js"' not in content and "src='main.js'" not in content:
        body_end = re.search(r'(</body>)', content, re.IGNORECASE)
        if body_end:
            idx = body_end.start(1)
            content = content[:idx] + '    <script src="main.js"></script>\n' + content[idx:]
            modified = True

    if modified:
        with open(fpath, 'w', encoding='utf-8') as fp:
            fp.write(content)

print(f"Header normalized in: {len(header_updated)} files")
print(f"Footer normalized in: {len(footer_updated)} files")
