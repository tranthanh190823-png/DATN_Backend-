/**
 * Script tạo MongoDB text index cho products collection
 * Bước 3 — Chuẩn bị cho text search / fuzzy search
 *
 * Chạy: node scripts/createSearchIndex.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ MONGO_URI not found in .env');
  process.exit(1);
}

const run = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('products');

    // Tạo text index trên các field quan trọng
    const result = await collection.createIndex(
      {
        name: 'text',
        brand: 'text',
        description: 'text',
        scentNotes: 'text',
      },
      {
        weights: {
          name: 10,        // tên sản phẩm ưu tiên cao nhất
          brand: 8,        // thương hiệu
          scentNotes: 5,   // nốt hương
          description: 2,  // mô tả
        },
        name: 'product_text_search',
        default_language: 'none', // tắt stemming vì dùng tiếng Việt
      }
    );

    console.log('✅ Text index created:', result);
    console.log('\n📝 Index này cho phép dùng $text / $search query');
    console.log('📝 Để dùng Atlas Search (fuzzy + synonym), cần upgrade lên MongoDB Atlas\n');

    // Liệt kê tất cả indexes
    const indexes = await collection.indexes();
    console.log('📋 All indexes on products:');
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

run();
