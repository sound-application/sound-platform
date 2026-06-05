const fs = require('fs');
const path = require('path');

const files = fs.readFileSync('find_arabic_files.js.out', 'utf16le').split(/\r?\n/).filter(Boolean);

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('t(') && !content.includes('const t = (key')) {
      // Find the last import
      const importRegex = /^import\s+.*?;?\s*$/gm;
      let lastImportIndex = 0;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastImportIndex = match.index + match[0].length;
      }
      
      // Determine path to i18n
      const depth = file.split('apps/web/src/')[1].split('/').length - 1;
      const i18nPath = depth === 1 ? '../i18n' : depth === 2 ? '../../i18n' : depth === 3 ? '../../../i18n' : './i18n';
      
      const insert = `\nimport i18n from '${i18nPath}';\nconst t = (key: any, options?: any) => i18n.t(key, options) as any as string;\n`;
      
      content = content.slice(0, lastImportIndex) + insert + content.slice(lastImportIndex);
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed ' + file);
    }
  }
}
