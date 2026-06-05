const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const cssFiles = walk('apps/web/src');

// In a native RTL app:
// 'right' is the logical START. So right -> inset-inline-start.
// 'left' is the logical END. So left -> inset-inline-end.
// 'margin-right' is margin at the START. So margin-right -> margin-inline-start.
// 'margin-left' is margin at the END. So margin-left -> margin-inline-end.

const replacements = [
  { search: /margin-right:/g, replace: 'margin-inline-start:' },
  { search: /margin-left:/g, replace: 'margin-inline-end:' },
  { search: /padding-right:/g, replace: 'padding-inline-start:' },
  { search: /padding-left:/g, replace: 'padding-inline-end:' },
  { search: /border-right:/g, replace: 'border-inline-start:' },
  { search: /border-left:/g, replace: 'border-inline-end:' },
  { search: /border-right-color:/g, replace: 'border-inline-start-color:' },
  { search: /border-left-color:/g, replace: 'border-inline-end-color:' },
  { search: /border-right-width:/g, replace: 'border-inline-start-width:' },
  { search: /border-left-width:/g, replace: 'border-inline-end-width:' },
  { search: /border-top-right-radius:/g, replace: 'border-start-start-radius:' },
  { search: /border-top-left-radius:/g, replace: 'border-start-end-radius:' },
  { search: /border-bottom-right-radius:/g, replace: 'border-end-start-radius:' },
  { search: /border-bottom-left-radius:/g, replace: 'border-end-end-radius:' },
  { search: /(?<!-)right:/g, replace: 'inset-inline-start:' },
  { search: /(?<!-)left:/g, replace: 'inset-inline-end:' },
  { search: /float:\s*right/g, replace: 'float: inline-start' },
  { search: /float:\s*left/g, replace: 'float: inline-end' },
  { search: /text-align:\s*right/g, replace: 'text-align: start' },
  { search: /text-align:\s*left/g, replace: 'text-align: end' }
];

let totalChanges = 0;

cssFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  replacements.forEach(r => {
    content = content.replace(r.search, r.replace);
  });
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    totalChanges++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Migrated ${totalChanges} CSS files to logical properties for RTL native app.`);
