const fs = require('fs');

const transcriptPath = 'C:\\Users\\akram\\.gemini\\antigravity\\brain\\53c447a2-12bd-46da-8cc1-09454599bf0d\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  try {
    const parsed = JSON.parse(line);
    if (parsed.created_at < '2026-05-30T00:00:00Z') continue;

    if (parsed.type === 'USER_INPUT' && parsed.content) {
        // Strip out the metadata boilerplate to make it readable
        let content = parsed.content;
        content = content.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '');
        content = content.replace(/<USER_REQUEST>|<\/USER_REQUEST>/g, '').trim();
        
        if (content.toLowerCase().includes('cut') || 
            content.toLowerCase().includes('preview') || 
            content.toLowerCase().includes('slider') || 
            content.toLowerCase().includes('trim') || 
            content.toLowerCase().includes('time') || 
            content.toLowerCase().includes('edit') || 
            content.toLowerCase().includes('missing')) {
            console.log(`\n\n=== USER (${parsed.created_at}) ===\n${content}`);
        }
    }
  } catch(e) {}
}
