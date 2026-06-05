const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/discover/CategoryDiscoveryPage.tsx',
  'src/pages/discover/GeneralDiscoverPage.tsx',
  'src/pages/discover/MusicDiscoverPage.tsx',
  'src/pages/discover/PlusDiscoverPage.tsx',
  'src/pages/discover/RadioDiscoverPage.tsx',
  'src/pages/discover/TournamentsDiscoverPage.tsx',
  'src/pages/GeneralHomePage.tsx',
  'src/pages/home/RadioHomePage.tsx',
  'src/pages/home/TournamentsHomePage.tsx',
  'src/pages/live/MusicLivePage.tsx',
  'src/pages/live/TournamentsLivePage.tsx',
  'src/pages/LivePage.tsx'
];

files.forEach(f => {
  const p = path.join('C:/Users/akram/Downloads/Sound/sound-platform/apps/web', f);
  if (!fs.existsSync(p)) return;
  
  let code = fs.readFileSync(p, 'utf-8');
  code = code.replace(/const t = \(key: any, options\?: any\) => i18n\.t\(key, options\);/g, "const t = (key: any, options?: any) => i18n.t(key, options) as any as string;");
  fs.writeFileSync(p, code);
});
console.log('Fixed fallback args with string cast!');
