const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');

const project = new Project({
  tsConfigFilePath: 'apps/web/tsconfig.app.json',
});

const arabicRegex = /[\u0600-\u06FF]/;

function generateKey(englishText) {
  return englishText
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 4)
    .map((word, idx) => {
      word = word.toLowerCase();
      if (idx === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

async function run() {
  const filesToProcess = [];

  for (const sourceFile of project.getSourceFiles()) {
    const filePath = sourceFile.getFilePath();
    if (!filePath.includes('apps/web/src/')) continue;
    if (filePath.includes('/i18n/locales/')) continue;
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) continue;

    const nodes = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral)
      .concat(sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral))
      .concat(sourceFile.getDescendantsOfKind(SyntaxKind.JsxText));

    const nodesWithArabic = nodes.filter(n => arabicRegex.test(n.getText()));

    if (nodesWithArabic.length > 0) {
      filesToProcess.push({ sourceFile, nodes: nodesWithArabic });
    }
  }

  console.log(`Found ${filesToProcess.length} files with Arabic text remaining.`);

  for (const { sourceFile, nodes } of filesToProcess) {
    const baseName = sourceFile.getBaseNameWithoutExtension();
    const namespace = baseName.toLowerCase().replace('page', '');
    const arJsonPath = `apps/web/src/i18n/locales/ar/${namespace}.json`;
    const enJsonPath = `apps/web/src/i18n/locales/en/${namespace}.json`;

    let arDict = {};
    let enDict = {};
    if (fs.existsSync(arJsonPath)) arDict = JSON.parse(fs.readFileSync(arJsonPath, 'utf8'));
    if (fs.existsSync(enJsonPath)) enDict = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));

    let hasImport = false;
    for (const dec of sourceFile.getImportDeclarations()) {
      if (dec.getModuleSpecifierValue() === '../../i18n' || dec.getModuleSpecifierValue() === '../../../i18n' || dec.getModuleSpecifierValue().includes('/i18n')) {
        hasImport = true;
      }
    }

    if (!hasImport) {
      const srcI18n = path.resolve('apps/web/src/i18n');
      const fileDir = path.dirname(sourceFile.getFilePath());
      let relativePath = path.relative(fileDir, srcI18n).replace(/\\/g, '/');
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
      
      sourceFile.insertStatements(0, `import i18n from '${relativePath}';\nconst tWrapper = (key: any, options?: any) => i18n.t(key, options) as any as string;\n`);
    } else {
      const tWrapperExists = sourceFile.getVariableDeclaration('tWrapper');
      if (!tWrapperExists) {
        sourceFile.insertStatements(1, `const tWrapper = (key: any, options?: any) => i18n.t(key, options) as any as string;\n`);
      }
    }

    let replacements = [];

    for (const node of nodes) {
      const isJsxText = node.getKind() === SyntaxKind.JsxText;
      let text = isJsxText ? node.getText() : node.getLiteralValue();
      
      // Clean up text
      let trimmedText = text.trim();
      if (!arabicRegex.test(trimmedText)) continue;

      try {
        const res = await translate(trimmedText, { from: 'ar', to: 'en' });
        const english = res.text;
        
        let key = generateKey(english);
        if (!key) key = 'key' + Math.floor(Math.random() * 10000);
        
        let finalKey = key;
        let counter = 1;
        while (arDict[finalKey] && arDict[finalKey] !== trimmedText) {
          finalKey = `${key}${counter}`;
          counter++;
        }

        arDict[finalKey] = trimmedText;
        enDict[finalKey] = english;

        let replacementCode = `tWrapper('${namespace}:${finalKey}')`;
        
        if (isJsxText) {
          // If the JsxText has leading/trailing space, we should preserve it inside JSX by putting it outside the curly braces, but it's simpler to just replace the trimmed part.
          const match = text.match(/^(\s*)(.*?)(\s*)$/s);
          const before = match[1];
          const after = match[3];
          replacementCode = `${before}{${replacementCode}}${after}`;
        }

        replacements.push({
          node,
          newText: replacementCode
        });
        
        console.log(`Translated [${namespace}]: ${trimmedText} -> ${english}`);
      } catch (err) {
        console.error('Translation error:', err.message);
      }
    }

    replacements.sort((a, b) => b.node.getStart() - a.node.getStart());
    for (const r of replacements) {
      r.node.replaceWithText(r.newText);
    }

    fs.writeFileSync(arJsonPath, JSON.stringify(arDict, null, 2), 'utf8');
    fs.writeFileSync(enJsonPath, JSON.stringify(enDict, null, 2), 'utf8');
    
    sourceFile.saveSync();
    console.log(`Updated ${baseName}`);
  }
}

run().catch(console.error);
