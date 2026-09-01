import Order from '../models/Order.js';
import sendEmail from './sendEmail.js';

const formatCurrency = (amount) =>
  `${Number(amount || 0).toLocaleString('vi-VN')}₫`;

const formatPaymentMethod = (method) => {
  const key = String(method || '').toUpperCase();
  const map = {
    COD: 'Thanh toán khi nhận hàng (COD)',
    CASH: 'Thanh toán khi nhận hàng (COD)',
    VNPAY: 'VNPay',
    SEPAY: 'Chuyển khoản ngân hàng (SePay)',
    PAYPAL: 'PayPal',
  };
  // Also match original casing keys used in older data
  if (map[key]) return map[key];
  const legacy = {
    COD: map.COD,
    VNPay: map.VNPAY,
    SePay: map.SEPAY,
    PayPal: map.PAYPAL,
  };
  return legacy[method] || method || 'Không xác định';
};

const getFrontendOrderUrl = (orderId) => {
  const base = (process.env.FRONTEND_URL || 'https://aventis.io.vn').replace(/\/$/, '');
  return `${base}/order/${orderId}`;
};

const buildOrderItemsHtml = (orderItems = []) =>
  orderItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}${item.volume ? ` (${item.volume}ml)` : ''
        }</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.qty}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(
          item.price * item.qty
        )}</td>
      </tr>`
    )
    .join('');

const buildOrderSummaryBlock = (order) => `
        <div style="background: #e6f7f5; border: 1px solid #b9f1ea; border-radius: 10px; padding: 18px; margin: 20px 0;">
          <p style="margin: 0 0 8px; color: #111827;"><strong>Mã đơn hàng:</strong> <span style="color: #0d9488; font-weight: 700;">#${order._id
    .toString()
    .slice(-8)
    .toUpperCase()}</span></p>
          <p style="margin: 0 0 8px; color: #111827;"><strong>Phương thức:</strong> ${formatPaymentMethod(
      order.paymentMethod
    )}</p>
          <p style="margin: 0; color: #111827;"><strong>Tổng tiền:</strong> <span style="color: #0d9488; font-size: 18px; font-weight: bold;">${formatCurrency(
      order.totalPrice
    )}</span></p>
        </div>

        <h3 style="font-size: 16px; margin-bottom: 12px; color: #111827;">Chi tiết sản phẩm</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f0fdfa; border-bottom: 2px solid #5DC8BE;">
              <th style="padding: 10px; text-align: left; color: #0d9488;">Sản phẩm</th>
              <th style="padding: 10px; text-align: center; color: #0d9488;">SL</th>
              <th style="padding: 10px; text-align: right; color: #0d9488;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${buildOrderItemsHtml(order.orderItems)}
          </tbody>
        </table>

        <div style="margin-top: 16px; font-size: 14px; text-align: right; color: #374151;">
          <p style="margin: 4px 0;">Tạm tính: ${formatCurrency(order.itemsPrice)}</p>
          <p style="margin: 4px 0;">Phí vận chuyển: ${formatCurrency(order.shippingPrice)}</p>
          ${order.discountPrice > 0
    ? `<p style="margin: 4px 0; color: #16a34a;">Giảm giá${order.voucherCode ? ` (${order.voucherCode})` : ''
    }: -${formatCurrency(order.discountPrice)}</p>`
    : ''
  }
          <p style="margin: 8px 0 0; font-weight: bold; font-size: 16px; color: #0d9488;">Tổng cộng: ${formatCurrency(
    order.totalPrice
  )}</p>
        </div>

        <h3 style="font-size: 16px; margin: 24px 0 8px; color: #111827;">Địa chỉ giao hàng</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4b5563;">
          ${order.shippingAddress?.address || ''}<br>
          ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.postalCode || ''}<br>
          ${order.shippingAddress?.country || 'Việt Nam'}
        </p>
`;

const buildShellHtml = (subtitle, bodyInner) => `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333; background-color: #f4f6f8; padding: 20px;">
      <div style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 28px 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 4px; font-family: Arial, sans-serif;">AVENTIS</h1>
        <p style="color: #5DC8BE; margin: 6px 0 0; font-size: 12px; letter-spacing: 2px; font-weight: 600; text-transform: uppercase;">PERFUME • ${subtitle}</p>
      </div>
      <div style="padding: 28px; background: #ffffff; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; border-top: none;">
        ${bodyInner}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0 20px;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">Đây là email tự động từ <strong>Aventis Perfume</strong>. Vui lòng không trả lời email này.</p>
      </div>
    </div>
  `;

const buildOrderPlacedHtml = (order, user) => {
  const orderUrl = getFrontendOrderUrl(order._id);
  const method = String(order.paymentMethod || '').toUpperCase();
  const paymentHint =
    method === 'COD' || method === 'CASH' || method === ''
      ? 'Anh/chị sẽ thanh toán khi nhận hàng (COD).'
      : method === 'SEPAY'
        ? 'Vui lòng hoàn tất chuyển khoản theo hướng dẫn SePay để đơn được xác nhận thanh toán.'
        : method === 'VNPAY'
          ? 'Nếu chưa thanh toán xong trên VNPay, vui lòng hoàn tất để đơn được xử lý sớm.'
          : 'Đơn hàng của anh/chị đang được ghi nhận.';

  return buildShellHtml(
    'Xác nhận đơn hàng',
    `
        <p style="font-size: 15px; color: #374151; margin-top: 0;">Xin chào <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; color: #374151;">Cảm ơn anh/chị đã đặt hàng tại <strong style="color: #0d9488;">Aventis</strong>. Chúng tôi đã <strong>nhận đơn hàng</strong> và đang xử lý.</p>
        <p style="color: #4b5563; font-size: 14px; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 4px solid #5DC8BE;">Trạng thái: <strong>${order.status || 'Chờ xử lý'
    }</strong>. ${paymentHint}</p>
        ${buildOrderSummaryBlock(order)}
        <p style="margin: 28px 0; text-align: center;">
          <a href="${orderUrl}" style="background-color: #0d9488; background-image: linear-gradient(135deg, #5DC8BE 0%, #0d9488 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3); text-transform: uppercase;">
            Theo dõi đơn hàng
          </a>
        </p>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">Anh/chị sẽ nhận thêm email khi thanh toán thành công (nếu thanh toán online).</p>
    `
  );
};

const buildOrderPlacedText = (order, user) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  const items = (order.orderItems || [])
    .map(
      (item) =>
        `- ${item.name} x${item.qty}: ${formatCurrency(item.price * item.qty)}`
    )
    .join('\n');

  return `Xin chào ${user.name},

Cảm ơn anh/chị đã đặt hàng tại Aventis. Đơn hàng #${shortId} đã được ghi nhận.

Trạng thái: ${order.status || 'Chờ xử lý'}
Phương thức: ${formatPaymentMethod(order.paymentMethod)}
Tổng tiền: ${formatCurrency(order.totalPrice)}

Chi tiết sản phẩm:
${items}

Địa chỉ giao hàng:
${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''}

Cảm ơn anh/chị đã mua sắm tại Aventis!`;
};

const buildOrderPaymentHtml = (order, user) => {
  const orderUrl = getFrontendOrderUrl(order._id);
  const paidAt = order.paidAt
    ? new Date(order.paidAt).toLocaleString('vi-VN')
    : new Date().toLocaleString('vi-VN');

  return buildShellHtml(
    'Xác nhận thanh toán đơn hàng',
    `
        <p style="font-size: 15px; color: #374151; margin-top: 0;">Xin chào <strong>${user.name}</strong>,</p>
        <p style="font-size: 15px; color: #374151;">Cảm ơn anh/chị đã mua sắm tại <strong style="color: #0d9488;">Aventis</strong>. Đơn hàng của anh/chị đã được <strong style="color: #16a34a;">thanh toán thành công</strong>.</p>
        <p style="margin: 0 0 12px; font-size: 14px; color: #4b5563; background: #f0fdf4; padding: 10px 14px; border-radius: 6px; border-left: 4px solid #16a34a;"><strong>Thời gian thanh toán:</strong> ${paidAt}</p>
        ${buildOrderSummaryBlock(order)}
        <p style="margin: 28px 0; text-align: center;">
          <a href="${orderUrl}" style="background-color: #0d9488; background-image: linear-gradient(135deg, #5DC8BE 0%, #0d9488 100%); color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 14px; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3); text-transform: uppercase;">
            Theo dõi đơn hàng
          </a>
        </p>
        <p style="color: #6b7280; font-size: 13px; text-align: center;">Đơn hàng đang được xử lý. Anh/chị sẽ nhận được thông báo khi đơn hàng được giao.</p>
    `
  );
};

const buildOrderPaymentText = (order, user) => {
  const shortId = order._id.toString().slice(-8).toUpperCase();
  const items = (order.orderItems || [])
    .map(
      (item) =>
        `- ${item.name} x${item.qty}: ${formatCurrency(item.price * item.qty)}`
    )
    .join('\n');

  return `Xin chào ${user.name},

Đơn hàng #${shortId} của anh/chị đã thanh toán thành công tại Aventis.

Phương thức: ${formatPaymentMethod(order.paymentMethod)}
Tổng thanh toán: ${formatCurrency(order.totalPrice)}

Chi tiết sản phẩm:
${items}

Địa chỉ giao hàng:
${order.shippingAddress?.address || ''}, ${order.shippingAddress?.city || ''}

Cảm ơn anh/chị đã mua sắm tại Aventis!`;
};

const resolveOrderWithUser = async (order) => {
  if (!order) return null;
  let orderDoc = order;
  if (!order.user?.email && order._id) {
    const fetched = await Order.findById(order._id).populate('user', 'name email');
    if (fetched) orderDoc = fetched;
  }
  
  const email = orderDoc?.user?.email || orderDoc?.shippingAddress?.email;
  const name = orderDoc?.user?.name || orderDoc?.shippingAddress?.fullName || 'Quý khách';

  return {
    orderDoc,
    user: { email, name }
  };
};

export const notifyOrderPlaced = async (order) => {
  try {
    const resolved = await resolveOrderWithUser(order);
    const orderDoc = resolved?.orderDoc || order;
    const user = resolved?.user;

    if (!user?.email) {
      console.warn(`[Order Email] Không có email cho đơn hàng ${orderDoc?._id}`);
      return;
    }

    const shortId = orderDoc._id.toString().slice(-8).toUpperCase();

    await sendEmail({
      email: user.email,
      subject: `Xác nhận đơn hàng #${shortId} - Aventis`,
      message: buildOrderPlacedText(orderDoc, user),
      html: buildOrderPlacedHtml(orderDoc, user),
    });

    console.log(
      `[Order Email] Đã gửi email xác nhận đặt hàng #${shortId} → ${user.email}`
    );
  } catch (error) {
    console.error('[Order Email] Lỗi gửi email đặt hàng:', error.message);
  }
};

export const notifyOrderPaid = async (order) => {
  try {
    const resolved = await resolveOrderWithUser(order);
    const orderDoc = resolved?.orderDoc || order;
    const user = resolved?.user;

    if (!user?.email) {
      console.warn(`[Order Email] Không có email cho đơn hàng ${orderDoc?._id}`);
      return;
    }

    const shortId = orderDoc._id.toString().slice(-8).toUpperCase();

    await sendEmail({
      email: user.email,
      subject: `Xác nhận thanh toán đơn hàng #${shortId} - Aventis`,
      message: buildOrderPaymentText(orderDoc, user),
      html: buildOrderPaymentHtml(orderDoc, user),
    });

    console.log(
      `[Order Email] Đã gửi email xác nhận thanh toán đơn #${shortId} → ${user.email}`
    );
  } catch (error) {
    console.error('[Order Email] Lỗi gửi email thanh toán:', error.message);
  }
};

export default notifyOrderPaid;
