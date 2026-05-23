import re, json

with open('ref_js_sample.txt', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Pull all quoted strings 4-80 chars that look like UI text
strings = re.findall(r'"([A-Za-z][A-Za-z0-9 &/\-,()\[\]]{3,79})"', content)
seen = set()
clean = []
for s in strings:
    if s not in seen and not s.startswith('http') and '\\' not in s:
        seen.add(s)
        clean.append(s)

print("=== UI STRINGS ===")
for s in clean[:120]:
    print(" ", s)

# Look for category arrays
print("\n=== CATEGORY-LIKE SECTIONS ===")
cat_matches = re.finditer(r'(category|Category|type|label|tag)[^}]{0,200}', content)
printed = set()
for m in cat_matches:
    chunk = m.group()[:150]
    if chunk not in printed and any(c.isupper() for c in chunk[10:]):
        printed.add(chunk)
        print(chunk)
        if len(printed) > 20:
            break

# Look for incident counts / numbers with context
print("\n=== STATS/NUMBERS ===")
num_matches = re.findall(r'(\w{3,30})[:=]\s*(\d{2,6})', content)
for k, v in num_matches[:30]:
    print(f"  {k}: {v}")
