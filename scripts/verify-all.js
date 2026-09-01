import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../configs/db.js';
import { generateAIResponse } from '../utils/aiChatService.js';
import { notifyOrderPlaced, notifyOrderPaid } from '../utils/sendOrderPaymentEmail.js';

async function runVerification() {
  console.log('--- STARTING SYSTEM VERIFICATION ---');
  await connectDB();

  console.log('\n[1] Testing AI Response for product intent...');
  const start = Date.now();
  const aiRes = await generateAIResponse([
    { role: 'user', content: 'Tư vấn nước hoa nam quyến rũ' }
  ]);
  const duration = Date.now() - start;
  console.log(`✅ AI Response Received in ${duration}ms:`);
  console.log(`Source: ${aiRes.source}`);
  console.log(`Text: ${aiRes.text}`);
  console.log(`Products Count: ${aiRes.products?.length || 0}`);

  console.log('\n[2] Testing Email Resolver Logic...');
  const mockCodOrder = {
    _id: '65a1234567890abcdef12345',
    paymentMethod: 'COD',
    totalPrice: 1500000,
    orderItems: [{ name: 'Bleu de Chanel Eau de Parfum', qty: 1, price: 1500000 }],
    shippingAddress: { fullName: 'Nguyễn Văn A', address: '123 Nguyễn Trãi', city: 'Hà Nội', postalCode: '100000', country: 'Vietnam' },
    user: { name: 'Nguyễn Văn A', email: 'test_user@gmail.com' }
  };

  console.log('Testing notifyOrderPlaced for COD...');
  await notifyOrderPlaced(mockCodOrder);

  const mockVnpayOrder = {
    _id: '65a9876543210fedcba54321',
    paymentMethod: 'VNPAY',
    totalPrice: 2800000,
    isPaid: false,
    orderItems: [{ name: 'Dior Sauvage Elixir', qty: 1, price: 2800000 }],
    shippingAddress: { fullName: 'Trần Thị B', address: '456 Lê Lợi', city: 'TP HCM', postalCode: '700000', country: 'Vietnam' },
    user: { name: 'Trần Thị B', email: 'test_user_b@gmail.com' }
  };

  console.log('Testing notifyOrderPlaced for VNPAY...');
  await notifyOrderPlaced(mockVnpayOrder);

  console.log('Testing notifyOrderPaid for VNPAY...');
  mockVnpayOrder.isPaid = true;
  await notifyOrderPaid(mockVnpayOrder);

  console.log('\n--- VERIFICATION SUCCESSFUL ---');
  process.exit(0);
}

runVerification().catch((err) => {
  console.error('Verification Error:', err);
  process.exit(1);
});
