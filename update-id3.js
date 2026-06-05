const fs = require('fs');
let content = fs.readFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', 'utf8');

const regex = /const handleFileSelect = async[\s\S]*?setFileDurationMs\(null\);\n\s*}\n\s*};/m;
const replacement = `  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);
    setFileDurationMs(null);
    if (!file.type.startsWith('audio/')) {
      setFileError(t('fileMustBeAudio', 'يجب أن يكون الملف صوتاً (audio/*).'));
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    try {
      const dur = await extractAudioDuration(file);
      setFileDurationMs(dur);
    } catch {
      setFileDurationMs(null);
    }

    // Try extracting ID3 album art
    try {
      const metadata = await mm.parseBlob(file);
      const picture = metadata.common.picture?.[0];
      if (picture && draftId && uid) {
        const coverBlob = new Blob([picture.data], { type: picture.format });
        const coverFile = new File([coverBlob], "cover_" + file.name + ".jpg", { type: picture.format });
        uploadCoverImage(coverFile);
      }
    } catch (err) {
      console.warn('Could not extract ID3 tags:', err);
    }
  };`;

content = content.replace(regex, replacement);
fs.writeFileSync('apps/web/src/pages/create/AudioCreatePage.tsx', content);
