import { useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CartContext } from '../context/CartContext'

function CartPage() {
  const { cartItems, removeFromCart, updateQty, cartTotal, clearCart } = useContext(CartContext)
  const navigate = useNavigate()

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center"
        >
          <div className="text-8xl mb-6">🛒</div>
          <h2 className="text-3xl font-black text-gray-800 mb-2">Your cart is empty!</h2>
          <p className="text-gray-500 mb-8">Add some products to get started</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-3 rounded-2xl text-lg"
          >
            ← Continue Shopping
          </motion.button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-gray-800">
            🛒 Your Cart
            <span className="ml-3 bg-green-100 text-green-700 text-lg px-3 py-1 rounded-full">
              {cartItems.length} items
            </span>
          </h1>
          <button
            onClick={clearCart}
            className="text-red-500 hover:text-red-700 text-sm font-medium border border-red-200 hover:border-red-400 px-4 py-2 rounded-xl transition-colors"
          >
            🗑️ Clear Cart
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => {
                const quantity = Number(item.quantity || item.qty || 1);
                const price = Number(item.retailPrice || item.price || 0);

                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4"
                  >
                    {/* Product Image */}
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-xl flex-shrink-0"
                    />

                    {/* Product Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {item.category}
                          </span>
                          <h3 className="font-bold text-gray-800 mt-1">{item.name}</h3>
                          <p className="text-green-600 font-bold text-lg">
                            KSh {price.toLocaleString()}
                          </p>
                          <p className="text-gray-400 text-xs">
                            Wholesale: KSh {item.wholesalePrice}
                          </p>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => removeFromCart(item._id)}
                          className="text-red-400 hover:text-red-600 text-xl transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-1">
                          <button
                            onClick={() => updateQty(item._id, quantity - 1)}
                            className="text-gray-600 hover:text-red-500 font-bold text-lg w-6 text-center transition-colors"
                          >
                            −
                          </button>
                          <span className="font-bold text-gray-800 w-6 text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => updateQty(item._id, quantity + 1)}
                            className="text-gray-600 hover:text-green-500 font-bold text-lg w-6 text-center transition-colors"
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total */}
                        <p className="font-black text-gray-800 text-lg">
                          KSh {(price * quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Continue Shopping */}
            <button
              onClick={() => navigate('/')}
              className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center gap-2 mt-2"
            >
              ← Continue Shopping
            </button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24"
            >
              <h2 className="text-xl font-black text-gray-800 mb-6">
                📋 Order Summary
              </h2>

              {/* Items breakdown */}
              <div className="space-y-3 mb-6">
                {cartItems.map((item) => {
                  const quantity = Number(item.quantity || item.qty || 1);
                  const price = Number(item.retailPrice || item.price || 0);

                  return (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.name} × {quantity}
                      </span>
                      <span className="font-medium text-gray-800">
                        KSh {(price * quantity).toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">KSh {cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery fee</span>
                  <span className="font-medium text-green-600">Calculated at checkout</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between">
                  <span className="font-black text-gray-800 text-lg">Total</span>
                  <span className="font-black text-green-600 text-xl">
                    KSh {cartTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Wholesale notice */}
              {cartItems.some(item => Number(item.quantity || item.qty || 1) >= 10) && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                  <p className="text-yellow-700 text-xs font-bold">
                    🎉 You qualify for wholesale pricing on some items!
                  </p>
                </div>
              )}

              {/* Checkout Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/checkout')}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-2xl text-lg mt-6 transition-colors shadow-lg"
              >
                Checkout → 
              </motion.button>

              {/* WhatsApp Order */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  const msg = cartItems
                    .map(i => {
                      const quantity = Number(i.quantity || i.qty || 1);
                      const price = Number(i.retailPrice || i.price || 0);
                      return `${i.name} x${quantity} = KSh ${price * quantity}`;
                    })
                    .join('%0A');
                  window.open(`https://wa.me/254700000000?text=Hello! I'd like to order:%0A${msg}%0A%0ATotal: KSh ${cartTotal}`);
                }}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-2xl mt-3 transition-colors flex items-center justify-center gap-2"
              >
                <span>📱</span> Order via WhatsApp
              </motion.button>

              {/* M-Pesa note */}
              <p className="text-center text-gray-400 text-xs mt-4">
                💳 We accept M-Pesa & Cash on Delivery
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartPage