import 'dotenv/config';
import axios from 'axios';

async function testGHN() {
    try {
        const to_district_id = 1442; // Quận 1 for example
        const to_ward_code = "20101"; // Phường Bến Nghé
        
        const response = await axios.post(
            'http://localhost:5000/api/shipping/calculate-fee',
            {
                to_district_id: to_district_id,
                to_ward_code: to_ward_code,
                insurance_value: 0
            }
        );
        console.log("Success:", response.data);
    } catch (error) {
        console.log("Error:", error.response ? error.response.data : error.message);
    }
}
testGHN();
