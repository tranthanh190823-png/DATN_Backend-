import Voucher from '../models/Voucher.js';
import User from '../models/User.js';
import ShopItem from '../models/ShopItem.js';
import moment from 'moment';
import crypto from 'crypto';

const DAILY_COIN_REWARD = 50;
const STREAK_COIN_REWARD = 100; // Thưởng thêm ở ngày 7

// @desc    Lấy thông tin điểm danh & xu
// @route   GET /api/rewards/info
// @access  Private
const getRewardInfo = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }

    const today = moment().startOf('day');
    const lastCheckIn = user.lastCheckInDate ? moment(user.lastCheckInDate).startOf('day') : null;

    let hasCheckedInToday = false;
    if (lastCheckIn && lastCheckIn.isSame(today)) {
        hasCheckedInToday = true;
    }

    let currentStreak = user.checkInStreak || 0;
    
    // Nếu ngày cuối checkin nhỏ hơn hôm qua => Đứt chuỗi
    if (lastCheckIn && lastCheckIn.isBefore(moment(today).subtract(1, 'days'))) {
        currentStreak = 0;
    }

    const lastPlayed = user.lastGamePlayedAt ? moment(user.lastGamePlayedAt).startOf('day') : null;
    const rpsPlaysToday = (lastPlayed && lastPlayed.isSame(today)) ? (user.dailyGamePlays || 0) : 0;

    res.json({
        coins: user.coins || 0,
        checkInStreak: currentStreak,
        hasCheckedInToday,
        rpsPlaysToday
    });
};

// @desc    Thực hiện điểm danh
// @route   POST /api/rewards/checkin
// @access  Private
const checkIn = async (req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }

    const today = moment().startOf('day');
    const lastCheckIn = user.lastCheckInDate ? moment(user.lastCheckInDate).startOf('day') : null;

    if (lastCheckIn && lastCheckIn.isSame(today)) {
        res.status(400);
        throw new Error('Bạn đã điểm danh hôm nay rồi!');
    }

    let currentStreak = user.checkInStreak || 0;

    // Reset nếu đứt chuỗi
    if (lastCheckIn && lastCheckIn.isBefore(moment(today).subtract(1, 'days'))) {
        currentStreak = 0;
    }

    currentStreak += 1;
    let earnedCoins = DAILY_COIN_REWARD;
    let wonVoucher = null;

    // Nếu đạt 30 ngày
    if (currentStreak === 30) {
        earnedCoins += STREAK_COIN_REWARD;
        
        // Tặng 1 voucher giảm 500k cho đơn từ 1 triệu
        const code = `STREAK30-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        wonVoucher = await Voucher.create({
            code,
            discountPercentage: 100, // 100%
            maxDiscountAmount: 500000, // Nhưng tối đa 500k -> Thành voucher cố định 500k
            minOrderValue: 1000000, // Cho đơn từ 1 triệu
            expirationDate: moment().add(30, 'days').toDate(),
            usageLimit: 1
        });

        // Reset chuỗi để bắt đầu vòng mới
        currentStreak = 0;
    }

    user.coins = (user.coins || 0) + earnedCoins;
    user.checkInStreak = currentStreak;
    user.lastCheckInDate = new Date();
    await user.save();

    res.json({
        message: wonVoucher ? `Điểm danh ngày 30 thành công! Nhận ${earnedCoins} xu và 1 Voucher 500K.` : `Điểm danh thành công! Nhận ${earnedCoins} xu.`,
        earnedCoins,
        coins: user.coins,
        checkInStreak: user.checkInStreak,
        voucher: wonVoucher ? {
            code: wonVoucher.code,
            discountPercentage: wonVoucher.discountPercentage
        } : null
    });
};

// @desc    Lấy danh sách vật phẩm Cửa hàng Xu (Xoay ngẫu nhiên phần thưởng mỗi ngày)
// @route   GET /api/rewards/shop
// @access  Public
const getShopItems = async (req, res) => {
    const items = await ShopItem.find({ isActive: true });

    if (!items || items.length === 0) {
        return res.json([]);
    }

    // Dùng chuỗi ngày hôm nay YYYY-MM-DD làm Seed ngẫu nhiên cố định trong 24h
    const todayStr = moment().format('YYYY-MM-DD');

    // Hàm sinh số ngẫu nhiên từ Seed ngày
    const seededRandom = (seedStr) => {
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
            hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        return () => {
            const x = Math.sin(hash++) * 10000;
            return x - Math.floor(x);
        };
    };

    const rng = seededRandom(todayStr);

    // Xáo trộn (Fisher-Yates Shuffle) danh sách dựa trên Seed ngẫu nhiên của ngày
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Chọn ngẫu nhiên 12 phần thưởng cho ngày hôm nay (nếu kho có ít hơn 12 thì lấy tất cả)
    const limit = Math.min(12, shuffled.length);
    const dailyItems = shuffled.slice(0, limit);

    const formattedItems = dailyItems.map(item => ({
        id: item._id,
        _id: item._id,
        name: item.name,
        description: item.description,
        cost: item.cost,
        discountPercentage: item.discountPercentage,
        maxDiscountAmount: item.maxDiscountAmount,
        minOrderValue: item.minOrderValue
    }));

    res.json(formattedItems);
};

// @desc    Đổi xu lấy Voucher
// @route   POST /api/rewards/exchange
// @access  Private
const exchangeCoin = async (req, res) => {
    const { itemId } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }

    const item = await ShopItem.findById(itemId);
    if (!item || !item.isActive) {
        res.status(404);
        throw new Error('Vật phẩm không tồn tại hoặc đã ngừng cung cấp!');
    }

    const currentCoins = user.coins || 0;
    if (currentCoins < item.cost) {
        res.status(400);
        throw new Error('Bạn không đủ xu để đổi vật phẩm này!');
    }

    // Trừ xu
    user.coins -= item.cost;
    await user.save();

    // Tạo Voucher độc nhất
    const code = `SHOPXU-${item.discountPercentage}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const newVoucher = await Voucher.create({
        code,
        discountPercentage: item.discountPercentage,
        maxDiscountAmount: item.maxDiscountAmount,
        minOrderValue: item.minOrderValue,
        expirationDate: moment().add(30, 'days').toDate(),
        usageLimit: 1
    });

    res.json({
        message: 'Đổi Voucher thành công!',
        coins: user.coins,
        voucher: {
            code: newVoucher.code,
            discountPercentage: newVoucher.discountPercentage,
            maxDiscountAmount: newVoucher.maxDiscountAmount,
            minOrderValue: newVoucher.minOrderValue
        }
    });
};

// @desc    Chơi Mini Game Oẳn Tù Tì
// @route   POST /api/rewards/play-rps
// @access  Private
const playRockPaperScissors = async (req, res) => {
    const { userChoice } = req.body; // 'rock', 'paper', or 'scissors'
    const COST = 10;
    const REWARD_WIN = 30; // Trả lại 10 vốn + 20 lời
    const REWARD_DRAW = 10; // Trả lại 10 vốn

    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404);
        throw new Error('Không tìm thấy người dùng.');
    }

    const today = moment().startOf('day');
    const lastPlayed = user.lastGamePlayedAt ? moment(user.lastGamePlayedAt).startOf('day') : null;

    if (lastPlayed && lastPlayed.isSame(today)) {
        if (user.dailyGamePlays >= 3) {
            res.status(400);
            throw new Error('Bạn đã hết 3 lượt chơi Oẳn Tù Tì hôm nay. Hãy quay lại vào ngày mai!');
        }
    } else {
        user.dailyGamePlays = 0;
    }

    if ((user.coins || 0) < COST) {
        res.status(400);
        throw new Error('Bạn không đủ xu để chơi! Hãy điểm danh thêm nhé.');
    }

    // Trừ 10 xu cược
    user.coins -= COST;

    const choices = ['rock', 'paper', 'scissors'];
    if (!choices.includes(userChoice)) {
        res.status(400);
        throw new Error('Lựa chọn không hợp lệ!');
    }

    const serverChoice = choices[Math.floor(Math.random() * choices.length)];
    let result = '';
    let earned = 0;

    if (userChoice === serverChoice) {
        result = 'draw';
        earned = REWARD_DRAW;
    } else if (
        (userChoice === 'rock' && serverChoice === 'scissors') ||
        (userChoice === 'paper' && serverChoice === 'rock') ||
        (userChoice === 'scissors' && serverChoice === 'paper')
    ) {
        result = 'win';
        earned = REWARD_WIN;
    } else {
        result = 'lose';
        earned = 0;
    }

    user.coins += earned;
    user.dailyGamePlays += 1;
    user.lastGamePlayedAt = new Date();
    await user.save();

    res.json({
        userChoice,
        serverChoice,
        result,
        earned,
        coins: user.coins,
        rpsPlaysToday: user.dailyGamePlays
    });
};

// --- ADMIN CONTROLLERS ---

// @desc    Lấy tất cả vật phẩm Cửa hàng Xu (Admin)
// @route   GET /api/games/admin/shop
// @access  Private/Admin
const getAdminShopItems = async (req, res) => {
    const items = await ShopItem.find({}).sort({ createdAt: -1 });
    res.json(items);
};

// @desc    Tạo vật phẩm mới (Admin)
// @route   POST /api/games/admin/shop
// @access  Private/Admin
const createShopItem = async (req, res) => {
    const { name, description, cost, discountPercentage, maxDiscountAmount, minOrderValue } = req.body;

    if (!name || !description || cost === undefined) {
        res.status(400);
        throw new Error('Vui lòng điền đầy đủ thông tin tên, mô tả và giá xu.');
    }

    const shopItem = await ShopItem.create({
        name,
        description,
        cost: Number(cost),
        discountPercentage: Number(discountPercentage || 0),
        maxDiscountAmount: Number(maxDiscountAmount || 0),
        minOrderValue: Number(minOrderValue || 0),
        isActive: true
    });

    res.status(201).json(shopItem);
};

// @desc    Cập nhật vật phẩm (Admin)
// @route   PUT /api/games/admin/shop/:id
// @access  Private/Admin
const updateShopItem = async (req, res) => {
    const shopItem = await ShopItem.findById(req.params.id);

    if (!shopItem) {
        res.status(404);
        throw new Error('Không tìm thấy vật phẩm.');
    }

    const { name, description, cost, discountPercentage, maxDiscountAmount, minOrderValue, isActive } = req.body;

    if (name !== undefined) shopItem.name = name;
    if (description !== undefined) shopItem.description = description;
    if (cost !== undefined) shopItem.cost = Number(cost);
    if (discountPercentage !== undefined) shopItem.discountPercentage = Number(discountPercentage);
    if (maxDiscountAmount !== undefined) shopItem.maxDiscountAmount = Number(maxDiscountAmount);
    if (minOrderValue !== undefined) shopItem.minOrderValue = Number(minOrderValue);
    if (isActive !== undefined) shopItem.isActive = isActive;

    const updatedItem = await shopItem.save();
    res.json(updatedItem);
};

// @desc    Xóa vật phẩm (Admin)
// @route   DELETE /api/games/admin/shop/:id
// @access  Private/Admin
const deleteShopItem = async (req, res) => {
    const shopItem = await ShopItem.findById(req.params.id);

    if (!shopItem) {
        res.status(404);
        throw new Error('Không tìm thấy vật phẩm.');
    }

    await shopItem.deleteOne();
    res.json({ message: 'Đã xóa vật phẩm thành công.' });
};

export {
    getRewardInfo,
    checkIn,
    getShopItems,
    exchangeCoin,
    playRockPaperScissors,
    getAdminShopItems,
    createShopItem,
    updateShopItem,
    deleteShopItem
};
