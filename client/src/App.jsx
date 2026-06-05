import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import Orders from "./pages/Orders";
import TrackOrder from "./pages/TrackOrder";
import ProductPage from "./pages/ProductPage";
import CategoriesPage from "./pages/CategoriesPage";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";

import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";

import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav";
import Header from "./components/Header";

function AppRoutes() {
  const location = useLocation();
  const hiddenPaths = ['/login', '/register', '/admin'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '92px' }}>
      {!hiddenPaths.includes(location.pathname) && (
        <Header selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
      )}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home selectedCategory={selectedCategory} />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/track-order" element={<TrackOrder />} />

        {/* Protected routes (user must be logged in) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
        </Route>

        {/* Admin route */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>

      {!hiddenPaths.includes(location.pathname) && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 