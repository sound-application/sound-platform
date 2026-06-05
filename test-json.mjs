import fs from 'fs';
import path from 'path';

// Just read the JSON directly to verify its structure.
const ar = JSON.parse(fs.readFileSync('./apps/web/src/i18n/locales/ar/createhub.json', 'utf8'));
console.log('Arabic JSON header.title:', ar.header?.title);
console.log('Arabic JSON createTypes.upload.label:', ar.createTypes?.upload?.label);

const en = JSON.parse(fs.readFileSync('./apps/web/src/i18n/locales/en/createhub.json', 'utf8'));
console.log('English JSON header.title:', en.header?.title);
console.log('English JSON createTypes.upload.label:', en.createTypes?.upload?.label);
