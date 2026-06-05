const fs = require('fs');
const path = require('path');

const arJsonPath = path.join(__dirname, 'apps/web/src/i18n/locales/ar/audiocreate.json');
const targetFilePath = path.join(__dirname, 'apps/web/src/pages/create/AudioCreatePage.tsx');

let targetContent = fs.readFileSync(targetFilePath, 'utf8');
const arData = JSON.parse(fs.readFileSync(arJsonPath, 'utf8'));

// First, make sure `useTranslation` is imported and used.
if (!targetContent.includes("const { t } = useTranslation('audiocreate');")) {
  targetContent = targetContent.replace(
    "const { currentTrack, playerState, currentTime, duration, playTrack, togglePlay, seek, nextTrack, prevTrack } = usePlayer();",
    "const { currentTrack, playerState, currentTime, duration, playTrack, togglePlay, seek, nextTrack, prevTrack } = usePlayer();\n  const { t } = useTranslation('audiocreate');"
  );
  if (!targetContent.includes("const { t } = useTranslation('audiocreate');")) {
    // If that didn't match, just inject it at the top of the component
    targetContent = targetContent.replace(
      "export function AudioCreatePage() {",
      "export function AudioCreatePage() {\n  const { t, i18n } = useTranslation('audiocreate');"
    );
  }
}

// Ensure `i18n.dir()` is used on the main wrapper
targetContent = targetContent.replace(
  '<div className="acp-page" dir="rtl">',
  '<div className="acp-page" dir={i18n.dir()}>'
);


// Sorting by length descending so we match longer strings first (e.g. phrases before single words)
const entries = Object.entries(arData).sort((a, b) => b[1].length - a[1].length);

for (const [key, value] of entries) {
  if (value.trim().length < 2) continue; // Skip very short strings
  
  // Replace >Text<
  let regexHtml = new RegExp(`>\\s*${escapeRegExp(value)}\\s*<`, 'g');
  targetContent = targetContent.replace(regexHtml, `>{t('${key}')}<`);

  // Replace "Text"
  let regexQuotesDouble = new RegExp(`"\\s*${escapeRegExp(value)}\\s*"`, 'g');
  targetContent = targetContent.replace(regexQuotesDouble, `t('${key}')`);
  
  // Replace 'Text'
  let regexQuotesSingle = new RegExp(`'\\s*${escapeRegExp(value)}\\s*'`, 'g');
  targetContent = targetContent.replace(regexQuotesSingle, `t('${key}')`);

  // Replace placeholder="Text"
  let regexPlaceholder = new RegExp(`placeholder="${escapeRegExp(value)}"`, 'g');
  targetContent = targetContent.replace(regexPlaceholder, `placeholder={t('${key}')}`);

  // Replace title="Text"
  let regexTitle = new RegExp(`title="${escapeRegExp(value)}"`, 'g');
  targetContent = targetContent.replace(regexTitle, `title={t('${key}')}`);
}

fs.writeFileSync(targetFilePath, targetContent, 'utf8');
console.log('Translation replacements done.');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
