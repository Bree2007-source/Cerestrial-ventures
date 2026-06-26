const APP_NAME   = 'Cerestrial Ventures';
const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM  = process.env.TWILIO_PHONE_NUMBER;

export async function sendOtpSms(phoneNumber, otpCode) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.log(`[SMS STUB] OTP ${otpCode} → ${phoneNumber}`);
    return;
  }
  try {
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const body = new URLSearchParams({
      To:   phoneNumber,
      From: TWILIO_FROM,
      Body: `${APP_NAME} Verification Code: ${otpCode}. This code expires in 5 minutes. Do not share it.`,
    });
    const resp = await fetch(url, {
      method:  'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    if (!resp.ok) console.error('[SMS] Twilio error:', await resp.text());
  } catch (err) {
    console.error('[SMS] OTP send failed:', err.message);
  }
}

export async function sendPasswordChangedSms(phoneNumber) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    console.log(`[SMS STUB] Password changed → ${phoneNumber}`);
    return;
  }
  try {
    const url  = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
    const body = new URLSearchParams({
      To:   phoneNumber,
      From: TWILIO_FROM,
      Body: `${APP_NAME}: Your password was changed successfully. If this wasn't you, contact support immediately.`,
    });
    await fetch(url, {
      method:  'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  } catch (err) {
    console.error('[SMS] Password change notification failed:', err.message);
  }
}