import React, { createContext, useContext, useState, useEffect } from 'react';

export const CartContext = createContext();
export const CartProvider = ({ children }) => {
  // Reads item list configuration array from memory cache on initial load
  const [cartItems, setCartItems] = useState(() => {
    const cachedCart = localStorage.getItem('cerestrial_cart');
    return cachedCart ? JSON.parse(cachedCart) : [];
  });

  useEffect(() => {
    localStorage.setItem('cerestrial_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item._id === product._id);
      if (existing) {
        return prev.map(item =>
          item._id === product._id
            ? { ...item, quantity: (item.quantity || item.qty || 0) + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item._id !== id));
  };

  const updateQty = (id, nextQty) => {
    setCartItems(prev => prev.reduce((items, item) => {
      if (item._id !== id) {
        items.push(item);
        return items;
      }

      const quantity = Number(nextQty) || 0;
      if (quantity > 0) {
        items.push({ ...item, quantity });
      }
      return items;
    }, []));
  };

  const updateQuantity = (id, amount) => {
    setCartItems(prev => prev.reduce((items, item) => {
      if (item._id !== id) {
        items.push(item);
        return items;
      }

      const nextQty = (item.quantity || item.qty || 0) + amount;
      if (nextQty > 0) {
        items.push({ ...item, quantity: nextQty });
      }
      return items;
    }, []));
  };

  const clearCart = () => setCartItems([]);

  const getSubtotal = () => cartItems.reduce((sum, item) => {
    const quantity = Number(item.quantity || item.qty || 1);
    const price = Number(item.retailPrice || item.price || 0);
    return sum + price * quantity;
  }, 0);

  const cartTotal = getSubtotal();

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQty, updateQuantity, clearCart, getSubtotal, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);