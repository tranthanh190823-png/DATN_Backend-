import Voucher from '../models/Voucher.js';

// @desc    Check & apply voucher
// @route   POST /api/vouchers/check
// @access  Private
const checkVoucher = async (req, res) => {
    try {
        const { code, orderValue } = req.body;

        if (!code || orderValue === undefined) {
            return res.status(400).json({ message: 'Vui lòng cung cấp mã voucher và giá trị đơn hàng' });
        }

        const voucher = await Voucher.findOne({ code: code.toUpperCase() });

        if (!voucher) {
            return res.status(404).json({ message: 'Mã giảm giá không tồn tại' });
        }

        if (!voucher.isActive) {
            return res.status(400).json({ message: 'Mã giảm giá đã bị khóa' });
        }

        if (new Date() > new Date(voucher.expirationDate)) {
            return res.status(400).json({ message: 'Mã giảm giá đã hết hạn' });
        }

        if (voucher.usedCount >= voucher.usageLimit) {
            return res.status(400).json({ message: 'Mã giảm giá đã hết lượt sử dụng' });
        }

        if (orderValue < voucher.minOrderValue) {
            return res.status(400).json({ message: `Đơn hàng tối thiểu để áp dụng mã này là ${voucher.minOrderValue.toLocaleString()}đ` });
        }

        // Tính toán số tiền được giảm
        let discountAmount = 0;

        if (voucher.discountType === 'FREE_SHIP') {
            // Free ship mã sẽ được Frontend xử lý trừ vào tiền ship, ở đây trả về discountAmount = 0 nhưng có type
            discountAmount = 0;
        } else if (voucher.discountType === 'FIXED') {
            discountAmount = voucher.maxDiscountAmount;
        } else {
            // PERCENTAGE (Mặc định)
            discountAmount = (orderValue * voucher.discountPercentage) / 100;
            // Nếu có giới hạn số tiền giảm tối đa
            if (voucher.maxDiscountAmount > 0 && discountAmount > voucher.maxDiscountAmount) {
                discountAmount = voucher.maxDiscountAmount;
            }
        }

        res.json({
            code: voucher.code,
            discountType: voucher.discountType || 'PERCENTAGE',
            discountPercentage: voucher.discountPercentage,
            discountAmount,
            message: 'Áp dụng mã giảm giá thành công!'
        });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi kiểm tra mã giảm giá' });
    }
};

// @desc    Create a voucher
// @route   POST /api/vouchers
// @access  Private/Admin
const createVoucher = async (req, res) => {
    try {
        const {
            code,
            discountType,
            discountPercentage,
            maxDiscountAmount,
            minOrderValue,
            expirationDate,
            usageLimit,
            isActive
        } = req.body;

        const voucherExists = await Voucher.findOne({ code: code.toUpperCase() });

        if (voucherExists) {
            return res.status(400).json({ message: 'Mã giảm giá này đã tồn tại' });
        }

        const voucher = new Voucher({
            code: code.toUpperCase(),
            discountType: discountType || 'PERCENTAGE',
            discountPercentage: discountPercentage || 0,
            maxDiscountAmount: maxDiscountAmount || 0,
            minOrderValue: minOrderValue || 0,
            expirationDate,
            usageLimit,
            isActive
        });

        const createdVoucher = await voucher.save();
        res.status(201).json(createdVoucher);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi tạo mã giảm giá' });
    }
};

// @desc    Get all vouchers
// @route   GET /api/vouchers
// @access  Private/Admin
const getVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find({});
        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách mã giảm giá' });
    }
};

// @desc    Get public available vouchers
// @route   GET /api/vouchers/public
// @access  Public
const getPublicVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find({
            isActive: true,
            expirationDate: { $gt: new Date() },
            $expr: { $lt: ["$usedCount", "$usageLimit"] }
        }).select('-__v -createdAt -updatedAt'); // Ẩn bớt các trường không cần thiết
        res.json(vouchers);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách mã giảm giá' });
    }
};

// @desc    Delete a voucher
// @route   DELETE /api/vouchers/:id
// @access  Private/Admin
const deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (voucher) {
            await Voucher.deleteOne({ _id: voucher._id });
            res.json({ message: 'Đã xóa mã giảm giá' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy mã giảm giá' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi xóa mã giảm giá' });
    }
};

// @desc    Update a voucher
// @route   PUT /api/vouchers/:id
// @access  Private/Admin
const updateVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);

        if (voucher) {
            voucher.code = req.body.code ? req.body.code.toUpperCase() : voucher.code;
            voucher.discountType = req.body.discountType ?? voucher.discountType;
            voucher.discountPercentage = req.body.discountPercentage ?? voucher.discountPercentage;
            voucher.maxDiscountAmount = req.body.maxDiscountAmount ?? voucher.maxDiscountAmount;
            voucher.minOrderValue = req.body.minOrderValue ?? voucher.minOrderValue;
            voucher.expirationDate = req.body.expirationDate ?? voucher.expirationDate;
            voucher.usageLimit = req.body.usageLimit ?? voucher.usageLimit;
            voucher.isActive = req.body.isActive ?? voucher.isActive;

            const updatedVoucher = await voucher.save();
            res.json(updatedVoucher);
        } else {
            res.status(404).json({ message: 'Không tìm thấy mã giảm giá' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật mã giảm giá' });
    }
};

export {
    checkVoucher,
    createVoucher,
    getVouchers,
    getPublicVouchers,
    deleteVoucher,
    updateVoucher
};
