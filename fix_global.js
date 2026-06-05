const fs = require('fs');
const path = require('path');

const ts2304Files = [
  'src/pages/CreatePage.tsx',
  'src/pages/create/AudioCreatePage.tsx',
  'src/pages/discover/CategoryDiscoveryPage.tsx',
  'src/pages/discover/GeneralDiscoverPage.tsx',
  'src/pages/discover/MusicDiscoverPage.tsx',
  'src/pages/discover/PlusDiscoverPage.tsx',
  'src/pages/discover/RadioDiscoverPage.tsx',
  'src/pages/discover/TournamentsDiscoverPage.tsx',
  'src/pages/GeneralHomePage.tsx',
  'src/pages/home/MusicHomePage.tsx',
  'src/pages/home/PlusHomePage.tsx',
  'src/pages/home/RadioHomePage.tsx',
  'src/pages/home/TournamentsHomePage.tsx',
  'src/pages/live/MusicLivePage.tsx',
  'src/pages/live/TournamentsLivePage.tsx',
  'src/pages/LivePage.tsx'
];

ts2304Files.forEach(f => {
  const p = path.join('C:/Users/akram/Downloads/Sound/sound-platform/apps/web', f);
  if (!fs.existsSync(p)) return;
  let lines = fs.readFileSync(p, 'utf-8').split('\n');
  let originalLines = [...lines];

  // Fix `t` redeclarations
  // Already mostly fixed, but just in case:
  let seenT = false;
  for (let i = 0; i < lines.length; i++) {
    // Only look outside components? Actually just anywhere.
    if (lines[i].match(/const\s+\{\s*t\s*\}\s*=\s*useTranslation\('([^']+)'\);/)) {
        // If we see another one in the same block, we might want to merge them
    }
  }

  // Find all constant arrays that contain `t(` and wrap them
  for (let i = 0; i < lines.length; i++) {
    // Look for `const NAME: Type = [` or `const NAME = [` or `const NAME = {` ... wait, `t` could be in an object!
    // Let's just find `const [A-Z_0-9]+`
    let match = lines[i].match(/^const\s+([A-Z_0-9]+)\s*(:\s*[^=]+)?\s*=\s*(\[|\{)/);
    if (match) {
      let name = match[1];
      let type = match[2] || '';
      let openBrace = match[3]; // [ or {
      let closeBrace = openBrace === '[' ? '];' : '};';
      
      // Determine if this block has `t(`
      let containsT = false;
      let j = i;
      let braceCount = 0;
      let endLine = -1;
      
      // We need a simple brace counter to find the end
      for (; j < lines.length; j++) {
        if (lines[j].includes('t(')) containsT = true;
        
        let openCount = (lines[j].match(new RegExp('\\' + openBrace, 'g')) || []).length;
        let closeChar = openBrace === '[' ? ']' : '}';
        let closeCount = (lines[j].match(new RegExp('\\' + closeChar, 'g')) || []).length;
        
        braceCount += openCount - closeCount;
        
        if (braceCount <= 0 && j >= i) {
           // Maybe we hit the end
           if (lines[j].trim().endsWith(';')) {
             endLine = j;
             break;
           }
        }
        
        // simple fallback if it's top level and ends with ]; or } as any;
        if (j > i && (lines[j].startsWith(closeBrace) || lines[j].startsWith(closeChar + ' as'))) {
           endLine = j;
           break;
        }
      }

      if (containsT && endLine !== -1) {
        // Wrap it!
        lines[i] = lines[i].replace(/^const\s+[A-Z_0-9]+\s*(:\s*[^=]+)?\s*=/, `const get${name} = (t: any)${type} =>`);
        
        // Now find usages below this declaration and replace `name` with `get${name}(t)`
        // NOTE: we only want to replace full words.
        for (let k = 0; k < lines.length; k++) {
          if (k >= i && k <= endLine) continue; // Inside the definition
          let usageRegex = new RegExp(`\\b${name}\\b`, 'g');
          if (usageRegex.test(lines[k])) {
            lines[k] = lines[k].replace(usageRegex, `get${name}(t)`);
          }
        }
      }
    }
  }

  // Also we still have some TS2304 where `t` is used in a functional component that LACKS `const { t } = useTranslation();`
  // Let's ensure every component using `t(` has `const { t } = useTranslation(['home', 'live', 'create', 'profile']);`
  for (let i = 0; i < lines.length; i++) {
     if (lines[i].match(/^export\s+function\s+([A-Z][a-zA-Z0-9_]*)/)) {
        // Check if there's `const { t }` inside
        let hasT = false;
        let usesT = false;
        let j = i + 1;
        let componentEnd = -1;
        let braceCount = 1; // from the { of the function
        for (; j < lines.length; j++) {
           braceCount += (lines[j].match(/\{/g) || []).length;
           braceCount -= (lines[j].match(/\}/g) || []).length;
           
           if (lines[j].includes('const { t } = useTranslation')) hasT = true;
           if (lines[j].includes(' t(')) usesT = true;
           
           if (braceCount <= 0) {
               componentEnd = j;
               break;
           }
        }
        
        if (usesT && !hasT) {
           // Insert `const { t } = useTranslation(['home', 'live', 'create', 'profile']);` right after function declaration
           lines.splice(i + 1, 0, `  const { t } = useTranslation(['home', 'live', 'create', 'profile']);`);
        }
     }
  }

  let finalCode = lines.join('\n');
  if (finalCode !== originalLines.join('\n')) {
      fs.writeFileSync(p, finalCode);
      console.log(`Fixed ${f}`);
  }
});
