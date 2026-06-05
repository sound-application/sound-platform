const fs = require('fs');
const lines = fs.readFileSync('C:\\Users\\akram\\.gemini\\antigravity\\brain\\53c447a2-12bd-46da-8cc1-09454599bf0d\\.system_generated\\logs\\transcript.jsonl', 'utf-8').split('\n');

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const parsed = JSON.parse(line);
    if (parsed.tool_calls) {
      for (const tc of parsed.tool_calls) {
        if (tc.name === 'view_file' && tc.args.AbsolutePath && tc.args.AbsolutePath.includes('AudioCreatePage.tsx')) {
           console.log('VIEW_FILE CALL: ' + parsed.created_at);
        }
      }
    }
  } catch(e) {}
}
