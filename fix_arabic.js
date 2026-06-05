const fs = require('fs');
const path = require('path');

const correctLines = fs.readFileSync('apps/web/src/pages/create/AudioCreatePage-copy.tsx', 'utf8').split(/\r?\n/);
const corruptedLines = fs.readFileSync('temp_corrupted.tsx', 'utf8').split(/\r?\n/);

const replacements = new Map();

for (let i = 0; i < correctLines.length; i++) {
  const correct = correctLines[i];
  const corrupted = corruptedLines[i] || '';
  if (correct !== corrupted) {
    let start = 0;
    while (start < correct.length && start < corrupted.length && correct[start] === corrupted[start]) start++;
    
    let endCorrect = correct.length - 1;
    let endCorrupted = corrupted.length - 1;
    while (endCorrect >= start && endCorrupted >= start && correct[endCorrect] === corrupted[endCorrupted]) {
        endCorrect--;
        endCorrupted--;
    }
    
    if (start <= endCorrect && start <= endCorrupted) {
        const badStr = corrupted.substring(start, endCorrupted + 1);
        const goodStr = correct.substring(start, endCorrect + 1);
        if (badStr && goodStr && badStr.length > 2) {
            replacements.set(badStr, goodStr);
        }
    }
  }
}

console.log(`Found ${replacements.size} unique corrupted strings to replace.`);

const targetFiles = [
  'apps/web/src/pages/create/AudioCreatePage.tsx',
  ...fs.readdirSync('apps/web/src/pages/create/steps')
       .filter(f => f.endsWith('.tsx'))
       .map(f => path.join('apps/web/src/pages/create/steps', f))
];

const sortedReplacements = [...replacements.entries()].sort((a, b) => b[0].length - a[0].length);

for (const file of targetFiles) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  for (const [bad, good] of sortedReplacements) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed', file);
  }
}
