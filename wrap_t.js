const fs = require('fs');
let code = fs.readFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', 'utf8');

// Simple direct replacements
code = code.replace(/\{STEP_LABELS\[s\]\}/g, "{t(STEP_LABELS[s])}");
code = code.replace(/\{w\.label\}/g, "{t(w.label)}");
code = code.replace(/title=\{w\.note\}/g, "title={t(w.note)}");
code = code.replace(/\{k\.label\}/g, "{t(k.label)}");
code = code.replace(/\{c\.label\}/g, "{t(c.label)}");
code = code.replace(/\{sc\.label\}/g, "{t(sc.label)}");
code = code.replace(/\{l\.label\}/g, "{t(l.label)}");
code = code.replace(/\{a\.label\}/g, "{t(a.label)}");
// opt.label appears in select menus
code = code.replace(/\{opt\.label\}/g, "{t(opt.label)}");
code = code.replace(/\{src\.label\}/g, "{t(src.label)}");

// Optional chaining with find
const finds = [
  /\{WORLDS\.find\(\(w\) => w\.key === world\)\?\.label\}/g,
  /\{\(KINDS_BY_WORLD\[world\] \?\? \[\]\)\.find\(\(k\) => k\.key === kind\)\?\.label\}/g,
  /\{CATEGORIES\.find\(\(c\) => c\.id === categoryId\)\?\.label\}/g,
  /\{LANGUAGES\.find\(\(l\) => l\.code === language\)\?\.label\}/g,
  /\{LANGUAGES\.find\(\(l\) => l\.code === captionLang\)\?\.label\}/g,
  /\{AUDIENCE_OPTIONS\.find\(\(a\) => a\.key === audience\)\?\.label\}/g
];

finds.forEach(regex => {
  code = code.replace(regex, (match) => {
    // strip outer braces
    const inner = match.slice(1, -1);
    // add t() wrapper
    return `{${inner} ? t(${inner}) : ''}`;
  });
});

fs.writeFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', code);
console.log("Wrapped variables in t()");
