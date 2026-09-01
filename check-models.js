import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const apiKey = process.env.YESCALE_API_KEY;
const logFile = 'models-list.log';
fs.writeFileSync(logFile, '--- Checking Models ---\n');

const testModels = ['deepseek-v3.2', 'deepseek-r1', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-5-haiku-20241022'];

for (const model of testModels) {
  const start = Date.now();
  try {
    const res = await fetch('https://api.yescale.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-YEScale-Metadata': JSON.stringify({ feature: 'test' }),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 20,
      }),
    });
    const elapsed = Date.now() - start;
    const data = await res.json();
    if (res.ok) {
      fs.appendFileSync(logFile, `✅ [${model}] ${elapsed}ms -> ${data.choices?.[0]?.message?.content}\n`);
    } else {
      fs.appendFileSync(logFile, `❌ [${model}] ${elapsed}ms -> Error ${res.status}: ${JSON.stringify(data.error || data)}\n`);
    }
  } catch (err) {
    fs.appendFileSync(logFile, `❌ [${model}] -> Exception: ${err.message}\n`);
  }
}

fs.appendFileSync(logFile, '--- Done ---\n');
process.exit(0);
