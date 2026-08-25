import express from 'express';
import {
    checkVoucher,
    createVoucher,
    getVouchers,
    getPublicVouchers,
    deleteVoucher,
    updateVoucher,
    deleteAllVouchers
} from '../controllers/voucherController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public route must be before /:id to avoid "public" being parsed as an id
router.get('/public', getPublicVouchers);

router.route('/')
    .get(protect, admin, getVouchers)
    .post(protect, admin, createVoucher);

router.post('/check', protect, checkVoucher);
router.delete('/all', protect, admin, deleteAllVouchers);

router.route('/:id')
    .put(protect, admin, updateVoucher)
    .delete(protect, admin, deleteVoucher);

export default router;
