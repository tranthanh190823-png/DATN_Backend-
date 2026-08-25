import express from 'express';
import {
    getRewardInfo,
    checkIn,
    getShopItems,
    exchangeCoin,
    playRockPaperScissors,
    getAdminShopItems,
    createShopItem,
    updateShopItem,
    deleteShopItem
} from '../controllers/gameController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.get('/info', protect, getRewardInfo);
router.post('/checkin', protect, checkIn);
router.get('/shop', getShopItems);
router.post('/exchange', protect, exchangeCoin);
router.post('/play-rps', protect, playRockPaperScissors);

// Admin Routes
router.get('/admin/shop', protect, admin, getAdminShopItems);
router.post('/admin/shop', protect, admin, createShopItem);
router.put('/admin/shop/:id', protect, admin, updateShopItem);
router.delete('/admin/shop/:id', protect, admin, deleteShopItem);

export default router;
