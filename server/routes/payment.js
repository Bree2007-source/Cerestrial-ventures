import express from 'express';
import axios from 'axios';

const router = express.Router();

// Middleware to generate Safaricom access tokens dynamically
const generateMpesaToken = async (req, res, next) => {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const authHeader = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    try {
        const response = await axios.get(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
            {
                headers: {
                    Authorization: `Basic ${authHeader}`
                }
            }
        );
        req.mpesaToken = response.data.access_token;
        next();
    } catch (error) {
        console.error("M-Pesa Access Token Handshake Failed:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to authenticate with Safaricom gateway" });
    }
};

// Route to process frontend checkout STK Push triggers
router.post('/stk', generateMpesaToken, async (req, res) => {
    let { phone, amount } = req.body;

    // Sanitize phone input format to 254XXXXXXXXX
    if (phone.startsWith('0')) {
        phone = '254' + phone.slice(1);
    } else if (phone.startsWith('+')) {
        phone = phone.slice(1);
    }
    phone = phone.replace(/\s+/g, '');

    const shortCode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;

    const date = new Date();
    const timestamp = 
        date.getFullYear() +
        ("0" + (date.getMonth() + 1)).slice(-2) +
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    const password = Buffer.from(shortCode + passkey + timestamp).toString('base64');

    const stkBody = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.round(Number(amount)), 
        PartyA: phone,
        PartyB: shortCode,
        PhoneNumber: phone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: "Cerestial Ventures",
        TransactionDesc: "Online Order Payment"
    };

    try {
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkBody,
            {
                headers: {
                    Authorization: `Bearer ${req.mpesaToken}`
                }
            }
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.error("Safaricom Daraja Processing Failure:", error.response?.data || error.message);
        res.status(500).json({
            message: "Safaricom rejected payment parameters",
            details: error.response?.data || error.message
        });
    }
});

export default router;