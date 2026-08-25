import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const addressSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
    company: { type: String },
    address: { type: String, required: true },
    province: { type: String, required: true },
    district: { type: String, required: true },
    ward: { type: String, required: true },
    provinceName: { type: String },
    districtName: { type: String },
    wardName: { type: String },
    isDefault: { type: Boolean, default: false }
});

const cartItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, default: '' },
    image: { type: String, default: '' },
    price: { type: Number, default: 0 },
    qty: { type: Number, default: 1 },
    volume: { type: Number },
    countInStock: { type: Number }
});

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    // Tên đầy đủ (tự động ghép hoặc đặt thủ công)
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: function () {
            // Không yêu cầu password nếu đăng nhập bằng Google
            return !this.googleId;
        }
    },
    // Google OAuth
    googleId: {
        type: String,
        sparse: true,
        unique: true
    },
    googleAvatar: {
        type: String
    },
    // Quyền
    isAdmin: {
        type: Boolean,
        required: true,
        default: false
    },
    // Nhân viên (quản lý đơn hàng & sản phẩm, không xóa user)
    isStaff: {
        type: Boolean,
        default: false
    },
    // Avatar
    avatar: {
        type: String
    },
    // Trạng thái
    isActive: {
        type: Boolean,
        default: true
    },
    // Khôi phục mật khẩu
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    // Mini Game / Rewards
    dailyGamePlays: {
        type: Number,
        default: 0
    },
    lastGamePlayedAt: {
        type: Date
    },
    coins: {
        type: Number,
        default: 0
    },
    checkInStreak: {
        type: Number,
        default: 0
    },
    lastCheckInDate: {
        type: Date
    },
    // Danh sách địa chỉ
    addresses: [addressSchema],
    // Danh sách sản phẩm yêu thích
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    // Giỏ hàng
    cart: [cartItemSchema]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Tự động tạo name từ firstName + lastName, hash password
userSchema.pre('save', async function () {
    // Ghép tên đầy đủ
    if (this.isModified('firstName') || this.isModified('lastName')) {
        this.name = `${this.firstName} ${this.lastName}`.trim();
    }

    // Hash password nếu có thay đổi
    if (this.isModified('password') && this.password) {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

// Phương thức kiểm tra mật khẩu
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

// Phương thức tạo token reset mật khẩu
userSchema.methods.getResetPasswordToken = function () {
    // Tạo token ngẫu nhiên
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token và lưu vào db
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Set hạn dùng token (15 phút)
    this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    return resetToken;
};

// Virtual để lấy địa chỉ mặc định
userSchema.virtual('defaultAddress').get(function () {
    if (this.addresses && this.addresses.length > 0) {
        return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
    }
    return null;
});

const User = mongoose.model('User', userSchema);
export default User;
