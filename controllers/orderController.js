import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Voucher from '../models/Voucher.js';
import { notifyOrderPaid, notifyOrderPlaced } from '../utils/sendOrderPaymentEmail.js';

// Helper for status sorting
const statusWeight = {
    'Chờ xử lý': 1,
    'Đã xử lý': 2,
    'Đang giao': 3,
    'Đã giao': 4,
    'Đã hủy': 5
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = async (req, res) => {
    try {
        let orders = await Order.find({})
            .populate('user', 'id name email phone')
            .lean(); // Bắt buộc lấy DATA gốc từ MongoDB, không bị Mongoose Schema cũ loại bỏ field
            
        // Fallback for old orders missing phone in database
        orders = orders.map(order => {
            if (order.shippingAddress && !order.shippingAddress.phone) {
                order.shippingAddress.phone = order.user?.phone || '0358989902';
            }
            return order;
        });
        
        orders.sort((a, b) => {
            const aStatus = a.status || (a.isDelivered ? 'Đã giao' : (a.isCancelled ? 'Đã hủy' : 'Chờ xử lý'));
            const bStatus = b.status || (b.isDelivered ? 'Đã giao' : (b.isCancelled ? 'Đã hủy' : 'Chờ xử lý'));

            const aCompleted = aStatus === 'Đã giao' || aStatus === 'Đã hủy';
            const bCompleted = bStatus === 'Đã giao' || bStatus === 'Đã hủy';

            // Đẩy các đơn chưa hoàn thành lên trên, đơn đã giao/hủy xuống cuối
            if (!aCompleted && bCompleted) return -1;
            if (aCompleted && !bCompleted) return 1;

            // Trong nhóm chưa hoàn thành, đơn mới mua sẽ nằm cuối (cũ nhất lên trên)
            if (!aCompleted && !bCompleted) {
                return new Date(a.createdAt) - new Date(b.createdAt);
            }

        // Trong nhóm đã hoàn thành, đơn mới nhất lên trên
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    console.log("LATEST ORDER SHIPPING ADDRESS:", orders[0]?.shippingAddress);

    res.json(orders);
} catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách đơn hàng' });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        let order = await Order.findById(req.params.id)
            .populate('user', 'name email phone')
            .lean(); // BYPASS MONGOOSE SCHEMA CACHE

        if (order) {
            if (order.shippingAddress && !order.shippingAddress.phone) {
                order.shippingAddress.phone = order.user?.phone || '0358989902';
            }
            res.json(order);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy chi tiết đơn hàng' });
    }
};

// @desc    Update order to processed
// @route   PUT /api/orders/:id/process
// @access  Private/Admin
const updateOrderToProcessed = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            if (order.status !== 'Chờ xử lý') {
                return res.status(400).json({ message: 'Chỉ có thể xử lý đơn hàng ở trạng thái Chờ xử lý' });
            }
            order.status = 'Đã xử lý';
            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái' });
    }
};

// @desc    Update order to shipping
// @route   PUT /api/orders/:id/ship
// @access  Private/Admin
const updateOrderToShipping = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            if (order.status !== 'Đã xử lý') {
                return res.status(400).json({ message: 'Đơn hàng phải được xác nhận (Đã xử lý) trước khi giao' });
            }
            order.status = 'Đang giao';
            const updatedOrder = await order.save();
            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái' });
    }
};

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin
const updateOrderToDelivered = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            if (order.status !== 'Đang giao') {
                return res.status(400).json({ message: 'Chỉ có thể hoàn thành đơn hàng đang giao' });
            }

            const wasAlreadyPaid = order.isPaid;

            order.status = 'Đã giao';
            order.isDelivered = true;
            order.deliveredAt = Date.now();

            // Coi như đã thanh toán khi giao thành công (phục vụ hoàn/trả hàng)
            if (!order.isPaid) {
                order.isPaid = true;
                order.paidAt = Date.now();
            }

            const updatedOrder = await order.save();

            if (!wasAlreadyPaid && updatedOrder.isPaid) {
                notifyOrderPaid(updatedOrder).catch((err) =>
                    console.error('[Order Email] paid (deliver) failed:', err.message)
                );
            }

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái giao hàng' });
    }
};

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (order) {
            const wasAlreadyPaid = order.isPaid;
            order.isPaid = true;
            order.paidAt = Date.now();
            const updatedOrder = await order.save();

            if (!wasAlreadyPaid) {
                notifyOrderPaid(updatedOrder).catch((err) =>
                    console.error('[Order Email] paid failed:', err.message)
                );
            }

            res.json(updatedOrder);
        } else {
            res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái thanh toán' });
    }
};

// @desc    Cancel order (hoặc cập nhật lý do hủy nếu đơn đã hủy)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
        }

        const reason = String(req.body?.reason ?? '').trim();
        if (!reason || reason.length < 5) {
            return res.status(400).json({ message: 'Vui lòng nhập lý do hủy đơn (ít nhất 5 ký tự)' });
        }

        // Lấy thông tin hoàn tiền thủ công (nếu có)
        const refundBankAccount = String(req.body?.refundBankAccount ?? '').trim();
        const refundBankName = String(req.body?.refundBankName ?? '').trim();
        const refundBankBank = String(req.body?.refundBankBank ?? '').trim();
        const refundTransferImage = String(req.body?.refundTransferImage ?? '').trim();

        // Đơn đã hủy: cho phép sửa lại lý do hủy (persist vào DB)
        if (order.isCancelled || order.status === 'Đã hủy') {
            if (!req.user.isAdmin) {
                if (order.user.toString() !== req.user._id.toString()) {
                    return res.status(403).json({ message: 'Không có quyền sửa lý do hủy đơn này' });
                }
            }
            const updateFields = { cancelReason: reason, isCancelled: true, status: 'Đã hủy' };
            if (refundBankAccount) updateFields.refundBankAccount = refundBankAccount;
            if (refundBankName) updateFields.refundBankName = refundBankName;
            if (refundBankBank) updateFields.refundBankBank = refundBankBank;
            if (refundTransferImage) updateFields.refundTransferImage = refundTransferImage;

            const updatedOrder = await Order.findByIdAndUpdate(
                order._id,
                { $set: updateFields },
                { new: true }
            );
            return res.json(updatedOrder);
        }

        if (!req.user.isAdmin) {
            if (order.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Không có quyền hủy đơn hàng này' });
            }
            if (order.status !== 'Chờ xử lý') {
                return res.status(400).json({
                    message: 'Đơn đã được duyệt hoặc đang giao, không thể hủy. Nếu đã nhận hàng, vui lòng yêu cầu trả hàng/hoàn tiền.',
                });
            }
            if (order.isPaid) {
                return res.status(400).json({
                    message: 'Không thể tự hủy đơn hàng đã thanh toán. Vui lòng yêu cầu hoàn tiền nếu đủ điều kiện.',
                });
            }
        } else {
            if (!['Chờ xử lý', 'Đã xử lý', 'Đang giao'].includes(order.status)) {
                return res.status(400).json({ message: 'Chỉ có thể hủy đơn hàng chưa giao thành công' });
            }
        }

        // Hoàn lại kho
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product);
            if (product) {
                product.stock += item.qty;
                product.sold = Math.max(0, (product.sold || 0) - item.qty);
                if (item.volume && product.volumes) {
                    const volumeObj = product.volumes.find(v => v.ml === item.volume);
                    if (volumeObj) {
                        volumeObj.stock += item.qty;
                    }
                }
                await product.save();
            }
        }

        // Dùng findByIdAndUpdate để chắc chắn cancelReason được ghi vào MongoDB
        const updateFields = {
            cancelReason: reason,
            status: 'Đã hủy',
            isCancelled: true,
            cancelledAt: new Date(),
        };
        if (refundBankAccount) updateFields.refundBankAccount = refundBankAccount;
        if (refundBankName) updateFields.refundBankName = refundBankName;
        if (refundBankBank) updateFields.refundBankBank = refundBankBank;
        if (refundTransferImage) updateFields.refundTransferImage = refundTransferImage;

        const updatedOrder = await Order.findByIdAndUpdate(
            order._id,
            { $set: updateFields },
            { new: true }
        );

        res.json(updatedOrder);
    } catch (error) {
        console.error('[Cancel Order Error]:', error.message);
        res.status(500).json({ message: 'Lỗi server khi hủy đơn hàng', error: error.message });
    }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const addOrderItems = async (req, res) => {
    try {
        const {
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            shippingPrice,
            totalPrice,
            voucherCode,
            discountPrice
        } = req.body;

        console.log("=========================================");
        console.log("1. PAYLOAD TỪ FRONTEND GỬI LÊN (shippingAddress):", shippingAddress);

        if (orderItems && orderItems.length === 0) {
            return res.status(400).json({ message: 'Không có sản phẩm trong đơn hàng' });
        } else {
            const order = new Order({
                orderItems,
                user: req.user._id,
                shippingAddress,
                paymentMethod,
                itemsPrice,
                shippingPrice,
                totalPrice,
                voucherCode,
                discountPrice,
                status: 'Chờ xử lý',
                isPaid: paymentMethod === 'SEPAY' || paymentMethod === 'VNPAY',
                paidAt: paymentMethod === 'SEPAY' || paymentMethod === 'VNPAY' ? Date.now() : undefined
            });

            console.log("2. OBJECT SAU KHI MONGOOSE PARSE THEO SCHEMA:", order.shippingAddress);
            console.log("=========================================");

            const createdOrder = await order.save();
            
            // BYPASS MONGOOSE SCHEMA CACHE:
            if (shippingAddress) {
                const updateFields = {};
                if (shippingAddress.phone) {
                    updateFields["shippingAddress.phone"] = shippingAddress.phone;
                    createdOrder.shippingAddress.phone = shippingAddress.phone;
                }
                if (shippingAddress.fullName) {
                    updateFields["shippingAddress.fullName"] = shippingAddress.fullName;
                    createdOrder.shippingAddress.fullName = shippingAddress.fullName;
                }
                if (Object.keys(updateFields).length > 0) {
                    await mongoose.connection.db.collection('orders').updateOne(
                        { _id: createdOrder._id },
                        { $set: updateFields }
                    );
                }
            }

            // Tăng lượt bán cho các sản phẩm
            if (orderItems && orderItems.length > 0) {
                for (const item of orderItems) {
                    await Product.findByIdAndUpdate(
                        item.product,
                        { $inc: { sold: item.qty } }
                    ).catch(err => console.error('[Order Product] failed to increment sold:', err.message));
                }
            }

            // Nếu có mã voucher, tăng usedCount lên 1
            if (voucherCode) {
                await Voucher.findOneAndUpdate(
                    { code: voucherCode },
                    { $inc: { usedCount: 1 } }
                ).catch(err => console.error('[Order Voucher] failed to increment usedCount:', err.message));
            }

            // Mail xác nhận đặt hàng — không chặn response 201
            notifyOrderPlaced(createdOrder).catch((err) =>
                console.error('[Order Email] place failed:', err.message)
            );

            res.status(201).json(createdOrder);
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi tạo đơn hàng' });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    try {
        let orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean(); // BYPASS MONGOOSE SCHEMA CACHE
            
        // Fallback for old orders missing phone
        orders = orders.map(order => {
            if (order.shippingAddress && !order.shippingAddress.phone) {
                order.shippingAddress.phone = req.user?.phone || '0358989902';
            }
            return order;
        });
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách đơn hàng' });
    }
};

// @desc    Delete all orders
// @route   DELETE /api/orders/all
// @access  Private/Admin
const deleteAllOrders = async (req, res) => {
    try {
        const result = await Order.deleteMany({});
        res.json({ message: `Đã xóa ${result.deletedCount} đơn hàng`, deletedCount: result.deletedCount });
    } catch (error) {
        console.error('[Delete All Orders Error]:', error.message);
        res.status(500).json({ message: 'Lỗi server khi xóa đơn hàng' });
    }
};

export {
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
};
