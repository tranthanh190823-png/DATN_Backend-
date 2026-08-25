/**
 * Email Templates Module for Aventis Perfume
 * Redesigned to match brand aesthetics with primary green accents (#5DC8BE / #0d9488).
 */

export const getResetPasswordEmailHtml = (resetUrl, userName = 'Quý khách') => {
  const safeName = userName || 'Quý khách';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Yêu cầu Đặt Lại Mật Khẩu - Aventis</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: 'Segoe UI', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f6f8; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #111827; background-image: linear-gradient(135deg, #111827 0%, #1f2937 100%); padding: 32px 20px; text-align: center;">
              <!-- Logo -->
              <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 6px;">
                    <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="50,10 90,85 10,85" stroke="#5DC8BE" stroke-width="7" fill="none" />
                      <path d="M35 60 L50 30 L65 60 L35 60 Z" fill="#5DC8BE" />
                    </svg>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: 4px; font-family: 'Montserrat', Arial, sans-serif; display: block;">AVENTIS</span>
                    <span style="color: #5DC8BE; font-size: 10px; letter-spacing: 6px; font-weight: 600; font-family: Arial, sans-serif; display: block; margin-top: 2px;">PERFUME</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 40px 35px 30px 35px;">
              
              <!-- Lock Icon & Title Block -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <!-- Soft Green Circle with Lock Icon -->
                    <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 16px auto;">
                      <tr>
                        <td align="center" valign="middle" width="64" height="64" style="background-color: #e6f7f5; border-radius: 50%; width: 64px; height: 64px; text-align: center; vertical-align: middle;">
                          <img src="https://img.icons8.com/?size=100&id=49435&format=png&color=0d9488" width="32" height="32" alt="Lock Icon" style="display: block; margin: 0 auto; border: 0;">
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0 0 10px 0; color: #111827; font-size: 24px; font-weight: 700; letter-spacing: -0.3px;">Yêu cầu Đặt Lại Mật Khẩu</h1>
                    <!-- Accent Underline Bar -->
                    <div style="width: 48px; height: 3.5px; background-color: #5DC8BE; border-radius: 2px; margin: 0 auto 24px auto;"></div>
                  </td>
                </tr>
              </table>

              <!-- Greeting & Description -->
              <div style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
                <p style="margin: 0 0 12px 0;">Xin chào <strong>${safeName}</strong>,</p>
                <p style="margin: 0;">Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của mình tại <strong>Aventis</strong>.</p>
              </div>

              <!-- Primary CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="background-color: #0d9488; background-image: linear-gradient(135deg, #5DC8BE 0%, #0d9488 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; letter-spacing: 0.8px; padding: 14px 32px; border-radius: 10px; display: inline-block; box-shadow: 0 4px 14px rgba(13, 148, 136, 0.35); text-transform: uppercase;">
                      <table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="display: inline-table; vertical-align: middle;">
                        <tr>
                          <td valign="middle" style="padding-right: 8px; line-height: 1;">
                            <img src="https://img.icons8.com/?size=100&id=49435&format=png&color=ffffff" width="18" height="18" alt="Lock" style="display: block; border: 0;">
                          </td>
                          <td valign="middle" style="color: #ffffff; font-size: 15px; font-weight: 700; letter-spacing: 0.8px; line-height: 1; white-space: nowrap;">
                            ĐẶT LẠI MẬT KHẨU
                          </td>
                        </tr>
                      </table>
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Divider line -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="42%" style="border-bottom: 1px solid #e5e7eb;"></td>
                  <td align="center" style="color: #9ca3af; font-size: 12px; font-weight: 600; padding: 0 10px;">HOẶC</td>
                  <td width="42%" style="border-bottom: 1px solid #e5e7eb;"></td>
                </tr>
              </table>

              <!-- Copy Link Section -->
              <div style="margin-bottom: 24px;">
                <p style="color: #4b5563; font-size: 13px; margin: 0 0 8px 0;">Hoặc copy link này vào trình duyệt:</p>
                <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; word-break: break-all; font-family: monospace; font-size: 12.5px; color: #0d9488;">
                  <a href="${resetUrl}" style="color: #0d9488; text-decoration: none; word-break: break-all;">${resetUrl}</a>
                </div>
              </div>

              <!-- Expiration Warning Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #e6f7f5; border: 1px solid #b9f1ea; border-radius: 10px; margin-bottom: 10px;">
                <tr>
                  <td style="padding: 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="36" valign="top" style="font-size: 20px; line-height: 1;">⏱️</td>
                        <td valign="top" style="color: #0f766e; font-size: 13.5px; line-height: 1.5;">
                          <strong style="color: #0d9488; font-size: 14px; display: block; margin-bottom: 2px;">Link này có hiệu lực trong 15 phút.</strong>
                          Vì lý do bảo mật, link sẽ hết hạn sau thời gian trên.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Security & Features Section -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #f1f5f9; padding: 28px 35px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <!-- Left: Security notice -->
                  <td width="55%" valign="top" style="padding-right: 15px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="30" valign="top" style="font-size: 20px;">🛡️</td>
                        <td valign="top">
                          <span style="color: #111827; font-size: 13px; font-weight: 700; display: block; margin-bottom: 4px; letter-spacing: 0.2px;">BẢO MẬT LÀ ƯU TIÊN HÀNG ĐẦU</span>
                          <span style="color: #6b7280; font-size: 12px; line-height: 1.5; display: block;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này hoặc liên hệ chúng tôi nếu có bất kỳ thắc mắc nào.</span>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Vertical Line Divider -->
                  <td width="1" style="background-color: #e5e7eb;"></td>

                  <!-- Right: Brand Promises (3 badges) -->
                  <td width="44%" valign="top" style="padding-left: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="28" height="28" align="center" style="background-color: #e6f7f5; border-radius: 50%; font-size: 13px;">🧴</td>
                              <td style="padding-left: 10px; color: #111827; font-size: 11.5px; font-weight: 700; letter-spacing: 0.3px;">CHÍNH HÃNG 100%</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 10px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="28" height="28" align="center" style="background-color: #e6f7f5; border-radius: 50%; font-size: 13px;">🚚</td>
                              <td style="padding-left: 10px; color: #111827; font-size: 11.5px; font-weight: 700; letter-spacing: 0.3px;">GIAO HÀNG NHANH</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                            <tr>
                              <td width="28" height="28" align="center" style="background-color: #e6f7f5; border-radius: 50%; font-size: 13px;">🎧</td>
                              <td style="padding-left: 10px; color: #111827; font-size: 11.5px; font-weight: 700; letter-spacing: 0.3px;">HỖ TRỢ 24/7</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Banner -->
          <tr>
            <td style="background-color: #111827; padding: 22px 35px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <!-- Social Links -->
                  <td align="left" valign="middle">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <!-- Facebook -->
                        <td style="padding-right: 10px;">
                          <a href="https://facebook.com" target="_blank" style="text-decoration: none; display: block;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td align="center" valign="middle" width="34" height="34" style="background-color: #0d9488; border-radius: 50%; width: 34px; height: 34px; text-align: center; vertical-align: middle;">
                                  <img src="https://img.icons8.com/?size=100&id=118497&format=png&color=ffffff" width="16" height="16" alt="Facebook" style="display: block; margin: 0 auto; border: 0;">
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <!-- Instagram -->
                        <td style="padding-right: 10px;">
                          <a href="https://instagram.com" target="_blank" style="text-decoration: none; display: block;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td align="center" valign="middle" width="34" height="34" style="background-color: #0d9488; border-radius: 50%; width: 34px; height: 34px; text-align: center; vertical-align: middle;">
                                  <img src="https://img.icons8.com/?size=100&id=32323&format=png&color=ffffff" width="16" height="16" alt="Instagram" style="display: block; margin: 0 auto; border: 0;">
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                        <!-- Mail -->
                        <td>
                          <a href="mailto:support@aventis.io.vn" style="text-decoration: none; display: block;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                              <tr>
                                <td align="center" valign="middle" width="34" height="34" style="background-color: #0d9488; border-radius: 50%; width: 34px; height: 34px; text-align: center; vertical-align: middle;">
                                  <img src="https://img.icons8.com/?size=100&id=53388&format=png&color=ffffff" width="16" height="16" alt="Email" style="display: block; margin: 0 auto; border: 0;">
                                </td>
                              </tr>
                            </table>
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Copyright Info -->
                  <td align="right" valign="middle" style="color: #9ca3af; font-size: 11.5px; line-height: 1.5;">
                    <div>Đây là email tự động từ <strong>Aventis</strong>.</div>
                    <div>© ${new Date().getFullYear()} Aventis. All rights reserved.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};
