import dotenv from 'dotenv';
dotenv.config();
import connectDB from './configs/db.js';
import { generateAIResponse } from './utils/aiChatService.js';

await connectDB();

console.log('Testing generateAIResponse...');
try {
  const result = await generateAIResponse([
    { role: 'user', content: 'Xin chào, tư vấn giúp tôi nước hoa nam' }
  ]);
  console.log('Result:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Error:', err);
}

process.exit(0);
