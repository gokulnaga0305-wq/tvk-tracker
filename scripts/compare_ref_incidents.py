"""Pull the reference site's bundled incidents and compare counts."""
import urllib.request, re, json, sys

sys.stdout.reconfigure(encoding='utf-8')

req = urllib.request.Request(
    'https://tvkfiles.pages.dev/assets/index-BJVMO4QC.js',
    headers={'User-Agent': 'Mozilla/5.0'}
)
js = urllib.request.urlopen(req, timeout=30).read().decode('utf-8', errors='ignore')
print(f'Bundle size: {len(js):,} chars')

# Look for any large JSON-array embeds (incidents, promises, etc.)
# These are usually patterns like  =JSON.parse('[{...}]')  or  =[{id:1,...}]
# Find any JSON array literal of objects with id/title fields
pattern = r'\[\{[^\[\]]{50,}?\}(?:,\{[^\[\]]{50,}?\}){5,}\]'
matches = re.findall(pattern, js[-500000:])
print(f'Found {len(matches)} candidate JSON arrays (last 500KB)')

for i, m in enumerate(matches[:5]):
    print(f'\n--- Array {i+1} (len={len(m):,}) ---')
    print(m[:400])

# Different approach: find "id:" patterns to estimate counts
id_count = len(re.findall(r'\bid:\s*"?\d', js))
title_count = len(re.findall(r'\btitle:\s*"', js))
date_count = len(re.findall(r'\bdate:\s*"\d{4}-\d{2}-\d{2}', js))

print(f'\n=== Bundle stats ===')
print(f'  id: occurrences  = {id_count}')
print(f'  title: with date = {title_count}')
print(f'  ISO date strings = {date_count}')

# Look for any URL fetches in the bundle
fetches = re.findall(r'fetch\([\"\']([^\"\']+)[\"\']', js)
urls = sorted(set(fetches))
print(f'\n=== fetch() URLs ===')
for u in urls[:20]:
    print(f'  {u}')

# Look for any /data/, /api/, /assets/ JSON file references
data_refs = re.findall(r'[\"\']/[a-z_/-]+\.json[\"\']', js)
print(f'\n=== JSON file refs ===')
for r in sorted(set(data_refs))[:20]:
    print(f'  {r}')

# Save the last 200KB for manual inspection
with open('scripts/ref_bundle_tail.txt', 'w', encoding='utf-8') as f:
    f.write(js[-250000:])
print(f'\nSaved last 250KB to scripts/ref_bundle_tail.txt')
