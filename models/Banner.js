import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    imageUrl: { type: String, required: true },
    link: { type: String, default: '/shop' },
    buttonText: { type: String, default: 'Khám phá ngay' },
    position: {
        type: String,
        enum: ['HERO_SLIDE', 'PROMO_BANNER_1', 'PROMO_BANNER_2', 'POPUP'],
        default: 'HERO_SLIDE'
    },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
}, {
    timestamps: true
});

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
