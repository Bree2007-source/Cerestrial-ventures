import express from 'express';
import axios from 'axios';
import Order from '../models/Order.js';

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
// Kept for any existing callers that don't have an orderId (e.g. non-order
// checkout flows). Prefer POST /stk/:orderId below for anything tied to a
// delivery, since that's what lets the callback find its way back to the
// right order.
router.post('/stk', generateMpesaToken, async (req, res) => {
    let { phone, amount } = req.body;

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
            { headers: { Authorization: `Bearer ${req.mpesaToken}` } }
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
// ROUTE 1b: Initiate STK Push FOR A SPECIFIC ORDER — used by driver PaymentFlow.jsx
// ==========================================
// NOTE — requires Order.js to carry an `mpesaCheckoutRequestId` field (see
// the accompanying Order.js model note). That's how ROUTE 2's callback
// below finds its way back to this order when Safaricom calls back with
// only a CheckoutRequestID, no order reference.
router.post('/stk/:orderId', generateMpesaToken, async (req, res) => {
    let { phone, amount } = req.body;

    try {
        const order = await Order.findById(req.params.orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });

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
            AccountReference: order.receiptNumber || `Order-${order._id}`,
            TransactionDesc: `Payment for order ${order.receiptNumber || order._id}`
        };

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkBody,
            { headers: { Authorization: `Bearer ${req.mpesaToken}` } }
        );

        // Store the CheckoutRequestID so the callback (ROUTE 2) can match
        // Safaricom's async response back to this exact order.
        order.mpesaCheckoutRequestId = response.data.CheckoutRequestID || '';
        await order.save();

        console.log("✅ STK Push Request Dispatched for order:", order._id.toString(), response.data);
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

        const order = await Order.findOne({ mpesaCheckoutRequestId: checkoutRequestID });

        if (!order) {
            console.warn(`⚠️ No order found for CheckoutRequestID ${checkoutRequestID} — nothing to update.`);
            return res.status(200).json({ ResultCode: 0, ResultDesc: "Callback processed successfully" });
        }

        const io = req.app.get('io');

        if (resultCode === 0) {
            const metadataItems = callbackData.CallbackMetadata.Item;

            const amount = metadataItems.find(item => item.Name === 'Amount')?.Value;
            const mpesaReceiptNumber = metadataItems.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            const phoneNumber = metadataItems.find(item => item.Name === 'PhoneNumber')?.Value;

            console.log(`✅ SUCCESSFUL PAYMENT`);
            console.log(`Receipt: ${mpesaReceiptNumber} | Amount: KES ${amount} | Phone: ${phoneNumber}`);

            order.paymentStatus = 'Paid';
            order.mpesaCode = mpesaReceiptNumber || '';
            order.paymentTime = new Date();
            await order.save();

            if (io) {
                io.to(order._id.toString()).emit('payment_status_changed', {
                    orderId: order._id.toString(),
                    paymentStatus: 'Paid',
                });
                io.to('admin_room').emit('order_updated', {
                    orderId: order._id.toString(),
                    status: order.status,
                });
            }
        } else {
            console.log(`❌ FAILED/CANCELLED TRANSACTION: ${resultDesc}`);

            order.paymentStatus = 'Failed';
            await order.save();

            if (io) {
                io.to(order._id.toString()).emit('payment_status_changed', {
                    orderId: order._id.toString(),
                    paymentStatus: 'Failed',
                });
            }
        }
        console.log(`=========================================================\n`);

        res.status(200).json({ ResultCode: 0, ResultDesc: "Callback processed successfully" });
    } catch (error) {
        console.error("❌ Error parsing Safaricom Webhook layout:", error.message);
        res.status(500).json({ message: "Internal server error reading payment callback" });
    }
});

export default router;