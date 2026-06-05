const fs = require('fs');
const path = require('path');

function findArabicText(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findArabicText(fullPath, fileList);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Remove block comments
      content = content.replace(/\/\*[\s\S]*?\*\//g, '');
      // Remove line comments
      content = content.replace(/\/\/.*$/gm, '');
      
      // A simple regex to find Arabic words.
      const arabicRegex = /[\u0600-\u06FF]+/g;
      
      let lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (arabicRegex.test(line)) {
           // check if the line contains `t(` with the Arabic text inside it
           // If it's a fallback `t('key', 'Arabic')`, it's fine.
           // If it's `label: 'Arabic'` but NOT inside `t()`, it's BAD.
           // Let's just print any line that has Arabic but DOES NOT contain `t(` or `i18next`
           if (!line.includes('t(') && !line.includes('i18n.t(') && !line.includes('useTranslation')) {
             fileList.push({ file: fullPath.replace('C:\\Users\\akram\\Downloads\\Sound\\sound-platform\\apps\\web\\src\\', ''), lineNum: i + 1, line: line.trim() });
           } else {
             // It has t(. But is the Arabic outside the t()?
             // We can do a strict check: remove all t('...', '...') and see if Arabic remains.
             let withoutT = line.replace(/t\([^)]+?\)/g, '');
             if (/[\u0600-\u06FF]/.test(withoutT)) {
                fileList.push({ file: fullPath.replace('C:\\Users\\akram\\Downloads\\Sound\\sound-platform\\apps\\web\\src\\', ''), lineNum: i + 1, line: line.trim() });
             }
           }
        }
      }
    }
  }
  return fileList;
}

const results = findArabicText('C:/Users/akram/Downloads/Sound/sound-platform/apps/web/src');
if (results.length > 0) {
  console.log(`Found ${results.length} lines with potentially hardcoded Arabic:`);
  results.slice(0, 50).forEach(r => {
    console.log(`${r.file}:${r.lineNum} -> ${r.line}`);
  });
} else {
  console.log('No raw Arabic found! Everything is wrapped.');
}
