const fs = require('fs');
const path = require('path');

const arDir = 'apps/web/src/i18n/locales/ar';
const files = fs.readdirSync(arDir).filter(f => f.endsWith('.json'));

let imports = `import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

`;

const namespaces = [];

files.forEach(f => {
  const ns = f.replace('.json', '');
  namespaces.push(ns);
  
  const varName = ns.charAt(0).toUpperCase() + ns.slice(1);
  imports += `import ar${varName} from './locales/ar/${f}';\n`;
});

imports += '\n';

files.forEach(f => {
  const ns = f.replace('.json', '');
  const varName = ns.charAt(0).toUpperCase() + ns.slice(1);
  imports += `import en${varName} from './locales/en/${f}';\n`;
});

let resources = `
export const SUPPORTED_LANGUAGES = [
  { code: 'ar', label: 'العربية', dir: 'rtl' as const },
  { code: 'en', label: 'English', dir: 'ltr' as const }
] as const;

export const RTL_LANGUAGES = ['ar'];

const resources = {
  ar: {
`;

namespaces.forEach(ns => {
  const varName = ns.charAt(0).toUpperCase() + ns.slice(1);
  resources += `    ${ns}: ar${varName},\n`;
});

resources += `  },
  en: {
`;

namespaces.forEach(ns => {
  const varName = ns.charAt(0).toUpperCase() + ns.slice(1);
  resources += `    ${ns}: en${varName},\n`;
});

resources += `  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ar',
    supportedLngs: SUPPORTED_LANGUAGES.map(l => l.code),
    defaultNS: 'common',
    ns: ${JSON.stringify(namespaces)},
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'sound-lang',
    },
    react: {
      useSuspense: false,
    },
  });

i18n.on('languageChanged', (lng) => {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  document.documentElement.dir = dir;
});

const initialDir = RTL_LANGUAGES.includes(i18n.language) ? 'rtl' : 'ltr';
document.documentElement.lang = i18n.language;
document.documentElement.dir = initialDir;

export default i18n;
`;

fs.writeFileSync('apps/web/src/i18n/index.ts', imports + resources, 'utf8');
console.log('Updated i18n/index.ts with ' + namespaces.length + ' namespaces.');
