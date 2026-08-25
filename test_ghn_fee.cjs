const axios = require('axios');
require('dotenv').config({ path: './.env' });

async function testFee() {
    try {
        const payload = {
            to_district_id: 1442, // Quận 1
            to_ward_code: "20101", // Bến Nghé
            service_type_id: 2,
            weight: 200,
            insurance_value: 100000
        };
        const res = await axios.post('https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee', payload, {
            headers: {
                'Token': process.env.GHN_TOKEN,
                'ShopId': process.env.GHN_SHOP_ID
            }
        });
        console.log("Success:", res.data);
    } catch (e) {
        console.log("Error:", e.response?.data);
    }
}
testFee();
