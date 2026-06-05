const fs = require('fs');

const transcriptPath = 'C:\\Users\\akram\\.gemini\\antigravity\\brain\\53c447a2-12bd-46da-8cc1-09454599bf0d\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

let isTruncated = false;

for (const line of lines) {
  if (!line.trim()) continue;
  try {
    const parsed = JSON.parse(line);
    if (parsed.created_at >= '2026-06-04T16:07:42Z') continue;

    if (parsed.tool_calls) {
      for (const tc of parsed.tool_calls) {
        if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
          if (tc.args.TargetFile && tc.args.TargetFile.includes('AudioCreatePage.tsx')) {
            const argsStr = JSON.stringify(tc.args);
            if (argsStr.includes('<truncated')) {
              console.log('TRUNCATED ARGUMENTS at ' + parsed.created_at);
              isTruncated = true;
            }
          }
        }
      }
    }
  } catch(e) {}
}

console.log('Any truncated arguments? ' + isTruncated);
