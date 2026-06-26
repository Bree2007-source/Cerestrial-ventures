const APP_NAME = 'Cerestrial Ventures';
const BRAND_COLOR = '#1a7a4a';

function otpEmailHtml(otpCode, firstName = '') {
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f5f5f5;padding:24px;border-radius:8px;">
      <div style="background:${BRAND_COLOR};padding:18px 24px;border-radius:6px 6px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:1px;">${APP_NAME}</h1>
      </div>
      <div style="background:#fff;padding:32px 28px;border-radius:0 0 6px 6px;border:1px solid #ddd;border-top:none;">
        <p style="color:#333;margin-top:0;font-size:15px;">Hello${firstName ? ` ${firstName}` : ''},</p>
        <p style="color:#555;font-size:14px;">Use the code below to complete your login. It expires in <strong>5 minutes</strong>.</p>
        <div style="text-align:center;margin:32px 0;">
          <span style="display:inline-block;background:#f0faf5;border:2px dashed ${BRAND_COLOR};color:${BRAND_COLOR};font-size:38px;font-weight:bold;letter-spacing:14px;padding:18px 32px;border-radius:10px;font-family:monospace;">
            ${otpCode}
          </span>
        </div>
        <p style="color:#888;font-size:12px;text-align:center;">If you did not attempt to log in, please change your password immediately.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#bbb;font-size:11px;text-align:center;">© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
      </div>
    </div>
  `;
}

function passwordChangedEmailHtml(firstName = '') {
  const time = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' });
  return `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#f5f5f5;padding:24px;border-radius:8px;">
      <div style="background:${BRAND_COLOR};padding:18px 24px;border-radius:6px 6px 0 0;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:20px;">${APP_NAME}</h1>
      </div>
      <div style="background:#fff;padding:32px 28px;border-radius:0 0 6px 6px;border:1px solid #ddd;border-top:none;">
        <p style="color:#333;font-size:15px;">Hello${firstName ? ` ${firstName}` : ''},</p>
        <p style="color:#555;font-size:14px;">Your account password was <strong>successfully changed</strong> on:</p>
        <p style="text-align:center;font-weight:bold;color:${BRAND_COLOR};font-size:15px;">${time} (EAT)</p>
        <p style="color:#e53e3e;font-size:13px;background:#fff5f5;padding:12px 16px;border-radius:6px;border-left:4px solid #e53e3e;">
          If you did not make this change, please contact our support team or reset your password immediately.
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="color:#bbb;font-size:11px;text-align:center;">© ${new Date().getFullYear()} ${APP_NAME}.</p>
      </div>
    </div>
  `;
}

module.exports = { otpEmailHtml, passwordChangedEmailHtml };