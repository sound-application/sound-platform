const fs = require('fs');

const files = [
  'GeneralMePage.tsx',
  'MusicMePage.tsx',
  'PlusMePage.tsx',
  'RadioMePage.tsx',
  'TournamentsMePage.tsx'
];

files.forEach(filename => {
  const file = `apps/web/src/pages/me/${filename}`;
  let code = fs.readFileSync(file, 'utf8');
  
  // Look for any function that starts with a capital letter and doesn't have useTranslation
  const fnRegex = /(function\s+[A-Z]\w*\s*\([^)]*\)\s*\{)([^]*?)(?=(function\s+[A-Z]|$))/g;
  code = code.replace(fnRegex, (match, p1, p2) => {
      if (!p2.includes("const { t } = useTranslation") && p2.includes("t(")) {
          return `${p1}\n  const { t } = useTranslation('home');${p2}`;
      }
      return match;
  });

  fs.writeFileSync(file, code);
  console.log(`Injected t into ${filename}`);
});
