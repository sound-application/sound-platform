const fs = require('fs');
const path = require('path');

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const namespace = process.argv[2];
if (!namespace) {
  console.error("Please provide namespace (e.g. home, player, profile)");
  process.exit(1);
}

const jsonPath = `apps/web/src/i18n/locales/ar/${namespace}.json`;
if (!fs.existsSync(jsonPath)) {
  console.error("JSON not found:", jsonPath);
  process.exit(1);
}

const fileContent = fs.readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, '');
const translations = JSON.parse(fileContent);

// Flatten JSON to handle nested keys
function flattenObj(obj, parent = '', res = {}) {
    for (let key in obj) {
        let propName = parent ? parent + '.' + key : key;
        if (typeof obj[key] == 'object' && obj[key] !== null) {
            flattenObj(obj[key], propName, res);
        } else {
            res[propName] = obj[key];
        }
    }
    return res;
}

const flatTranslations = flattenObj(translations);

const targetFiles = walk('apps/web/src/pages').concat(walk('apps/web/src/components')).concat(walk('apps/web/src/router'));

let globalReplaced = 0;

targetFiles.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  let originalCode = code;
  let fileReplaced = 0;
  
  for (const [key, arabicText] of Object.entries(flatTranslations)) {
    // Only target strings with actual Arabic characters to avoid false positives on 'Plus' or numbers
    if (!/[\u0600-\u06FF]/.test(arabicText)) continue;
    
    // Skip parameterized strings like "قصة {{name}}"
    if (arabicText.includes('{{')) continue;

    const translationKey = `${namespace}.${key}`;

    // Replace > Arabic < (JSX Text)
    // Matches optional whitespace before and after the text
    const jsxRegex = new RegExp(`>(\\s*)${escapeRegex(arabicText)}(\\s*)<`, 'g');
    code = code.replace(jsxRegex, (match, p1, p2) => {
        fileReplaced++;
        return `>${p1}{t('${translationKey}')}${p2}<`;
    });

    // Replace attribute="Arabic" (JSX Attributes)
    const attrRegex = new RegExp(`=(\\s*)"${escapeRegex(arabicText)}"`, 'g');
    code = code.replace(attrRegex, (match, p1) => {
        fileReplaced++;
        return `=${p1}{t('${translationKey}')}`;
    });

    // Replace 'Arabic' or "Arabic" (Plain JS Strings)
    // Using negative lookbehind to avoid replacing already wrapped ones
    const strRegex1 = new RegExp(`(?<!t\\()(?<!t\\(\\[)'${escapeRegex(arabicText)}'`, 'g');
    code = code.replace(strRegex1, () => {
        fileReplaced++;
        return `t('${translationKey}')`;
    });

    const strRegex2 = new RegExp(`(?<!t\\()(?<!t\\(\\[)"${escapeRegex(arabicText)}"`, 'g');
    code = code.replace(strRegex2, () => {
        fileReplaced++;
        return `t('${translationKey}')`;
    });

    // Replace `Arabic`
    const strRegex3 = new RegExp(`(?<!t\\()(?<!t\\(\\[)\`${escapeRegex(arabicText)}\``, 'g');
    code = code.replace(strRegex3, () => {
        fileReplaced++;
        return `t('${translationKey}')`;
    });
  }
  
  if (fileReplaced > 0) {
    // Automatically inject the import and hook if they are not there
    if (!code.includes("useTranslation")) {
        // Simple heuristic: insert import at top
        const importStatement = `import { useTranslation } from 'react-i18next';\n`;
        const lastImportIndex = code.lastIndexOf('import ');
        const nextLineIndex = code.indexOf('\n', lastImportIndex) + 1;
        code = code.slice(0, nextLineIndex) + importStatement + code.slice(nextLineIndex);
    }
    
    // Attempt to inject `const { t } = useTranslation('namespace');`
    // We look for any function starting with a capital letter (React Component)
    const fnRegex = /(function\s+[A-Z]\w*\s*\([^)]*\)\s*\{)([^]*?)(?=(function\s+[A-Z]|$))/g;
    code = code.replace(fnRegex, (match, p1, p2) => {
        if (!p2.includes("const { t } = useTranslation")) {
            return `${p1}\n  const { t } = useTranslation('${namespace}');${p2}`;
        }
        return match;
    });

    fs.writeFileSync(file, code);
    console.log(`[${file}] Replaced ${fileReplaced} strings.`);
    globalReplaced += fileReplaced;
  }
});

console.log(`Total replaced for namespace '${namespace}': ${globalReplaced}`);
