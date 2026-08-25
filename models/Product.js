import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String },
    status: { type: String, enum: ['VISIBLE', 'HIDDEN'], default: 'VISIBLE' }
}, { timestamps: true });

const volumePriceSchema = new mongoose.Schema({
    ml: { type: Number, required: true },       // 10, 20, 30, 100
    label: { type: String },                     // "10ml", "20ml", "30ml", "100ml (Full box)"
    price: { type: Number, required: true },
    salePrice: { type: Number },
    stock: { type: Number, default: 0 }
});

const productSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    name: { type: String, required: true },
    brand: {
        type: String,
        required: true,
        enum: ['AFNAN', 'CHANEL', 'GUCCI', 'HERMES', 'YSL', 'DIOR']
    },
    // Danh mục theo giới tính
    gender: {
        type: String,
        required: true,
        enum: ['Nam', 'Nu', 'Unisex']
    },
    // Loại nước hoa: chiết hoặc full
    type: {
        type: String,
        enum: ['Chiết', 'Full'],
        default: 'Full'
    },
    // Danh mục mùi hương chính
    scentCategory: {
        type: String,
        enum: ['Hoa', 'Go', 'Cam', 'Ngot'],
        required: true
    },
    // Các nốt hương chi tiết
    scentNotes: [{ type: String }],
    // Xuất xứ
    origin: { type: String, required: true },
    // Mô tả
    description: { type: String },
    // Hình ảnh
    images: [{ type: String }],
    // Bảng giá theo ml
    volumes: [volumePriceSchema],
    // Thông tin chung (dùng cho sản phẩm full không chiết)
    price: { type: Number },
    salePrice: { type: Number },
    stock: { type: Number, default: 0 },
    // Trọng lượng (gram) dùng để tính phí vận chuyển GHN
    weight: { type: Number, default: 200 },
    // Đánh giá
    reviews: [reviewSchema],
    rating: { type: Number, default: 0 },
    numReviews: { type: Number, default: 0 },
    // Lượt bán
    sold: { type: Number, default: 0 },
    // Trạng thái
    isHot: { type: Boolean, default: false },
    isSale: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);
