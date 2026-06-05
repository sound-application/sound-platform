const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');

const ARABIC_REGEX = /[\u0600-\u06FF]/;

function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((word, index) => {
      if (index === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('')
    .slice(0, 40);
}

// Map of rawArabic -> { enText, key }
const translationCache = {};

async function processFile(filePath, project) {
  const sourceFile = project.getSourceFile(filePath);
  if (!sourceFile) return;

  const basename = path.basename(filePath, '.tsx').replace('.ts', '');
  const namespace = basename.toLowerCase().replace('page', '');
  
  const nodes = [];
  sourceFile.forEachDescendant(node => {
    if (
      node.getKind() === SyntaxKind.JsxText ||
      node.getKind() === SyntaxKind.StringLiteral ||
      node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral
    ) {
      if (ARABIC_REGEX.test(node.getText())) {
        nodes.push(node);
      }
    }
  });
  
  if (nodes.length === 0) return;
  console.log(`Processing ${filePath} (${nodes.length} nodes)`);

  const hasI18nImport = sourceFile.getImportDeclarations().some(imp => imp.getModuleSpecifierValue() === 'i18next' || imp.getModuleSpecifierValue() === '../../i18n' || imp.getModuleSpecifierValue() === '../i18n');
  if (!hasI18nImport) {
    sourceFile.addImportDeclaration({ defaultImport: 'i18n', moduleSpecifier: 'i18next' });
    const lastImport = sourceFile.getImportDeclarations().pop();
    sourceFile.insertStatements(lastImport.getChildIndex() + 1, `\nconst t = (key: any, options?: any) => i18n.t(key, options) as any as string;\n`);
  }

  const arDict = {};
  const enDict = {};

  nodes.reverse();
  for (const node of nodes) {
    const kind = node.getKind();
    let rawText = kind === SyntaxKind.JsxText ? node.getLiteralText().trim() : node.getLiteralValue();
    if (!ARABIC_REGEX.test(rawText) || rawText.length === 0) continue;

    const cached = translationCache[rawText];
    let key = cached ? cached.key : ('key' + Math.floor(Math.random()*10000));
    let enText = cached ? cached.enText : 'untranslated';
    
    let suffix = 1;
    let finalKey = key;
    while (arDict[finalKey] && arDict[finalKey] !== rawText) {
      finalKey = key + suffix;
      suffix++;
    }
    arDict[finalKey] = rawText;
    enDict[finalKey] = enText;
    const fullKey = `${namespace}.${finalKey}`;

    if (kind === SyntaxKind.JsxText) {
      try { node.replaceWithText(`{t('${fullKey}')}`); } catch(e) {}
    } else {
      const parent = node.getParent();
      if (parent.getKind() === SyntaxKind.JsxAttribute) {
        try { node.replaceWithText(`{t('${fullKey}')}`); } catch(e) {}
      } else {
        try { node.replaceWithText(`t('${fullKey}')`); } catch(e) {}
      }
    }
  }

  sourceFile.saveSync();
  const arPath = path.join('apps/web/src/i18n/locales/ar', `${namespace}.json`);
  const enPath = path.join('apps/web/src/i18n/locales/en', `${namespace}.json`);
  
  const mergeDict = (p, dict) => {
    let existing = {};
    if (fs.existsSync(p)) try { existing = JSON.parse(fs.readFileSync(p, 'utf8')); } catch(e){}
    Object.assign(existing, dict);
    fs.writeFileSync(p, JSON.stringify(existing, null, 2), 'utf8');
  };
  mergeDict(arPath, arDict);
  mergeDict(enPath, enDict);
}

async function main() {
  const project = new Project({ tsConfigFilePath: 'apps/web/tsconfig.app.json' });
  const filesList = fs.readFileSync('find_arabic_files.js.out', 'utf16le').split(/\r?\n/).filter(Boolean);
  
  // Phase 1: Collect unique Arabic strings
  const uniqueStrings = new Set();
  for (const file of filesList) {
    if (fs.existsSync(file)) {
      const sourceFile = project.addSourceFileAtPath(file);
      sourceFile.forEachDescendant(node => {
        if (
          node.getKind() === SyntaxKind.JsxText ||
          node.getKind() === SyntaxKind.StringLiteral ||
          node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral
        ) {
          const text = node.getKind() === SyntaxKind.JsxText ? node.getLiteralText().trim() : node.getLiteralValue();
          if (ARABIC_REGEX.test(text)) uniqueStrings.add(text);
        }
      });
    }
  }

  const stringsArray = Array.from(uniqueStrings);
  console.log(`Found ${stringsArray.length} unique Arabic strings. Translating...`);

  // Phase 2: Translate in parallel chunks of 20
  for (let i = 0; i < stringsArray.length; i += 20) {
    const chunk = stringsArray.slice(i, i + 20);
    console.log(`Translating chunk ${i} to ${i + 20}...`);
    await Promise.all(chunk.map(async str => {
      try {
        const res = await translate(str, { to: 'en' });
        const key = toCamelCase(res.text) || 'key' + Math.floor(Math.random()*10000);
        translationCache[str] = { enText: res.text, key };
      } catch(e) {
        translationCache[str] = { enText: 'untranslated', key: 'key' + Math.floor(Math.random()*10000) };
      }
    }));
  }

  // Phase 3: Process files
  for (const file of filesList) {
    if (fs.existsSync(file)) {
      await processFile(file, project);
    }
  }
}

main().catch(console.error);
