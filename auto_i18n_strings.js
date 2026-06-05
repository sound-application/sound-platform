const { Project, SyntaxKind } = require('ts-morph');
const fs = require('fs');
const path = require('path');
const translate = require('google-translate-api-x');

const project = new Project({
  tsConfigFilePath: 'apps/web/tsconfig.app.json',
});

const arabicRegex = /[\u0600-\u06FF]/;

// Helper to generate a valid key
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

    const stringNodes = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral)
      .concat(sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral));

    const nodesWithArabic = stringNodes.filter(n => arabicRegex.test(n.getText()));

    if (nodesWithArabic.length > 0) {
      filesToProcess.push({ sourceFile, nodes: nodesWithArabic });
    }
  }

  console.log(`Found ${filesToProcess.length} files with Arabic strings.`);

  for (const { sourceFile, nodes } of filesToProcess) {
    const baseName = sourceFile.getBaseNameWithoutExtension();
    const namespace = baseName.toLowerCase().replace('page', '');
    const arJsonPath = `apps/web/src/i18n/locales/ar/${namespace}.json`;
    const enJsonPath = `apps/web/src/i18n/locales/en/${namespace}.json`;

    let arDict = {};
    let enDict = {};
    
    if (fs.existsSync(arJsonPath)) arDict = JSON.parse(fs.readFileSync(arJsonPath, 'utf8'));
    if (fs.existsSync(enJsonPath)) enDict = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));

    // Fix imports for the file
    let hasImport = false;
    for (const dec of sourceFile.getImportDeclarations()) {
      if (dec.getModuleSpecifierValue() === '../../i18n' || dec.getModuleSpecifierValue() === '../../../i18n') {
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
      // Check if tWrapper is defined
      const tWrapperExists = sourceFile.getVariableDeclaration('tWrapper');
      if (!tWrapperExists) {
        sourceFile.insertStatements(1, `const tWrapper = (key: any, options?: any) => i18n.t(key, options) as any as string;\n`);
      }
    }

    let replacements = [];

    for (const node of nodes) {
      const text = node.getLiteralValue(); // Gets string without quotes
      if (!arabicRegex.test(text)) continue;

      try {
        const res = await translate(text, { from: 'ar', to: 'en' });
        const english = res.text;
        
        let key = generateKey(english);
        if (!key) key = 'key' + Math.floor(Math.random() * 10000);
        
        // Ensure uniqueness
        let finalKey = key;
        let counter = 1;
        while (arDict[finalKey] && arDict[finalKey] !== text) {
          finalKey = `${key}${counter}`;
          counter++;
        }

        arDict[finalKey] = text;
        enDict[finalKey] = english;

        replacements.push({
          node,
          newText: `tWrapper('${namespace}:${finalKey}')`
        });
        
        console.log(`Translated [${namespace}]: ${text} -> ${english}`);
      } catch (err) {
        console.error('Translation error:', err.message);
      }
    }

    // Apply replacements in reverse order to preserve offsets
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
