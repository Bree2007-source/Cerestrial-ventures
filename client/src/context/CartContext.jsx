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
        return prev.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item._id !== id));
  };

  const updateQuantity = (id, amount) => {
    setCartItems(prev => prev.map(item => {
      if (item._id === id) {
        const nextQty = item.quantity + amount;
        return nextQty > 0 ? { ...item, quantity: nextQty } : item;
      }
      return item;
    }));
  };

  const clearCart = () => setCartItems([]);

  const getSubtotal = () => cartItems.reduce((sum, item) => sum + (item.retailPrice * item.quantity), 0);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getSubtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);