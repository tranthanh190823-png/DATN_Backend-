import express from 'express';
import { calculateFee, getProvinces, getDistricts, getWards } from '../controllers/shippingController.js';

const router = express.Router();

router.post('/calculate-fee', calculateFee);
router.get('/provinces', getProvinces);
router.get('/districts/:provinceId', getDistricts);
router.get('/wards/:districtId', getWards);

export default router;
