const axios = require('axios');
async function test() {
    try {
        const res = await axios.get('http://localhost:5000/api/shipping/provinces');
        console.log("Success:", res.data);
    } catch (e) {
        console.log("Status:", e.response?.status);
        console.log("Data:", e.response?.data);
        console.log("Message:", e.message);
    }
}
test();
