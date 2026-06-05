const fs = require('fs');
const glob = require('glob'); // Note: we can use standard fs.readdirSync if glob is not there.
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('apps/web/src/pages', (filePath) => {
    if (!filePath.endsWith('.tsx')) return;
    
    let code = fs.readFileSync(filePath, 'utf8');
    let original = code;

    // Fix redeclarations: "const { t } = useTranslation('home'); \n const { t } = useTranslation('live');"
    // Just remove the second one and merge namespaces or just keep one if it's identical
    code = code.replace(/const\s+\{\s*t\s*\}\s*=\s*useTranslation\([^)]*\);\s*const\s+\{\s*t\s*\}\s*=\s*useTranslation\([^)]*\);/g, (match) => {
        const lines = match.split(';');
        // Just keep the first one
        return lines[0] + ';';
    });
    
    // Also fix exact lines where there are two hooks
    const lines = code.split('\n');
    let inComponent = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('const { t } = useTranslation')) {
            // Check if next line or nearby has it too
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
                if (lines[j].includes('const { t } = useTranslation')) {
                    lines[j] = '// removed redeclaration of t';
                }
            }
        }
    }
    code = lines.join('\n');

    // Simple hack to fix constants: replace them with functions if they have t(
    // e.g. const STATUS_OPTIONS: FilterOption[] = [ ... t(...) ... ];
    // We will do a generic replacement:
    // If a line starts with `const [A-Z_]+` and the file has `t(`, we can't easily parse it.
    // Let's just fix the specific names we know are arrays of options.
    const optionArrays = [
        'STATUS_OPTIONS', 'CATEGORY_OPTIONS', 'COUNTRY_OPTIONS', 'SORT_OPTIONS',
        'GENERAL_TABS', 'MUSIC_TABS', 'PLUS_TABS', 'RADIO_TABS', 'TOURNAMENTS_TABS',
        'ME_TABS', 'TOURNAMENT_TABS'
    ];

    optionArrays.forEach(arrName => {
        // match `const ARR_NAME: Type[] = [` or `const ARR_NAME = [`
        const regex = new RegExp(`const\\s+${arrName}(\\s*:\\s*[^=]+)?\\s*=\\s*\\[`);
        if (regex.test(code)) {
            code = code.replace(regex, `const get${arrName} = (t: any)${RegExp.$1 || ''} => [`);
            // Now we must replace usages of ARR_NAME with getARR_NAME(t)
            // But only if it's not the declaration we just changed!
            const usageRegex = new RegExp(`\\b${arrName}\\b`, 'g');
            code = code.replace(usageRegex, (match, offset, fullString) => {
                // If the match is right after `const get`, leave it (wait, we already renamed the declaration to getARR_NAME)
                // Actually, the declaration was `const ARR_NAME =`. We replaced `const ARR_NAME` with `const getARR_NAME`.
                // So any remaining `ARR_NAME` is a usage!
                return `get${arrName}(t)`;
            });
        }
    });

    if (code !== original) {
        fs.writeFileSync(filePath, code);
        console.log('Fixed', filePath);
    }
});
