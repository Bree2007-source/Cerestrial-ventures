import nodemailer from 'nodemailer'

const getSmtpTransport = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getSmtpTransport()
  if (!transporter) {
    console.warn('⚠️ SMTP credentials are not configured. Email not sent:', subject)
    return false
  }

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@cerestrial.com',
      to,
      subject,
      html,
      text,
    })
    return true
  } catch (error) {
    console.error('Email send failed:', error)
    return false
  }
}

export const sendSms = async ({ to, message }) => {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    console.warn('⚠️ Twilio credentials are not configured. SMS not sent:', message)
    return false
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`
    const body = new URLSearchParams({
      From: process.env.TWILIO_FROM_NUMBER,
      To: to,
      Body: message,
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Twilio SMS error:', errText)
      return false
    }

    return true
  } catch (error) {
    console.error('SMS send failed:', error)
    return false
  }
}
