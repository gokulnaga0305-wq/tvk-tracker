import urllib.request, re, sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

req = urllib.request.Request(
    'https://tvkfiles.pages.dev/assets/index-BJVMO4QC.js',
    headers={'User-Agent': 'Mozilla/5.0'}
)
js = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', errors='ignore')

# The app code is toward the end — search the last 600KB
app_code = js[-600000:]

# Find Tamil category strings and incident-related labels
labels = re.findall(r'"([^"]{4,120})"', app_code)
seen = set()
ui_strings = []
for s in labels:
    if s in seen:
        continue
    seen.add(s)
    # Keep strings that look like UI text (not code)
    if re.match(r'^[A-Za-z]', s) and not any(c in s for c in ['()', '{', '}', '\\n', '\\t', '\\r', 'function', 'return', 'typeof']):
        if not s.startswith('http') and not s.startswith('/') and len(s) < 100:
            ui_strings.append(s)

print("=== ALL UI STRINGS (up to 200) ===")
for s in ui_strings[:200]:
    print(" ", s)

# Look for nav/page routes
routes = re.findall(r'(?:path|href|to):\\s*"(/[^"]{1,50})"', app_code)
routes = sorted(set(routes))
print("\n=== ROUTES ===")
for r in routes:
    print(" ", r)

# Look for category values
cats = re.findall(r'(?:category|categories|type):\\s*"([^"]{4,60})"', app_code)
print("\n=== CATEGORIES FOUND ===")
for c in sorted(set(cats)):
    print(" ", c)

# Save last 200KB of app code to file for manual inspection
with open('scripts/appcode_tail.txt', 'w', encoding='utf-8') as f:
    f.write(js[-200000:])
print("\nSaved last 200KB to scripts/appcode_tail.txt")
