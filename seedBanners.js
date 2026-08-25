import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Banner from './models/Banner.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const initialBanners = [
  {
    title: 'Hương Thơm Đẳng Cấp',
    subtitle: 'Khám phá bộ sưu tập nước hoa mới nhất năm 2026 với những mùi hương độc bản.',
    imageUrl: 'https://borcen-store-newdemo.myshopify.com/cdn/shop/files/s29-1_1.jpg?v=1756867089',
    link: '/shop',
    buttonText: 'Khám phá ngay',
    position: 'HERO_SLIDE',
    order: 1,
    isActive: true
  },
  {
    title: 'Sự Quyến Rũ Tinh Tế',
    subtitle: 'Đánh thức mọi giác quan với những nốt hương hoa hồng và nhài tinh khiết.',
    imageUrl: 'https://borcen-store-newdemo.myshopify.com/cdn/shop/files/s29-2_1.jpg?v=1756868462',
    link: '/shop',
    buttonText: 'Mua ngay',
    position: 'HERO_SLIDE',
    order: 2,
    isActive: true
  },
  {
    title: 'Phong Cách Thời Thượng',
    subtitle: 'Khẳng định phong cách riêng biệt của bạn qua từng giọt hương quý giá.',
    imageUrl: 'https://borcen-store-newdemo.myshopify.com/cdn/shop/files/s29-1_2.jpg?v=1756867129',
    link: '/shop',
    buttonText: 'Xem bộ sưu tập',
    position: 'HERO_SLIDE',
    order: 3,
    isActive: true
  },
  {
    title: 'Hương Thơm Tinh Tế Cho Phong Cách Hiện Đại',
    subtitle: 'Bộ Sưu Tập Nước Hoa Cao Cấp',
    imageUrl: '/collection_banner_1775105686852.png',
    link: '/shop',
    buttonText: 'Xem bộ sưu tập',
    position: 'PROMO_BANNER_1',
    order: 1,
    isActive: true
  }
];

async function seedBanners() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Kết nối MongoDB thành công');

    for (const b of initialBanners) {
      const exists = await Banner.findOne({ title: b.title, position: b.position });
      if (!exists) {
        await Banner.create(b);
        console.log(`✅ Đã tạo banner: ${b.title}`);
      } else {
        console.log(`⚠️  Banner "${b.title}" đã tồn tại - bỏ qua`);
      }
    }

    console.log('🎉 Hoàn thành seed banner!');
  } catch (error) {
    console.error('❌ Lỗi seed banner:', error);
  } finally {
    await mongoose.disconnect();
  }
}

seedBanners();
