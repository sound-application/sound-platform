const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('apps/web/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    // Remove dir="rtl"
    content = content.replace(/ dir="rtl"/g, '');
    content = content.replace(/ dir='rtl'/g, '');
    content = content.replace(/ dir=\{['"]rtl['"]\}/g, '');
  }

  if (file.endsWith('.css')) {
    // Remove direction: rtl;
    content = content.replace(/direction\s*:\s*rtl\s*;/g, '');
    content = content.replace(/direction\s*:\s*rtl\s*(?=\})/g, ''); // if no semicolon
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
