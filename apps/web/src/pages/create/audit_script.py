import os
import re
import json

base_dir = r'C:\Users\akram\Downloads\Sound\sound-platform\apps\web\src\pages\create'
files_to_scan = [os.path.join(base_dir, 'AudioCreatePage.tsx')]

steps_dir = os.path.join(base_dir, 'steps')
if os.path.exists(steps_dir):
    for f in os.listdir(steps_dir):
        if f.endswith('.tsx'):
            files_to_scan.append(os.path.join(steps_dir, f))

pattern = re.compile(r"t\(\s*['\"]([^'\"]+)['\"]")

found_keys = set()
for fpath in files_to_scan:
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
        matches = pattern.findall(content)
        found_keys.update(matches)

en_json_path = r'C:\Users\akram\Downloads\Sound\sound-platform\apps\web\src\i18n\locales\en\audiocreate.json'
with open(en_json_path, 'r', encoding='utf-8') as f:
    en_keys = set(json.load(f).keys())

ar_json_path = r'C:\Users\akram\Downloads\Sound\sound-platform\apps\web\src\i18n\locales\ar\audiocreate.json'
with open(ar_json_path, 'r', encoding='utf-8') as f:
    ar_keys = set(json.load(f).keys())

with open('audit_temp.txt', 'w', encoding='utf-8') as out:
    out.write(f"Total distinct keys used in components: {len(found_keys)}\n")
    out.write(f"Keys existing in EN JSON: {len(en_keys)}\n")
    out.write(f"Keys existing in AR JSON: {len(ar_keys)}\n\n")

    missing_in_en = found_keys - en_keys
    out.write(f"MISSING FROM ENGLISH (Will incorrectly show Arabic default text for EN users): {len(missing_in_en)}\n")
    for k in sorted(list(missing_in_en)):
        out.write(f" - {k}\n")
    
    unused_in_en = en_keys - found_keys
    out.write(f"\nUNUSED IN JSON (Defined but never called with t('key')): {len(unused_in_en)}\n")
    for k in sorted(list(unused_in_en)):
        out.write(f" - {k}\n")
