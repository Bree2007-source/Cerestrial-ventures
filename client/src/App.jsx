import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Existing Imports
import Home from "./pages/Home";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";
import TrackOrder from "./pages/TrackOrder";
import ProductPage from "./pages/ProductPage";
import CategoriesPage from "./pages/CategoriesPage";
import AdminDashboard from "./pages/AdminDashboard";
import OrderManagement from "./pages/OrderManagement";
import Profile from "./pages/Profile";
import Wishlist from "./pages/Wishlist";
import VerifyLogin from './pages/VerifyLogin';

// Driver Panel Imports
import DriverDashboard from "./pages/DriverDashboard";
import DeliveryHistory from "./pages/DeliveryHistory";
import DeliveryDetails from "./pages/DeliveryDetails";
import DeliveryProgress from "./pages/DeliveryProgress";
import PaymentConfirmation from "./pages/PaymentConfirmation";
import MyDeliveries from "./pages/MyDeliveries";
import DriverProfile from "./pages/DriverProfile";
import Notifications from "./pages/Notifications";
import MapView from "./pages/MapView";

// Providers & Components
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DriverLocationProvider } from "./context/DriverLocationContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import BottomNav from "./components/BottomNav";
import DriverBottomNav from "./components/DriverBottomNav";
import Header from "./components/Header";
import InstallPrompt from "./components/InstallPrompt";

function AppRoutes() {
  const location = useLocation();
  const { user } = useAuth();

  // Routes where we want to hide the standard customer Header/Nav —
  // includes auth pages, admin, and the entire driver panel (which renders
  // its own DriverBottomNav internally instead of relying on this layout).
  const hiddenPaths = [
    '/login', '/register', '/admin',
    '/driver-dashboard', '/my-deliveries', '/delivery-history',
    '/delivery-details', '/delivery-progress', '/payment-confirmation',
    '/delivery-payment', '/delivery-map', '/driver-notifications',
    '/driver-deliveries', '/driver-earnings', '/driver-profile',
  ];

  const [selectedCategory, setSelectedCategory] = useState('All');
  const isHidden = hiddenPaths.some(path => location.pathname.startsWith(path));

  return (
    <div style={{ minHeight: '100vh', paddingBottom: isHidden ? 0 : '92px' }}>
      {!isHidden && (
        <Header
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
        />
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
        <Route path="/verify-login" element={<VerifyLogin />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />

          {/* Driver Panel Routes */}
          <Route path="/driver-dashboard" element={<DriverDashboard />} />
          <Route path="/driver-deliveries" element={<MyDeliveries />} />
          <Route path="/my-deliveries" element={<MyDeliveries />} />
          <Route path="/delivery-history" element={<DeliveryHistory />} />
          <Route path="/delivery-details/:id" element={<DeliveryDetails />} />
          <Route path="/delivery-progress/:id" element={<DeliveryProgress />} />
          <Route path="/payment-confirmation" element={<PaymentConfirmation />} />
          <Route path="/driver-profile" element={<DriverProfile />} />
          <Route path="/driver-notifications" element={<Notifications />} />
          <Route path="/delivery-map" element={<MapView />} />
          {/* FIX: DeliveryDetails.jsx navigates to `/delivery-payment/${order._id}`
              for both "Collect Payment" and "Finish Delivery" — this route was
              missing entirely, so those buttons led nowhere. Reuses the same
              PaymentConfirmation component, now with an :id param so it can
              read the order via useParams(). Verify PaymentConfirmation.jsx
              actually reads `id` this way — if it currently expects the order
              via navigation state instead, that file needs a matching update. */}
          <Route path="/delivery-payment/:id" element={<PaymentConfirmation />} />
        </Route>

        {/* Admin only */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<OrderManagement />} />
        </Route>
      </Routes>

      {/* Customer bottom nav only — driver pages render their own DriverBottomNav internally */}
      {!isHidden && user?.role !== 'driver' && <BottomNav />}

      <InstallPrompt />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        {/* Mounted once, here — NOT inside any <Route> — so GPS tracking
            survives navigation across every driver screen (Dashboard,
            My Deliveries, Route Map, Delivery Progress, Profile) instead
            of restarting/stopping whenever a page unmounts. It reads
            `user` from AuthProvider above it and is a no-op for anyone
            who isn't logged in as a driver. */}
        <DriverLocationProvider>
          <NotificationProvider>
            <CartProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </CartProvider>
          </NotificationProvider>
        </DriverLocationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;