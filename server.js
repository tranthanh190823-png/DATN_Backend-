import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

import cors from 'cors';
import morgan from 'morgan';
import connectDB from './configs/db.js';
import productRoutes from './routes/productRoutes.js';
import userRoutes from './routes/userRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import voucherRoutes from './routes/voucherRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import flashSaleRoutes from './routes/flashSaleRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import chatLiveRoutes from './routes/chatLiveRoutes.js';
import shippingRoutes from './routes/shippingRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import http from 'http';
import { initSocket } from './utils/socket.js';

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();
const server = http.createServer(app);
initSocket(server);

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});
app.use('/api/products', productRoutes);
app.use('/api/users', userRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/flash-sales', flashSaleRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/chat-live', chatLiveRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/games', gameRoutes);

app.get('/api/config/paypal', (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || 'sb');
});

// VNPay redirect về Return URL — nếu URL trỏ nhầm vào BE/ngrok thì chuyển tiếp sang FE
const redirectVnpayReturnToFrontend = (req, res) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const query = new URLSearchParams(req.query).toString();
  const target = `${frontendUrl}/vnpay-return${query ? `?${query}` : ''}`;
  res.redirect(302, target);
};

app.get('/vnpay-return', redirectVnpayReturnToFrontend);
app.get('/vnpay_return', redirectVnpayReturnToFrontend);

// Error handling (phải đặt sau cùng)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
