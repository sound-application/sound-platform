import re

path = r'C:\Users\akram\Downloads\Sound\sound-platform\apps\web\src\pages\create\AudioCreatePage.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

def fix_text(text):
    for match in set(re.findall(r'[^\x00-\x7F]+', text)):
        try:
            # We try cp1252 and latin1
            try:
                fixed = match.encode('cp1252').decode('utf-8')
            except:
                fixed = match.encode('latin1').decode('utf-8')
            # Only replace if it successfully decoded to valid arabic (which means length > 0)
            if fixed.strip():
                text = text.replace(match, fixed)
        except Exception:
            pass
    return text

content = fix_text(content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
