const fs = require('fs');
let code = fs.readFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', 'utf8');

const patterns = [
  "t(WORLDS.find((w) => w.key === world)?.label)",
  "t((KINDS_BY_WORLD[world] ?? []).find((k) => k.key === kind)?.label)",
  "t(CATEGORIES.find((c) => c.id === categoryId)?.label)",
  "t(LANGUAGES.find((l) => l.code === language)?.label)",
  "t(LANGUAGES.find((l) => l.code === captionLang)?.label)",
  "t(AUDIENCE_OPTIONS.find((a) => a.key === audience)?.label)"
];

for (const p of patterns) {
  const fixed = p.replace("?.label)", "?.label as string)");
  code = code.split(p).join(fixed);
}

fs.writeFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', code);
console.log("Fixed ts errors by casting to string");
