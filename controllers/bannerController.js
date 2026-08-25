import Banner from '../models/Banner.js';

// @desc    Get public active banners
// @route   GET /api/banners/public
// @access  Public
const getPublicBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: -1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách banner' });
    }
};

// @desc    Get all banners (Admin)
// @route   GET /api/banners
// @access  Private/Admin
const getAllBanners = async (req, res) => {
    try {
        const banners = await Banner.find({}).sort({ order: 1, createdAt: -1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy danh sách banner' });
    }
};

// @desc    Create a new banner (Admin)
// @route   POST /api/banners
// @access  Private/Admin
const createBanner = async (req, res) => {
    try {
        const { title, subtitle, imageUrl, link, buttonText, position, order, isActive } = req.body;

        if (!title || !imageUrl) {
            return res.status(400).json({ message: 'Vui lòng cung cấp tiêu đề và hình ảnh banner' });
        }

        const banner = new Banner({
            title,
            subtitle: subtitle || '',
            imageUrl,
            link: link || '/shop',
            buttonText: buttonText || 'Khám phá ngay',
            position: position || 'HERO_SLIDE',
            order: order !== undefined ? Number(order) : 0,
            isActive: isActive !== undefined ? isActive : true
        });

        const createdBanner = await banner.save();
        res.status(201).json(createdBanner);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi tạo banner mới' });
    }
};

// @desc    Update a banner (Admin)
// @route   PUT /api/banners/:id
// @access  Private/Admin
const updateBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Không tìm thấy banner' });
        }

        banner.title = req.body.title ?? banner.title;
        banner.subtitle = req.body.subtitle ?? banner.subtitle;
        banner.imageUrl = req.body.imageUrl ?? banner.imageUrl;
        banner.link = req.body.link ?? banner.link;
        banner.buttonText = req.body.buttonText ?? banner.buttonText;
        banner.position = req.body.position ?? banner.position;
        banner.order = req.body.order !== undefined ? Number(req.body.order) : banner.order;
        banner.isActive = req.body.isActive ?? banner.isActive;

        const updatedBanner = await banner.save();
        res.json(updatedBanner);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật banner' });
    }
};

// @desc    Delete a banner (Admin)
// @route   DELETE /api/banners/:id
// @access  Private/Admin
const deleteBanner = async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Không tìm thấy banner' });
        }

        await Banner.deleteOne({ _id: banner._id });
        res.json({ message: 'Đã xóa banner thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi xóa banner' });
    }
};

export {
    getPublicBanners,
    getAllBanners,
    createBanner,
    updateBanner,
    deleteBanner
};
