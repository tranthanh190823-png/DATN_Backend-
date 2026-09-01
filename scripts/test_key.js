import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function testKeys() {
  const keys = [process.env.YESCALE_API_KEY].filter(Boolean);

  const models = ['deepseek-v3.2', 'deepseek-chat', 'gpt-4o-mini'];

  for (const key of keys) {
    for (const model of models) {
      try {
        console.log(`Testing key ${key.slice(0, 10)}... with model ${model}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        
        const res = await fetch('https://api.yescale.io/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: 'Xin chào' }],
            max_tokens: 50
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        const data = await res.json();
        console.log(`STATUS ${res.status}:`, JSON.stringify(data));
      } catch (err) {
        console.error(`ERROR:`, err.message);
      }
    }
  }
}

testKeys();
