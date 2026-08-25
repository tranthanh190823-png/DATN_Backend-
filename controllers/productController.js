import Product from '../models/Product.js';

// Lấy danh sách sản phẩm
const getProducts = async (req, res) => {
    try {
        const pageSize = Number(req.query.limit) || 12;
        const page = Number(req.query.pageNumber) || 1;

        const keyword = req.query.keyword ? {
            name: { $regex: req.query.keyword, $options: 'i' }
        } : {};

        // Filter theo category chung (nếu dùng)
        let categoryFilter = {};
        if (req.query.category) {
            const cat = req.query.category;
            if (cat === 'Nam' || cat === 'nam') categoryFilter = { gender: 'Nam' };
            else if (cat === 'Nữ' || cat === 'Nu' || cat === 'nữ' || cat === 'nu') categoryFilter = { gender: 'Nu' };
            else if (cat === 'Unisex' || cat === 'unisex') categoryFilter = { gender: 'Unisex' };
            else categoryFilter = { scentCategory: cat };
        }

        // Filter riêng biệt theo gender
        let genderFilter = {};
        if (req.query.gender) {
            let gen = req.query.gender;
            if (gen === 'Nữ' || gen === 'nữ' || gen === 'nu') gen = 'Nu';
            else if (gen === 'nam') gen = 'Nam';
            else if (gen === 'unisex') gen = 'Unisex';
            genderFilter = { gender: gen };
        }

        // Filter riêng biệt theo scentCategory
        let scentFilter = {};
        if (req.query.scentCategory) {
            scentFilter = { scentCategory: req.query.scentCategory };
        }

        // Filter theo brand
        let brandFilter = {};
        if (req.query.brand) {
            const brands = req.query.brand.split(',');
            brandFilter = { brand: { $in: brands.map(b => new RegExp(`^${b}$`, 'i')) } };
        }

        // Lọc theo dung tích
        let volumeFilter = {};
        if (req.query.volume) {
            const vol = req.query.volume.toLowerCase() === 'full' ? 100 : Number(req.query.volume);
            volumeFilter = { 'volumes.ml': vol };
        }

        const priceFilter = (req.query.minPrice || req.query.maxPrice) ? {
            price: {
                $gte: Number(req.query.minPrice) || 0,
                $lte: Number(req.query.maxPrice) || 100000000
            }
        } : {};

        // Filter theo flags
        let flagFilter = {};
        if (req.query.isBestSeller === 'true') flagFilter.isBestSeller = true;
        if (req.query.isNewArrival === 'true') flagFilter.isNewArrival = true;
        if (req.query.isSale === 'true') flagFilter.isSale = true;
        if (req.query.isHot === 'true') flagFilter.isHot = true;

        // Filter theo type
        let typeFilter = {};
        if (req.query.type) {
            let typeVal = req.query.type;
            if (typeVal === 'decant') typeVal = 'Chiết';
            else if (typeVal === 'perfume') typeVal = 'Full';
            typeFilter = { type: typeVal };
        }

        const filter = { ...keyword, ...categoryFilter, ...genderFilter, ...scentFilter, ...brandFilter, ...priceFilter, ...volumeFilter, ...flagFilter, ...typeFilter };

        // Xác định tuỳ chọn sắp xếp
        let sortOption = { createdAt: -1 };
        if (req.query.sort === 'newest') sortOption = { createdAt: -1 };
        else if (req.query.sort === 'best_seller') sortOption = { numReviews: -1, rating: -1 };
        else if (req.query.sort === 'price-asc') sortOption = { effectivePrice: 1 };
        else if (req.query.sort === 'price-desc') sortOption = { effectivePrice: -1 };
        else if (req.query.sort === 'rating') sortOption = { rating: -1 };
        else if (req.query.sort === 'discount_desc') sortOption = { discountPercent: -1 };

        // Pipeline tối ưu: Lọc -> Tính toán (giá thực tế, % giảm giá) -> Sắp xếp -> Phân trang bằng $facet
        const pipeline = [
            { $match: filter },
            {
                $addFields: {
                    effectivePrice: {
                        $cond: {
                            if: { $and: [{ $gt: ["$salePrice", 0] }, { $lt: ["$salePrice", "$price"] }] },
                            then: "$salePrice",
                            else: "$price"
                        }
                    },
                    discountPercent: {
                        $cond: {
                            if: { $and: [{ $gt: ["$price", 0] }, { $gt: ["$salePrice", 0] }, { $lt: ["$salePrice", "$price"] }] },
                            then: { $divide: [{ $subtract: ["$price", "$salePrice"] }, "$price"] },
                            else: 0
                        }
                    }
                }
            },
            { $sort: sortOption },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: pageSize * (page - 1) }, { $limit: pageSize }]
                }
            }
        ];

        const results = await Product.aggregate(pipeline);
        const count = results[0].metadata.length > 0 ? results[0].metadata[0].total : 0;
        const products = results[0].data;

        res.json({ products, page, pages: Math.ceil(count / pageSize), count });
    } catch (error) {
        console.error("Lỗi lấy danh sách sản phẩm:", error);
        res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu sản phẩm' });
    }
};

// Lấy chi tiết 1 sản phẩm
const getProductById = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// @desc    Xóa sản phẩm
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (product) {
            await Product.deleteOne({ _id: product._id });
            res.json({ message: 'Sản phẩm đã được xóa' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi xóa sản phẩm' });
    }
};

const createProduct = async (req, res) => {
    try {
        const product = new Product({
            name: 'Tên sản phẩm rỗng',
            brand: 'CHANEL',
            gender: 'Unisex',
            origin: 'Pháp',
            price: 0,
            user: req.user._id,
            images: ['https://via.placeholder.com/600'],
            scentCategory: 'Hoa',
            stock: 0,
            salePrice: 0,
            description: 'Mô tả sản phẩm rỗng',
            size: 'N/A',
            isNewArrival: true
        });

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi tạo sản phẩm mới' });
    }
};

// @desc    Cập nhật dữ liệu sản phẩm
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
    try {
        const {
            name, brand, price, salePrice, description, images,
            category, scentCategory, scentNotes, stock, rating,
            isHot, isSale, isBestSeller, isNewArrival,
            gender, origin, volumes, isActive, type
        } = req.body;

        const product = await Product.findById(req.params.id);

        if (product) {
            product.name = name !== undefined ? name : product.name;
            if (brand) product.brand = brand;
            product.price = price !== undefined ? price : product.price;
            product.salePrice = salePrice !== undefined ? salePrice : product.salePrice;
            product.description = description !== undefined ? description : product.description;
            product.images = images !== undefined ? images : product.images;
            if (category !== undefined) product.category = category;
            if (scentCategory !== undefined) product.scentCategory = scentCategory;
            product.scentNotes = scentNotes !== undefined ? scentNotes : product.scentNotes;
            product.stock = stock !== undefined ? stock : product.stock;
            product.rating = rating !== undefined ? rating : product.rating;
            product.isHot = isHot !== undefined ? isHot : product.isHot;
            product.isSale = isSale !== undefined ? isSale : product.isSale;
            product.isBestSeller = isBestSeller !== undefined ? isBestSeller : product.isBestSeller;
            product.isNewArrival = isNewArrival !== undefined ? isNewArrival : product.isNewArrival;
            if (gender !== undefined) product.gender = gender;
            if (origin !== undefined) product.origin = origin;
            if (volumes !== undefined) product.volumes = volumes;
            if (isActive !== undefined) product.isActive = isActive;
            if (type !== undefined) product.type = type;

            const updatedProduct = await product.save();
            res.json(updatedProduct);
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật sản phẩm' });
    }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res) => {
    try {
        const { rating, comment } = req.body;

        const product = await Product.findById(req.params.id);

        if (product) {
            const alreadyReviewed = product.reviews.find(
                (r) => r.user && r.user.toString() === req.user._id.toString()
            );

            if (alreadyReviewed) {
                return res.status(400).json({ message: 'Bạn đã đánh giá sản phẩm này rồi' });
            }

            const review = {
                name: req.user.name,
                rating: Number(rating),
                comment,
                user: req.user._id,
            };

            product.reviews.push(review);
            product.numReviews = product.reviews.length;

            product.rating =
                product.reviews.reduce((acc, item) => item.rating + acc, 0) /
                product.reviews.length;

            await product.save();
            res.status(201).json({ message: 'Đã thêm đánh giá' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi thêm đánh giá' });
    }
};

// @desc    Get top rated products
// @route   GET /api/products/top
// @access  Public
const getTopProducts = async (req, res) => {
    try {
        const products = await Product.find({}).sort({ rating: -1 }).limit(4);
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy sản phẩm nổi bật' });
    }
};

// @desc    Get all reviews from all products
// @route   GET /api/products/reviews/all
// @access  Private/Admin
const getAllReviews = async (req, res) => {
    try {
        const products = await Product.find({ 'reviews.0': { $exists: true } });
        let allReviews = [];

        products.forEach(product => {
            product.reviews.forEach(review => {
                allReviews.push({
                    _id: review._id,
                    productId: product._id,
                    productName: product.name,
                    user: review.user,
                    name: review.name,
                    rating: review.rating,
                    comment: review.comment,
                    status: review.status || 'VISIBLE',
                    createdAt: review.createdAt
                });
            });
        });

        // Sort by newest
        allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json(allReviews);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi lấy đánh giá' });
    }
};

// @desc    Update review status
// @route   PUT /api/products/:productId/reviews/:reviewId/status
// @access  Private/Admin
const updateReviewStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const product = await Product.findById(req.params.productId);

        if (product) {
            const review = product.reviews.id(req.params.reviewId);
            if (review) {
                review.status = status;
                await product.save();
                res.json({ message: 'Đã cập nhật trạng thái đánh giá' });
            } else {
                res.status(404).json({ message: 'Không tìm thấy đánh giá' });
            }
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server khi cập nhật đánh giá' });
    }
};

const clearAllProductReviews = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            product.reviews = [];
            product.numReviews = 0;
            product.rating = 0;
            await product.save();
            res.json({ message: 'Đã xóa tất cả đánh giá' });
        } else {
            res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Lỗi server' });
    }
};

// @desc    Bulk increase stock for all products (for testing/demo)
// @route   PUT /api/products/bulk-stock
// @access  Private/Admin
const bulkIncreaseStock = async (req, res) => {
    try {
        const { amount } = req.body;
        const increaseAmount = Number(amount) || 100;
        
        const products = await Product.find({});
        
        for (let product of products) {
            // Increase general stock
            if (product.stock !== undefined) {
                product.stock += increaseAmount;
            }
            
            // Increase variant stock
            if (product.volumes && product.volumes.length > 0) {
                product.volumes.forEach(vol => {
                    vol.stock = (vol.stock || 0) + increaseAmount;
                });
            }
            
            await product.save();
        }
        
        res.json({ message: `Đã tăng ${increaseAmount} số lượng tồn kho cho ${products.length} sản phẩm thành công!` });
    } catch (error) {
        console.error('Bulk increase stock error:', error);
        res.status(500).json({ message: 'Lỗi server khi cập nhật hàng loạt tồn kho' });
    }
};

export { 
    getProducts, 
    getProductById, 
    deleteProduct, 
    createProduct, 
    updateProduct,
    createProductReview,
    getTopProducts,
    getAllReviews,
    updateReviewStatus,
    clearAllProductReviews,
    bulkIncreaseStock
};
