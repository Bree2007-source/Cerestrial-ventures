import express from 'express';
import axios from 'axios';

const router = express.Router();

// ==========================================
// MIDDLEWARE: Generate M-Pesa Access Token
// ==========================================
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
        console.error("❌ M-Pesa Access Token Handshake Failed:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to authenticate with Safaricom gateway" });
    }
};

// ==========================================
// ROUTE 1: Initiate STK Push (Frontend Trigger)
// ==========================================
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

    // Generate accurate timestamp (YYYYMMDDHHMMSS)
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
        console.log("✅ STK Push Request Dispatched Successfully:", response.data);
        res.status(200).json(response.data);
    } catch (error) {
        console.error("❌ Safaricom Daraja Processing Failure:", error.response?.data || error.message);
        res.status(500).json({
            message: "Safaricom rejected payment parameters",
            details: error.response?.data || error.message
        });
    }
});

// ==========================================
// ROUTE 2: M-Pesa Callback Webhook Endpoint
// ==========================================
// Safaricom sends payment results here asynchronously
router.post('/callback', async (req, res) => {
    try {
        const { Body } = req.body;
        
        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ message: "Invalid callback metadata layout" });
        }

        const callbackData = Body.stkCallback;
        const resultCode = callbackData.ResultCode;
        const resultDesc = callbackData.ResultDesc;
        const merchantRequestID = callbackData.MerchantRequestID;
        const checkoutRequestID = callbackData.CheckoutRequestID;

        console.log(`\n============== 💰 M-PESA CALLBACK RECEIVED ==============`);
        console.log(`MerchantRequestID: ${merchantRequestID}`);
        console.log(`CheckoutRequestID: ${checkoutRequestID}`);
        console.log(`Result Code: ${resultCode} (${resultDesc})`);

        if (resultCode === 0) {
            // Transaction was successful! Parse details safely
            const metadataItems = callbackData.CallbackMetadata.Item;
            
            const amount = metadataItems.find(item => item.Name === 'Amount')?.Value;
            const mpesaReceiptNumber = metadataItems.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const transactionDate = metadataItems.find(item => item.Name === 'TransactionDate')?.Value;
            const phoneNumber = metadataItems.find(item => item.Name === 'PhoneNumber')?.Value;

            console.log(`✅ SUCCESSFUL PAYMENT`);
            console.log(`Receipt: ${mpesaReceiptNumber} | Amount: KES ${amount} | Phone: ${phoneNumber}`);

            // TODO: Hook into your Order model here to mark the transaction as paid:
            // await Order.findOneAndUpdate({ checkoutRequestID }, { isPaid: true, paidAt: Date.now() });

        } else {
            // Payment failed or was cancelled by the user
            console.log(`❌ FAILED/CANCELLED TRANSACTION: ${resultDesc}`);
        }
        console.log(`=========================================================\n`);

        // Safaricom expects a clean 200 acknowledgment response layout
        res.status(200).json({ ResultCode: 0, ResultDesc: "Callback processed successfully" });
    } catch (error) {
        console.error("❌ Error parsing Safaricom Webhook layout:", error.message);
        res.status(500).json({ message: "Internal server error reading payment callback" });
    }
});

export default router;