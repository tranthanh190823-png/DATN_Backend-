const axios = require('axios');

async function testProvinces() {
    try {
        const response = await axios.get('http://localhost:5000/api/shipping/provinces');
        console.log("Success:", Object.keys(response.data));
        console.log("Is data array?", Array.isArray(response.data.data));
        if (Array.isArray(response.data.data)) {
            console.log("First element:", response.data.data[0]);
        }
    } catch (error) {
        console.log("Error:", error.response ? error.response.data : error.message);
    }
}
testProvinces();
