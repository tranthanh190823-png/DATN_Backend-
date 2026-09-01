# GHI CHÚ DEPLOY LÊN WEB (backend)

Khi chuyển từ chạy local sang deploy production, cần kiểm tra/sửa các chỗ sau:

## 1. Biến môi trường (.env trên server)
- `PORT` → dùng port nền tảng cấp (vd Render cung cấp qua env).
- `MONGO_URI` → URL MongoDB production.
- `FRONTEND_URL` → URL frontend thật (vd `https://aventis.io.vn`). Email "theo dõi đơn hàng" dùng biến này (xem `utils/sendOrderPaymentEmail.js`).
- `SMTP_EMAIL` / `SMTP_PASSWORD` → Gmail + App password 16 ký tự (đã có sẵn logic failover SSL->TLS).
- `YESCALE_API_KEY` → AI chatbox (DeepSeek/YesScale). Nếu thiếu, AI tự fallback.
- Các biến VNPay (`VNP_TMN_CODE`, `VNP_HASH_SECRET`, `VNP_RETURN_URL`, `VNP_IPN_URL`) → đúng sandbox/production.
- `SEPAY_WEBHOOK_TOKEN` → token webhook SePay.

## 2. CORS (server.js)
```js
app.use(cors());
```
Hiện mở `*` (được cho local). **Khi deploy nên giới hạn origin**:
```js
app.use(cors({ origin: ['https://frontend-domain'] }));
```

## 3. Socket.IO / WebSocket (RẤT QUAN TRỌNG)
- Chat realtime + chatbox AI đều chạy qua Socket.IO (khởi tạo trong `server.js`, handler trong `utils/socket.js`).
- **Nền tảng phải hỗ trợ WebSocket / long-lived connection**:
  - ❌ Render **free tier**: KHÔNG hỗ trợ, socket sẽ không hoạt động ổn định.
  - ✅ Render **paid (Starter+)** / Railway / Fly.io / VPS: hỗ trợ.
- Nếu buộc chạy nơi không hỗ trợ WebSocket, có thể hạ `transports` xuống `['polling']` (frontend `SocketContext.tsx` + backend `socket.js`) nhưng sẽ trễ/không ổn định hơn.

## 4. Biến môi trường của frontend (xem DEPLOY-NOTES ở project Fontend)
- `VITE_API_URL` phải trỏ đúng backend production (kèm `/api`).

## 5. Cổng nghe
- `server.js` dùng `process.env.PORT || 5000` — đã chuẩn, nền tảng PAAS tự cấp PORT.
