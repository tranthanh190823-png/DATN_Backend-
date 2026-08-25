const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('https://dev-online-gateway.ghn.vn/shiip/public-api/master-data/province', {
            headers: { 'Token': '784abf04-8fe3-11f1-a973-aee5264794df' }
        });
        console.log("Success:", res.data.code);
        console.log("Provinces count:", res.data.data ? res.data.data.length : 0);
    } catch (e) {
        console.log("Error:", e.response ? e.response.data : e.message);
    }
}
test();
