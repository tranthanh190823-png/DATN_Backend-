import dns from 'dns';
try { dns.setDefaultResultOrder('ipv4first'); } catch(e){}
import dotenv from 'dotenv';
dotenv.config();

const keys = [process.env.YESCALE_API_KEY].filter(Boolean);

for (const key of keys) {
  try {
    console.log('Testing key starting with:', key.substring(0, 10));
    const response = await fetch('https://api.yescale.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        model: 'deepseek-v3.2',
        messages: [{ role: 'user', content: 'hello' }],
        max_tokens: 10
      })
    });
    console.log('STATUS:', response.status);
    const data = await response.json();
    console.log('DATA:', JSON.stringify(data));
  } catch (err) {
    console.error('ERROR for key', key.substring(0, 10), err.message);
  }
}
