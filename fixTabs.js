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
  
  const prefix = filename.replace('MePage.tsx', '').toUpperCase(); // GENERAL, MUSIC, PLUS, RADIO, TOURNAMENTS
  const tabName = `${prefix}_TABS`;
  const fnName = `get${prefix}Tabs`;

  // change `const XXX_TABS: ... = [` to `const getXXXTabs = (t: any): ... => [`
  code = code.replace(
    new RegExp(`const ${tabName}:\\s*([^\\[]+\\[\\])\\s*=\\s*\\[`), 
    `const ${fnName} = (t: any): $1 => [`
  );

  // change references from `XXX_TABS` to `getXXXTabs(t)`
  code = code.replace(new RegExp(`\\b${tabName}\\b`, 'g'), `${fnName}(t)`);

  fs.writeFileSync(file, code);
  console.log(`Fixed tabs in ${filename}`);
});
