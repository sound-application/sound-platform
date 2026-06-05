const fs = require('fs');
const path = require('path');

// Step 1: Rename all JSON files to lowercase
['ar', 'en'].forEach(lang => {
  const dir = `apps/web/src/i18n/locales/${lang}`;
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const lower = f.toLowerCase();
    if (f !== lower) {
      fs.renameSync(path.join(dir, f), path.join(dir, lower));
      console.log(`Renamed ${f} to ${lower}`);
    }
  });
});

// Step 2: Replace '.' with ':' in all t('...') calls inside TSX files
function processDir(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      processDir(full);
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      let content = fs.readFileSync(full, 'utf8');
      
      // Match t('namespace.key') or t("namespace.key")
      // We will only replace if the left side of the dot is a known namespace format
      // Actually, my auto_i18n.js used: t('namespace.key') with single quotes
      let newContent = content.replace(/t\(['"]([a-z0-9]+)\.([a-zA-Z0-9_]+)['"]\)/gi, "t('$1:$2')");
      
      // Also match {t('namespace.key')}
      
      if (newContent !== content) {
        fs.writeFileSync(full, newContent, 'utf8');
        console.log(`Fixed keys in ${full}`);
      }
    }
  });
}

processDir('apps/web/src');
