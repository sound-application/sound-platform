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
  
  // 1. Inject fallback `t` if not already present
  if (!code.includes('const t = (key: any) => i18n.t(key);')) {
     code = code.replace(/import \{ useTranslation \} from 'react-i18next';/, 
       "import { useTranslation } from 'react-i18next';\nimport i18n from 'i18next';\n\nconst t = (key: any) => i18n.t(key);\n"
     );
  }

  // 2. Fix redeclaration in GeneralHomePage
  // "export function GeneralHomePage() {  const { t } = useTranslation(['generalHome', 'home']);\n  const { t } = useTranslation(['home', 'live', 'create', 'profile']);"
  if (code.includes('const { t } = useTranslation([')) {
     // replace any block of multiple `const { t } = useTranslation` with just one.
     let lines = code.split('\n');
     let inComp = false;
     for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('export function GeneralHomePage() {  const { t } = useTranslation([')) {
            lines[i] = "export function GeneralHomePage() {";
        }
     }
     code = lines.join('\n');
  }

  // Same for LivePage redeclaration
  if (f.endsWith('LivePage.tsx') || f.endsWith('GeneralHomePage.tsx')) {
     let lines = code.split('\n');
     for (let i=0; i<lines.length; i++) {
        if (lines[i].includes('const { t } = useTranslation(\'home\');')) {
           lines[i] = '// removed redeclaration';
        }
     }
     code = lines.join('\n');
  }
  
  fs.writeFileSync(p, code);
  console.log('Fixed fallback for', f);
});
