import urllib.request, re, json

req = urllib.request.Request(
    'https://tvkfiles.pages.dev/assets/index-BJVMO4QC.js',
    headers={'User-Agent': 'Mozilla/5.0'}
)
js = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', errors='ignore')
print('JS size:', len(js), 'chars')

# Extract route paths
routes = re.findall(r'"(/[^"]{1,60})"', js)
routes = sorted(set(r for r in routes if '/' in r and len(r) < 40))
print('\nRoutes/paths found:')
for r in routes[:40]:
    print(' ', r)

# Find all string literals that look like UI labels
labels = re.findall(r'"([A-Z][A-Za-z &/\-]{4,50})"', js)
labels = sorted(set(labels))
print('\nUI label strings:')
for l in labels[:60]:
    print(' ', l)

# Save 50KB chunk for manual inspection
with open('ref_js_sample.txt', 'w') as f:
    f.write(js[10000:60000])
print('\nSaved 50KB sample to ref_js_sample.txt')
