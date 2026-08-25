import mongoose from 'mongoose';

<<<<<<< HEAD
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
=======
const bannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        link: {
            type: String,
            required: false,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        order: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Banner = mongoose.model('Banner', bannerSchema);

>>>>>>> 30d2760bd365b8f897f16b65f6e71130fb915ed8
export default Banner;
