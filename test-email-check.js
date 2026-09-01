import dotenv from 'dotenv';
dotenv.config();

import sendEmail from './utils/sendEmail.js';

console.log('Testing SMTP with email:', process.env.SMTP_EMAIL);

try {
  const result = await sendEmail({
    email: process.env.SMTP_EMAIL,
    subject: 'Aventis Test Mail',
    message: 'Test email content from Aventis system',
    html: '<h3>Test email content from Aventis system</h3>',
  });
  console.log('✅ SMTP TEST SUCCESS:', result.messageId);
  process.exit(0);
} catch (err) {
  console.error('❌ SMTP TEST FAILED:', err.message);
  console.error(err);
  process.exit(1);
}
