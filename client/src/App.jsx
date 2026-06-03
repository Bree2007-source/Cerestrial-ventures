import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Cart from "./pages/Cart";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";
import OrderTracking from "./pages/OrderTracking";
import TrackOrder from "./pages/TrackOrder";
import ProductPage from "./pages/ProductPage";
import CategoriesPage from "./pages/CategoriesPage";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";

import { AuthContext } from "./context/AuthContext";
import { CartContext } from "./context/CartContext";
import { ThemeContext } from "./context/ThemeContext";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
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
          <Route path="/orders" element={<OrderTracking />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Admin route */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;