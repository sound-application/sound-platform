const fs = require('fs');

const transcriptPath = 'C:\\Users\\akram\\.gemini\\antigravity\\brain\\53c447a2-12bd-46da-8cc1-09454599bf0d\\.system_generated\\logs\\transcript.jsonl';
const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  try {
    const parsed = JSON.parse(line);
    // Look for tool execution outputs
    if (parsed.type === 'RUN_COMMAND' || parsed.type === 'TOOL_RESPONSE' || parsed.type === 'PLANNER_RESPONSE' || parsed.type === 'ACTION_RESULT') {
        if (parsed.content && parsed.content.includes('[diff_block_start]')) {
             if (parsed.created_at > '2026-06-04T00:00:00Z' && parsed.created_at < '2026-06-04T16:07:42Z') {
                 console.log(`\n\n--- DIFF FROM ${parsed.created_at} ---`);
                 console.log(parsed.content);
             }
        }
    }
  } catch(e) {}
}
