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
        let content = parsed.content.replace(/<ADDITIONAL_METADATA>[\s\S]*?<\/ADDITIONAL_METADATA>/g, '');
        content = content.replace(/<USER_REQUEST>|<\/USER_REQUEST>/g, '').trim();
        console.log(`\n\n=== USER (${parsed.created_at}) ===\n${content}`);
    } else if (parsed.source === 'MODEL' && parsed.content) {
        // Only print planner responses that don't have tool calls if they are direct chat, or print just the text
        if (parsed.type === 'PLANNER_RESPONSE' && parsed.content && !parsed.content.startsWith('Created At:')) {
           console.log(`\n\n=== AGENT (${parsed.created_at}) ===\n${parsed.content.substring(0, 500)}...`);
        }
    }
  } catch(e) {}
}
