import nodemailer from 'nodemailer';

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

const STRATEGIES = [
    { port: 465, secure: true },
    { port: 587, secure: false, requireTLS: true },
    { port: 25, secure: false }
];

const createTransporterConfig = (strategyIndex = 0, usePool = false) => {
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const user = (process.env.SMTP_EMAIL || '').trim();
    const pass = (process.env.SMTP_PASSWORD || '').trim().replace(/\s+/g, '');
    const isGmail = host.toLowerCase().includes('gmail');

    const currentStrategy = STRATEGIES[strategyIndex % STRATEGIES.length];
    const port = Number(process.env.SMTP_PORT) || currentStrategy.port;
    const secure = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) === 465 : currentStrategy.secure;

    const config = {
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        pool: usePool,           // Bật pool cho transporter đã cache để tái dụng kết nối TCP
        connectionTimeout: 4000,
        greetingTimeout: 3000,
        socketTimeout: 5000,
    };

    if (usePool) {
        config.maxConnections = 3;   // Tối đa 3 kết nối song song
        config.maxMessages = 50;     // Mỗi kết nối gửi tối đa 50 email trước khi tạo lại
    }

    if (isGmail && strategyIndex === 0 && (!process.env.SMTP_PORT || process.env.SMTP_PORT === '465')) {
        config.service = 'gmail';
    } else {
        config.host = host;
        config.port = port;
        config.secure = secure;
        if (currentStrategy.requireTLS) {
            config.requireTLS = true;
        }
    }

    return nodemailer.createTransport(config);
};

const sendEmail = async (options, { retries = 3 } = {}) => {
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

    // Slow path: thử lần lượt các chiến lược cổng: 465 (SSL) -> 587 (TLS) -> 25 (Standard)
    let lastError;

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            const currentTransporter = createTransporterConfig(attempt);
            const info = await currentTransporter.sendMail(message);

            // ✅ Thành công → cache strategy này + tạo pooled transporter cho lần sau
            cachedStrategyIndex = attempt;
            cachedTransporter = createTransporterConfig(attempt, true);
            console.log(
                `✅ Email sent successfully via strategy ${attempt + 1} (now cached): %s`,
                info.messageId
            );
            return info;
        } catch (error) {
            lastError = error;
            console.error(
                `❌ Error sending email (attempt ${attempt + 1}/${retries}):`,
                error.message
            );

            if (error.code === 'EAUTH' || (error.response && error.response.includes('535'))) {
                throw new Error(
                    'Xác thực Gmail thất bại. Vui lòng kiểm tra Mật khẩu ứng dụng 16 ký tự của Google.'
                );
            }

            if (attempt < retries - 1) {
                console.log(`   🔄 Swapping SMTP strategy / port for retry ${attempt + 2}...`);
                await sleep(300);
            }
        }
    }

    throw lastError;
};

export default sendEmail;
