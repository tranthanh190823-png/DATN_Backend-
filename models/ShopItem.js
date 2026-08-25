import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    cost: {
        type: Number,
        required: true,
        min: 0
    },
    discountPercentage: {
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    maxDiscountAmount: {
        type: Number,
        required: true,
        min: 0
    },
    minOrderValue: {
        type: Number,
        default: 0
    },
    // icon field removed per user request
    // isActive: { type: Boolean, default: true }
    isActive: {
        type: Boolean,
        default: true
    }

}, {
    timestamps: true
});

const ShopItem = mongoose.model('ShopItem', shopItemSchema);
export default ShopItem;
