import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../context/CartContext';

function Cart() {
  const { cartItems, addToCart, removeFromCart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();

  // Helper function to extract correct pricing from your database fields
  const getActivePrice = (item) => {
    const qty = Number(item.quantity) || 1;
    // Check if wholesale applies (10 or more units) and if wholesalePrice exists
    if (qty >= 10 && item.wholesalePrice) {
      return Number(item.wholesalePrice);
    }
    // Fallback to retailPrice, then standard price, then 0
    return Number(item.retailPrice) || Number(item.price) || 0;
  };

  // Safe arithmetic subtotal reduce layout
  const subtotal = cartItems.reduce((acc, item) => {
    const qty = Number(item.quantity) || 1;
    return acc + (getActivePrice(item) * qty);
  }, 0);

  return (
    <div className="max-w-7xl mx-auto p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          🛒 Your Cart 
          <span className="text-sm bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full">
            {cartItems.length} items
          </span>
        </h2>
        {cartItems.length > 0 && (
          <button 
            onClick={clearCart}
            className="text-sm text-red-500 border border-red-200 hover:bg-red-50 bg-white font-medium px-4 py-2 rounded-xl transition-all"
          >
            🗑️ Clear Cart
          </button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <p className="text-slate-500 text-lg mb-4">Your basket feels empty!</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-emerald-600 text-white text-sm font-bold px-6 py-2 rounded-xl hover:bg-emerald-700 transition-all"
          >
            ← Continue Shopping
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Itemized Grid Display */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {cartItems.map((item) => {
              const basePrice = getActivePrice(item);
              const qty = Number(item.quantity) || 1;
              const isWholesale = qty >= 10 && item.wholesalePrice;

              return (
                <div key={item._id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex gap-4 items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img src={item.image} alt={item.name} className="w-20 h-20 object-cover rounded-xl" />
                    <div>
                      <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                      <h3 className="font-bold text-slate-800 mt-1">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm font-extrabold text-emerald-600">KSh {basePrice}</p>
                        {isWholesale && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                            Wholesale Rate Applied
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operational Increment Controls */}
                  <div className="flex items-center border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                    <button 
                      onClick={() => removeFromCart(item._id)}
                      className="px-3 py-1.5 font-bold hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-3 font-bold text-slate-800 text-sm">{qty}</span>
                    <button 
                      onClick={() => addToCart(item)}
                      className="px-3 py-1.5 font-bold hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            
            <button 
              onClick={() => navigate('/')}
              className="text-emerald-600 text-sm font-bold self-start hover:underline mt-2"
            >
              ← Continue Shopping
            </button>
          </div>

          {/* Corrected Order Summary Cards */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-3 mb-4">
              📋 Order Summary
            </h3>
            
            <div className="flex flex-col gap-3 text-sm text-slate-600 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-800">KSh {subtotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delivery fee</span>
                <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-medium">
                  Calculated at checkout
                </span>
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between text-base font-black text-slate-800 mt-2">
                <span>Total Cost</span>
                <span className="text-emerald-600 text-xl font-bold">KSh {subtotal}</span>
              </div>
            </div>

            <button 
              onClick={() => navigate('/checkout')}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 shadow-sm transition-all text-center block text-sm"
            >
              Checkout →
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

export default Cart;