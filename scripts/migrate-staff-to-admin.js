// Migration đơn: cập nhật mọi Message.senderType='staff' -> 'admin'
// Vì web chỉ có 2 role user/admin, role 'staff' bị xoá khỏi enum Message.
//
// Cách chạy (từ thư mục backend):
//   node scripts/migrate-staff-to-admin.js
//
// Chạy BẰNG DB hiện tại được config trong .env (MONGO_URI).
// LƯU Ý khi deploy: đảm bảo MONGO_URI trỏ đúng DB production trước khi chạy.
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Message from '../models/Message.js';

dotenv.config();
dns.setServers(['8.8.8.8', '1.1.1.1']);

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/perfume_store';

const migrate = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB Connected:', mongoose.connection.host);

    // Cập nhật senderType='staff' -> 'admin'
    const staffRes = await Message.updateMany(
      { senderType: 'staff' },
      { $set: { senderType: 'admin', sender: 'Admin' } }
    );
    console.log(`[senderType staff->admin] modified: ${staffRes.modifiedCount}, matched: ${staffRes.matchedCount}`);

    // Đồng thời sửa field `sender` cũ nếu còn giá trị 'Staff'
    const senderRes = await Message.updateMany(
      { sender: 'Staff' },
      { $set: { sender: 'Admin', senderType: 'admin' } }
    );
    console.log(`[sender Staff->Admin] modified: ${senderRes.modifiedCount}, matched: ${senderRes.matchedCount}`);

    console.log('Migration hoàn tất ✓');
  } catch (error) {
    console.error('Migration lỗi:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

migrate();
