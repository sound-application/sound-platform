const fs = require('fs');

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const json = JSON.parse(fs.readFileSync('apps/web/src/i18n/locales/en/create.json', 'utf8'));
let code = fs.readFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', 'utf8');

let replaceCount = 0;

for (const namespace in json) {
  for (const [arabic, english] of Object.entries(json[namespace])) {
    const translationKey = `${namespace}.${arabic}`;
    
    // Replace > Arabic < (JSX Text)
    const jsxRegex = new RegExp(`>(\\s*)${escapeRegex(arabic)}(\\s*)<`, 'g');
    code = code.replace(jsxRegex, (match, p1, p2) => {
        replaceCount++;
        return `>${p1}{t('${translationKey}')}${p2}<`;
    });

    // Replace placeholder="Arabic" (JSX Attributes)
    const attrRegex1 = new RegExp(`placeholder=(\\s*)"${escapeRegex(arabic)}"`, 'g');
    code = code.replace(attrRegex1, (match, p1) => {
        replaceCount++;
        return `placeholder=${p1}{t('${translationKey}')}`;
    });
    
    // Replace title="Arabic"
    const attrRegex2 = new RegExp(`title=(\\s*)"${escapeRegex(arabic)}"`, 'g');
    code = code.replace(attrRegex2, (match, p1) => {
        replaceCount++;
        return `title=${p1}{t('${translationKey}')}`;
    });

    // Replace aria-label="Arabic"
    const attrRegex3 = new RegExp(`aria-label=(\\s*)"${escapeRegex(arabic)}"`, 'g');
    code = code.replace(attrRegex3, (match, p1) => {
        replaceCount++;
        return `aria-label=${p1}{t('${translationKey}')}`;
    });
  }
}

fs.writeFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', code);
console.log(`Replaced ${replaceCount} JSX strings in AudioCreatePage.tsx`);
