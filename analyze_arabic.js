const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: 'apps/web/tsconfig.app.json',
});

const arabicRegex = /[\u0600-\u06FF]/;
let outsideComponentCount = 0;
let insideComponentCount = 0;

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  if (!filePath.includes('apps/web/src/')) continue;
  if (filePath.includes('/i18n/locales/')) continue;
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) continue;

  const stringNodes = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral)
    .concat(sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral))
    .concat(sourceFile.getDescendantsOfKind(SyntaxKind.TemplateHead))
    .concat(sourceFile.getDescendantsOfKind(SyntaxKind.TemplateMiddle))
    .concat(sourceFile.getDescendantsOfKind(SyntaxKind.TemplateTail))
    .concat(sourceFile.getDescendantsOfKind(SyntaxKind.JsxText));

  for (const node of stringNodes) {
    const text = node.getText();
    if (arabicRegex.test(text)) {
      const parentFunc = node.getFirstAncestorByKind(SyntaxKind.FunctionDeclaration) ||
                         node.getFirstAncestorByKind(SyntaxKind.ArrowFunction) ||
                         node.getFirstAncestorByKind(SyntaxKind.FunctionExpression);
                         
      if (parentFunc) {
        insideComponentCount++;
        console.log(`Inside: ${sourceFile.getBaseName()} - ${text.substring(0, 50)}`);
      } else {
        outsideComponentCount++;
        console.log(`Outside: ${sourceFile.getBaseName()} - ${text.substring(0, 50)}`);
      }
    }
  }
}

console.log(`\nInside components: ${insideComponentCount}`);
console.log(`Outside components: ${outsideComponentCount}`);
