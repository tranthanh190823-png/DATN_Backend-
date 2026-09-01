import OpenAI from 'openai';
import fs from 'fs';
import 'dotenv/config';

const logFile = 'ai-speed.log';
fs.writeFileSync(logFile, '--- AI Speed Benchmark Optimized ---\n');

const log = (msg) => {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
};

const apiKey = process.env.YESCALE_API_KEY || '';
if (!apiKey) {
  console.error('Missing YESCALE_API_KEY env var.');
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: 'https://api.yescale.io/v1',
  timeout: 5000,
});

const start = Date.now();
try {
  const response = await client.chat.completions.create({
    model: 'deepseek-v3.2',
    messages: [
      { role: 'system', content: 'Bạn là Aven — tư vấn viên nước hoa của Aventis. Trả lời ngắn gọn 2-3 câu.' },
      { role: 'user', content: 'Tư vấn nước hoa nam bán chạy nhất' }
    ],
    max_tokens: 200,
    temperature: 0.5,
  });
  const elapsed = Date.now() - start;
  log(`✅ [deepseek-v3.2 OPTIMIZED] ${elapsed}ms:\n${response.choices[0]?.message?.content}`);
} catch (err) {
  const elapsed = Date.now() - start;
  log(`❌ [deepseek-v3.2 OPTIMIZED] ${elapsed}ms Error: ${err.status || err.message}`);
}

process.exit(0);
