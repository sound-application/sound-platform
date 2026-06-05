const fs = require('fs');
let code = fs.readFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', 'utf8');

// Replace t(something?.label) with t(something?.label || '')
code = code.replace(/t\(([^)]+\?\.label)\)/g, "t($1 || '')");

fs.writeFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', code);
console.log("Fixed TypeScript optional chaining errors in t()");
