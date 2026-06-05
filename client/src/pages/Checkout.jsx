import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

const Checkout = () => {
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [deliveryTime, setDeliveryTime] = useState('Today');
  const [paymentMethod, setPaymentMethod] = useState('M-Pesa');

  const formatPhone = (raw) => {
    let cleaned = raw.replace(/\s/g, '');
    if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
    if (cleaned.startsWith('+')) return cleaned.slice(1);
    return cleaned;
  };

  const getItemQuantity = (item) => Number(item.quantity || item.qty || 1);
  const getItemPrice = (item) => Number(item.retailPrice || item.price || 0);

  const itemsToOrder = cartItems.map(item => ({
    name: item.name,
    quantity: getItemQuantity(item),
    price: getItemPrice(item)
  }));

  const totalAmount = itemsToOrder.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!customerName || !phone || !location) {
      alert('Please fill in all fields');
      setLoading(false);
      return;
    }

    if (cartItems.length === 0) {
      alert('Your cart is empty');
      setLoading(false);
      return;
    }

    const formattedPhone = formatPhone(phone);

    const orderPayload = {
      customerName,
      phone: formattedPhone,
      location,
      deliveryTime,
      totalAmount,
      paymentMethod,
      items: itemsToOrder,
      status: 'Order Received', // ✅ Fixed
    };

    const saveOrder = async (extra = {}) => {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...orderPayload, ...extra }),
      });
      const data = await response.json();
      return { response, data };
    };

    const orderUrl = (orderId) => `/track-order?id=${orderId}`;

    if (paymentMethod === 'Cash') {
      try {
        const { response, data } = await saveOrder({ paymentMethod: 'Cash' });
        if (response.ok) {
          clearCart();
          alert('✅ Order placed! Pay cash on delivery.');
          navigate(orderUrl(data._id));
        } else {
          alert(data.message || '❌ Failed to save order. Please try again.');
        }
      } catch (err) {
        alert('❌ Cannot connect to server. Make sure backend is running.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const paymentRes = await fetch('http://localhost:5000/api/payments/stk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: formattedPhone, amount: totalAmount }),
      });

      const paymentData = await paymentRes.json();

      if (paymentRes.ok && paymentData.ResponseCode === '0') {
        alert('✅ STK Push sent! Check your phone and enter your M-Pesa PIN.');

        const { response, data } = await saveOrder({ mpesaCode: paymentData.CheckoutRequestID || '' });
        if (response.ok) {
          clearCart();
          alert('🎉 Order placed! Redirecting to tracking...');
          navigate(orderUrl(data._id));
        } else {
          alert(data.message || '⚠️ Payment sent but order save failed.');
        }
      } else {
        const { response, data } = await saveOrder();
        if (response.ok) {
          clearCart();
          alert('⚠️ M-Pesa prompt failed but order was saved. You can pay later.');
          navigate(orderUrl(data._id));
        } else {
          alert(data.message || '❌ Both payment and order save failed. Please try again.');
        }
      }
    } catch (err) {
      try {
        const { response, data } = await saveOrder();
        if (response.ok) {
          clearCart();
          alert('⚠️ Unable to reach M-Pesa server, but order was saved. Confirm payment with us.');
          navigate(orderUrl(data._id));
        } else {
          alert(data.message || '❌ Unable to save order. Please try again later.');
        }
      } catch (orderErr) {
        alert('❌ Cannot connect to server. Make sure backend is running on port 5000.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: '60px', marginBottom: '20px' }}>🛒</div>
        <h3>Your shopping cart is empty.</h3>
        <button
          onClick={() => navigate('/')}
          style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#15803d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
        >
          ← Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ borderBottom: '3px solid #15803d', paddingBottom: '10px', color: '#1e293b' }}>
        🛡️ Complete Your Order
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', marginTop: '20px' }}>

        {/* LEFT: Form */}
        <form onSubmit={handleSubmit} style={{ backgroundColor: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>Delivery Details</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Your Full Name *</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              placeholder="e.g., Brenda Kathure"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={labelStyle}>Phone Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="e.g., 0712345678"
              style={inputStyle}
            />
            <small style={{ color: '#64748b', fontSize: '11px' }}>
              Used for M-Pesa payment and delivery updates
            </small>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Delivery Location *</label>
            <textarea
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              placeholder="e.g., Nakuru Town, Section 5, Near Blankets Mill"
              rows="3"
              style={{ ...inputStyle, fontFamily: 'sans-serif', resize: 'vertical' }}
            />
          </div>

          {/* Delivery Time */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Delivery Time</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              {['Today', 'Tomorrow'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDeliveryTime(option)}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '10px',
                    border: `2px solid ${deliveryTime === option ? '#15803d' : '#e2e8f0'}`,
                    backgroundColor: deliveryTime === option ? '#dcfce7' : 'white',
                    color: deliveryTime === option ? '#15803d' : '#64748b',
                    fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s',
                  }}
                >
                  {option === 'Today' ? '⚡ Today' : '📅 Tomorrow'}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Payment Method</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              {[
                { id: 'M-Pesa', label: '📱 M-Pesa', desc: 'Pay via M-Pesa STK Push' },
                { id: 'Cash', label: '💵 Cash on Delivery', desc: 'Pay when goods arrive' },
              ].map((method) => (
                <div
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
                    borderRadius: '10px',
                    border: `2px solid ${paymentMethod === method.id ? '#15803d' : '#e2e8f0'}`,
                    backgroundColor: paymentMethod === method.id ? '#dcfce7' : 'white',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%',
                    border: `2px solid ${paymentMethod === method.id ? '#15803d' : '#cbd5e1'}`,
                    backgroundColor: paymentMethod === method.id ? '#15803d' : 'white',
                    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {paymentMethod === method.id && (
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{method.label}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{method.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: loading ? '#86efac' : '#15803d',
              color: 'white', border: 'none', padding: '14px', borderRadius: '8px',
              fontWeight: 'bold', fontSize: '16px',
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%', transition: 'background 0.2s',
            }}
          >
            {loading
              ? '🔄 Processing...'
              : paymentMethod === 'M-Pesa'
              ? `📞 Pay KSh ${totalAmount.toLocaleString()} via M-Pesa`
              : `✅ Place Order — KSh ${totalAmount.toLocaleString()} (Cash)`}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#94a3b8', marginTop: '10px' }}>
            {paymentMethod === 'M-Pesa'
              ? '💳 You will receive an M-Pesa prompt on your phone'
              : '🚚 Pay cash when your order is delivered'}
          </p>
        </form>

        {/* RIGHT: Order Summary */}
        <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>📋 Order Summary</h3>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
            <span style={{ backgroundColor: '#dcfce7', color: '#15803d', fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px' }}>
              {deliveryTime === 'Today' ? '⚡ Delivery Today' : '📅 Delivery Tomorrow'}
            </span>
            <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '12px', fontWeight: 'bold', padding: '4px 12px', borderRadius: '20px' }}>
              {paymentMethod === 'M-Pesa' ? '📱 M-Pesa' : '💵 Cash'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '15px 0', maxHeight: '350px', overflowY: 'auto' }}>
            {cartItems.map((item, index) => (
              <div key={item._id || index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <strong>{item.name}</strong>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '12px' }}>
                    Qty: {item.qty || item.quantity || 1} × KSh {(item.retailPrice || item.price).toLocaleString()}
                  </span>
                </div>
                <strong style={{ color: '#15803d' }}>
                  KSh {((item.retailPrice || item.price) * (item.qty || item.quantity || 1)).toLocaleString()}
                </strong>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #15803d', paddingTop: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Grand Total:</span>
              <strong style={{ fontSize: '26px', color: '#15803d' }}>
                KSh {totalAmount.toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const labelStyle = {
  display: 'block', fontSize: '13px', fontWeight: 'bold',
  marginBottom: '5px', color: '#334155',
};

const inputStyle = {
  width: '100%', padding: '10px', borderRadius: '6px',
  border: '1px solid #cbd5e1', boxSizing: 'border-box', fontSize: '14px',
};

export default Checkout;