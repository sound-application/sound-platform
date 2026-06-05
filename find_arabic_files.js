const fs = require('fs');
const path = require('path');

const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

// A simple script to find files with Arabic text
function findArabicFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findArabicFiles(fullPath, fileList);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (ARABIC_REGEX.test(content)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

const targetDirs = [
  'apps/web/src/pages',
  'apps/web/src/components'
];

let allArabicFiles = [];
for (const dir of targetDirs) {
  allArabicFiles = allArabicFiles.concat(findArabicFiles(dir));
}

console.log(allArabicFiles.map(f => f.replace(/\\/g, '/')).join('\n'));
