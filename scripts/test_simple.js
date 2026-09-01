import fs from 'fs';
import dns from 'dns';
import dotenv from 'dotenv';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

const logFile = 'scripts/yescale.log';
fs.writeFileSync(logFile, 'Starting test...\n');

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function run() {
  try {
    log('Sending request to YeScale...');
    const start = Date.now();
    const res = await fetch('https://api.yescale.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.YESCALE_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-v3.2',
        messages: [{ role: 'user', content: 'Xin chào' }],
        max_tokens: 50
      })
    });
    const duration = Date.now() - start;
    log(`HTTP Status: ${res.status} (${duration}ms)`);
    const text = await res.text();
    log(`Response: ${text}`);
  } catch (err) {
    log(`Fetch error: ${err.stack || err.message}`);
  }
}

run().then(() => {
  log('Done');
  process.exit(0);
});
