import nodemailer from 'nodemailer';
import { promises as dns } from 'dns';

// Resolve thủ công địa chỉ IP để chủ động chọn IPv6 / IPv4
// Giúp failover khi môi trường (VD: Render) không có outbound IPv6.
let cachedIps = { v4: null, v6: null };

async function getHostIp(preferV6 = false) {
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const type = preferV6 ? 'v6' : 'v4';
    if (cachedIps[type]) return cachedIps[type];
    const rrtype = preferV6 ? 'AAAA' : 'A';
    const addrs = await dns.resolve(host, rrtype);
    if (!addrs || addrs.length === 0) {
        throw new Error(`Không resolve được ${rrtype} cho ${host}`);
    }
    cachedIps[type] = addrs[0];
    return cachedIps[type];
}

const RETRYABLE_CODES = new Set([
    'ECONNECTION',
    'ETIMEDOUT',
    'ESOCKET',
    'ECONNRESET',
    'ECONNREFUSED',
    'EAI_AGAIN',
    'EACCES',
    'EENVELOPE',
    'ETLS',
    'EDNS',
]);

// Cache: lưu strategy đã gửi thành công để lần sau dùng luôn, không cần thử lại từ đầu
let cachedStrategyIndex = null;
let cachedTransporter = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryable = (error) => {
    if (!error) return false;
    if (error.code && RETRYABLE_CODES.has(error.code)) return true;
    const msg = String(error.message || '').toLowerCase();
    return (
        msg.includes('timeout') ||
        msg.includes('eaccess') ||
        msg.includes('econnreset') ||
        msg.includes('socket') ||
        msg.includes('connection')
    );
};

// Chỉ khác nhau về cổng/secure; host luôn dùng địa chỉ IP đã resolve (IPv6 hoặc IPv4)
const STRATEGIES = [
    { host: '', port: 465, secure: true },
    { host: '', port: 587, secure: false, requireTLS: true }
];

// Chọn IP: mặc định ưu tiên IPv6 (web/Render), nếu Web dùng IPv6; false = IPv4.
const createTransporterConfig = async ({ strategyIndex = 0, usePool = false, preferV6 = true } = {}) => {
    const user = (process.env.SMTP_EMAIL || '').trim();
    const pass = (process.env.SMTP_PASSWORD || '').trim().replace(/\s+/g, '');
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();

    const ip = await getHostIp(preferV6);

    const strategy = STRATEGIES[strategyIndex % STRATEGIES.length];

    const config = {
        host: ip,
        port: Number(process.env.SMTP_PORT) || strategy.port,
        secure: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) === 465 : strategy.secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        family: preferV6 ? 6 : 4,
        pool: usePool,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 10000,
    };

    if (strategy.requireTLS) {
        config.requireTLS = true;
    }

    if (usePool) {
        config.maxConnections = 3;
        config.maxMessages = 50;
    }

    return nodemailer.createTransport(config);
};

const sendEmail = async (options) => {
    const smtpEmail = (process.env.SMTP_EMAIL || '').trim();
    const fromName = process.env.FROM_NAME || 'Aventis';
    const fromEmail = (process.env.FROM_EMAIL || smtpEmail).trim();

    if (!smtpEmail || !process.env.SMTP_PASSWORD) {
        throw new Error(
            'Chưa cấu hình biến môi trường SMTP_EMAIL hoặc SMTP_PASSWORD.'
        );
    }

    const message = {
        from: `"${fromName}" <${fromEmail}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    // ⚡ Fast path: dùng transporter đã cache nếu có (strategy đã thành công trước đó)
    if (cachedTransporter && cachedStrategyIndex !== null) {
        try {
            const info = await cachedTransporter.sendMail(message);
            console.log(
                `⚡ Email sent via cached strategy ${cachedStrategyIndex + 1}: %s`,
                info.messageId
            );
            return info;
        } catch (error) {
            console.warn(
                `⚠️ Cached strategy ${cachedStrategyIndex + 1} failed, re-discovering...`,
                error.message
            );
            // Nếu lỗi auth thì throw luôn, không cần thử lại
            if (error.code === 'EAUTH' || (error.response && error.response.includes('535'))) {
                throw new Error(
                    'Xác thực Gmail thất bại. Vui lòng kiểm tra Mật khẩu ứng dụng 16 ký tự của Google.'
                );
            }
            // Reset cache, thử lại từ đầu
            cachedTransporter = null;
            cachedStrategyIndex = null;
        }
    }

    // Slow path: failover IP (IPv6 trước → IPv4), mỗi mode thử lần lượt các cổng: 465 (SSL) -> 587 (TLS)
    // Mặc định ưu tiên IPv6 (web/Render dùng IPv6), nếu fail (timeout/unreachable) tự động chuyển sang IPv4.
    const IP_MODES = [true, false]; // [IPv6, IPv4]
    let lastError;

    for (const preferV6 of IP_MODES) {
        for (let s = 0; s < STRATEGIES.length; s++) {
            const strategyIndex = s;
            const label = preferV6 ? 'IPv6' : 'IPv4';
            try {
                const currentTransporter = await createTransporterConfig({ strategyIndex, usePool: false, preferV6 });
                const info = await currentTransporter.sendMail(message);

                cachedStrategyIndex = strategyIndex;
                cachedTransporter = await createTransporterConfig({ strategyIndex, usePool: true, preferV6 });
                console.log(
                    `✅ Email sent successfully via strategy ${strategyIndex + 1} (${label}, now cached): %s`,
                    info.messageId
                );
                return info;
            } catch (error) {
                lastError = error;
                console.error(
                    `❌ Error sending email (${label}, port ${Number(process.env.SMTP_PORT) || STRATEGIES[strategyIndex].port}):`,
                    error.message
                );

                if (error.code === 'EAUTH' || (error.response && error.response.includes('535'))) {
                    throw new Error(
                        'Xác thực Gmail thất bại. Vui lòng kiểm tra Mật khẩu ứng dụng 16 ký tự của Google.'
                    );
                }

                await sleep(300);
            }
        }
    }

    throw lastError;
};

export default sendEmail;
