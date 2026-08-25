import express from 'express';
import {
<<<<<<< HEAD
    getPublicBanners,
    getAllBanners,
    createBanner,
    updateBanner,
    deleteBanner
=======
    getBanners,
    getActiveBanners,
    createBanner,
    updateBanner,
    deleteBanner,
>>>>>>> 30d2760bd365b8f897f16b65f6e71130fb915ed8
} from '../controllers/bannerController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

<<<<<<< HEAD
router.get('/public', getPublicBanners);

router.route('/')
    .get(protect, admin, getAllBanners)
    .post(protect, admin, createBanner);

=======
router.route('/')
    .get(getBanners)
    .post(protect, admin, createBanner);

router.route('/active').get(getActiveBanners);

>>>>>>> 30d2760bd365b8f897f16b65f6e71130fb915ed8
router.route('/:id')
    .put(protect, admin, updateBanner)
    .delete(protect, admin, deleteBanner);

export default router;
