import express from 'express';
import {
    addOrderItems,
    getOrderById,
    updateOrderToPaid,
    updateOrderToProcessed,
    updateOrderToShipping,
    updateOrderToDelivered,
    getMyOrders,
    getOrders,
    cancelOrder,
    deleteAllOrders
} from '../controllers/orderController.js';
import { sepayWebhook } from '../controllers/sepayController.js';
import {
    createPaymentUrl,
    vnpayReturn,
    requestRefund,
    approveRefundRequest,
    rejectRefundRequest,
    refundOrder
} from '../controllers/vnpayController.js';
import { protect, admin } from '../middlewares/authMiddleware.js';

import Order from '../models/Order.js';
import User from '../models/User.js';

const router = express.Router();

router.route('/')
    .post(protect, addOrderItems)
    .get(protect, admin, getOrders);

router.route('/mine').get(protect, getMyOrders);
router.route('/all').delete(protect, admin, deleteAllOrders);

// SePay Webhook (Public route)
router.post('/sepay/webhook', sepayWebhook);

// VNPay routes
router.post('/vnpay_return', vnpayReturn);
router.route('/:id/create_payment_url').post(protect, createPaymentUrl);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/process').put(protect, admin, updateOrderToProcessed);
router.route('/:id/ship').put(protect, admin, updateOrderToShipping);
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);
router.route('/:id/cancel').put(protect, cancelOrder);

router.route('/:id/request-refund').put(protect, requestRefund);
router.route('/:id/refund-request/approve').put(protect, admin, approveRefundRequest);
router.route('/:id/refund-request/reject').put(protect, admin, rejectRefundRequest);
router.route('/:id/refund').put(protect, admin, refundOrder);

export default router;
