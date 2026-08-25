import axios from 'axios';

// @desc    Calculate shipping fee via GHN
// @route   POST /api/shipping/calculate
// @access  Public
const calculateFee = async (req, res) => {
    try {
        const { to_district_id, to_ward_code, totalWeight, length, width, height, insurance_value } = req.body;

        if (!to_district_id || !to_ward_code) {
            return res.status(400).json({ message: 'Thiếu thông tin Quận/Huyện hoặc Phường/Xã' });
        }

        const GHN_TOKEN = process.env.GHN_TOKEN;
        const GHN_SHOP_ID = process.env.GHN_SHOP_ID;

        if (!GHN_TOKEN || !GHN_SHOP_ID) {
            return res.status(500).json({ message: 'Chưa cấu hình API Giao Hàng Nhanh trên Server' });
        }

        // Sử dụng biến môi trường GHN_URL hoặc mặc định là production
        const GHN_URL = process.env.GHN_URL || 'https://online-gateway.ghn.vn/shiip/public-api/v2';

        // Gọi API của GHN
        const response = await axios.post(
            `${GHN_URL}/shipping-order/fee`,
            {
                service_type_id: 2, // Giao hàng thương mại điện tử
                to_district_id: parseInt(to_district_id),
                to_ward_code: to_ward_code,
                weight: totalWeight || 200, // Gram
                length: length || 10,
                width: width || 10,
                height: height || 10,
                insurance_value: insurance_value ? Math.min(insurance_value, 5000000) : 0 // Bật lại phí bảo hiểm, GHN giới hạn tối đa 5 triệu
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Token': GHN_TOKEN,
                    'ShopId': GHN_SHOP_ID
                }
            }
        );

        if (response.data && response.data.code === 200) {
            let shippingFee = response.data.data.total;
            
            // Xử lý Freeship nếu có (Ví dụ: Đơn > 500k thì freeship tối đa 30k)
            let discountAmount = 0;
            if (insurance_value && insurance_value >= 500000) {
                discountAmount = Math.min(shippingFee, 30000); // Giảm tối đa 30k
                shippingFee -= discountAmount;
            }

            res.json({
                fee: shippingFee,
                originalFee: response.data.data.total,
                discount: discountAmount,
                message: 'Tính phí vận chuyển thành công'
            });
        } else {
            res.status(400).json({ message: 'Lỗi từ Giao Hàng Nhanh', details: response.data });
        }
    } catch (error) {
        console.error('[Shipping Error]', error.response?.data || error.message);
        res.status(500).json({ 
            message: 'Không thể tính phí vận chuyển lúc này',
            error: error.response?.data?.message || error.message 
        });
    }
};

const getProvinces = async (req, res) => {
    try {
        const GHN_TOKEN = process.env.GHN_TOKEN;
        const GHN_BASE_URL = (process.env.GHN_URL || 'https://online-gateway.ghn.vn/shiip/public-api/v2').replace('/v2', '');
        
        const response = await axios.get(`${GHN_BASE_URL}/master-data/province`, {
            headers: { 'Token': GHN_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy tỉnh thành từ GHN' });
    }
};

const getDistricts = async (req, res) => {
    try {
        const { provinceId } = req.params;
        const GHN_TOKEN = process.env.GHN_TOKEN;
        const GHN_BASE_URL = (process.env.GHN_URL || 'https://online-gateway.ghn.vn/shiip/public-api/v2').replace('/v2', '');
        
        const response = await axios.post(`${GHN_BASE_URL}/master-data/district`, {
            province_id: parseInt(provinceId)
        }, {
            headers: { 'Token': GHN_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy quận huyện từ GHN' });
    }
};

const getWards = async (req, res) => {
    try {
        const { districtId } = req.params;
        const GHN_TOKEN = process.env.GHN_TOKEN;
        const GHN_BASE_URL = (process.env.GHN_URL || 'https://online-gateway.ghn.vn/shiip/public-api/v2').replace('/v2', '');
        
        const response = await axios.post(`${GHN_BASE_URL}/master-data/ward`, {
            district_id: parseInt(districtId)
        }, {
            headers: { 'Token': GHN_TOKEN }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy phường xã từ GHN' });
    }
};

export { calculateFee, getProvinces, getDistricts, getWards };
