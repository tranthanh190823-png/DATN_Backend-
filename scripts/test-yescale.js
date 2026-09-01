import OpenAI from 'openai';
import 'dotenv/config';

const apiKey = process.env.YESCALE_API_KEY || '';
if (!apiKey) {
  console.error('Missing YESCALE_API_KEY env var. Set it before running this script.');
  process.exit(1);
}

const client = new OpenAI({
  apiKey,
  baseURL: 'https://api.yescale.io/v1',
  timeout: 10000,
});

console.log('Testing streaming call to YeScale...');
try {
  const stream = await client.chat.completions.create({
    model: 'deepseek-v3.2',
    messages: [
      { role: 'system', content: 'Bạn là tư vấn viên.' },
      { role: 'user', content: 'Chào bạn' }
    ],
    stream: true,
  });

  let text = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) text += delta;
  }
  console.log('STREAM SUCCESS:', text);
} catch (err) {
  console.error('STREAM FAILED:', err.status, err.message, err.code);
}

console.log('Testing non-streaming call to YeScale...');
try {
  const res = await client.chat.completions.create({
    model: 'deepseek-v3.2',
    messages: [
      { role: 'system', content: 'Bạn là tư vấn viên.' },
      { role: 'user', content: 'Chào bạn' }
    ],
    stream: false,
  });
  console.log('NON-STREAM SUCCESS:', res.choices[0]?.message?.content);
} catch (err) {
  console.error('NON-STREAM FAILED:', err.status, err.message, err.code);
}
