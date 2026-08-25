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
        <div style="background: #faf8f4; border: 1px solid #e8e0d4; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px;"><strong>Mã đơn hàng:</strong> #${order._id
    .toString()
    .slice(-8)
    .toUpperCase()}</p>
          <p style="margin: 0 0 8px;"><strong>Phương thức:</strong> ${formatPaymentMethod(
      order.paymentMethod
    )}</p>
          <p style="margin: 0;"><strong>Tổng tiền:</strong> <span style="color: #8b5a2b; font-size: 18px;">${formatCurrency(
      order.totalPrice
    )}</span></p>
        </div>

        <h3 style="font-size: 16px; margin-bottom: 12px;">Chi tiết sản phẩm</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; text-align: left;">Sản phẩm</th>
              <th style="padding: 10px; text-align: center;">SL</th>
              <th style="padding: 10px; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${buildOrderItemsHtml(order.orderItems)}
          </tbody>
        </table>

        <div style="margin-top: 16px; font-size: 14px; text-align: right;">
          <p style="margin: 4px 0;">Tạm tính: ${formatCurrency(order.itemsPrice)}</p>
          <p style="margin: 4px 0;">Phí vận chuyển: ${formatCurrency(order.shippingPrice)}</p>
          ${order.discountPrice > 0
    ? `<p style="margin: 4px 0; color: #16a34a;">Giảm giá${order.voucherCode ? ` (${order.voucherCode})` : ''
    }: -${formatCurrency(order.discountPrice)}</p>`
    : ''
  }
          <p style="margin: 8px 0 0; font-weight: bold; font-size: 16px;">Tổng cộng: ${formatCurrency(
    order.totalPrice
  )}</p>
        </div>

        <h3 style="font-size: 16px; margin: 24px 0 8px;">Địa chỉ giao hàng</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.6;">
          ${order.shippingAddress?.address || ''}<br>
          ${order.shippingAddress?.city || ''}, ${order.shippingAddress?.postalCode || ''}<br>
          ${order.shippingAddress?.country || 'Việt Nam'}
        </p>
`;

const buildShellHtml = (subtitle, bodyInner) => `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #333;">
      <div style="background: linear-gradient(135deg, #1a1a1a 0%, #3d2b1f 100%); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: #d4af37; margin: 0; font-size: 22px; letter-spacing: 2px;">AVENTIS</h1>
        <p style="color: #f5f0e8; margin: 8px 0 0; font-size: 14px;">${subtitle}</p>
      </div>
      <div style="padding: 24px; background: #fff; border: 1px solid #eee; border-top: none;">
        ${bodyInner}
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">Đây là email tự động từ Aventis. Vui lòng không trả lời email này.</p>
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
        <p>Xin chào <strong>${user.name}</strong>,</p>
        <p>Cảm ơn anh/chị đã đặt hàng tại <strong>Aventis</strong>. Chúng tôi đã <strong>nhận đơn hàng</strong> và đang xử lý.</p>
        <p style="color: #666; font-size: 14px;">Trạng thái: <strong>${order.status || 'Chờ xử lý'
    }</strong>. ${paymentHint}</p>
        ${buildOrderSummaryBlock(order)}
        <p style="margin: 24px 0;">
          <a href="${orderUrl}" style="background-color: #8b5a2b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Theo dõi đơn hàng
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Anh/chị sẽ nhận thêm email khi thanh toán thành công (nếu thanh toán online).</p>
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
        <p>Xin chào <strong>${user.name}</strong>,</p>
        <p>Cảm ơn anh/chị đã mua sắm tại <strong>Aventis</strong>. Đơn hàng của anh/chị đã được <strong>thanh toán thành công</strong>.</p>
        <p style="margin: 0 0 8px; font-size: 14px;"><strong>Thời gian thanh toán:</strong> ${paidAt}</p>
        ${buildOrderSummaryBlock(order)}
        <p style="margin: 24px 0;">
          <a href="${orderUrl}" style="background-color: #8b5a2b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Theo dõi đơn hàng
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Đơn hàng đang được xử lý. Anh/chị sẽ nhận được thông báo khi đơn hàng được giao.</p>
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
  if (order?.user?.email) {
    return order;
  }
  if (!order?._id) {
    return null;
  }
  return Order.findById(order._id).populate('user', 'name email');
};

export const notifyOrderPlaced = async (order) => {
  try {
    const orderDoc = await resolveOrderWithUser(order);
    const user = orderDoc?.user;

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
    const orderDoc = await resolveOrderWithUser(order);
    const user = orderDoc?.user;

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
