import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import api from './lib/api'

import AuthLayout from './layouts/AuthLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { DriverLayout } from './layouts/DriverLayout'
import { AdminLayout } from './layouts/AdminLayout'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AuthCallback from './pages/auth/AuthCallback'
import DashboardPage from './pages/dashboard/DashboardPage'
import ProductsPage from './pages/products/ProductsPage'
import OrdersPage from './pages/orders/OrdersPage'
import CategoriesPage from './pages/categories/CategoriesPage'
import SubscriptionPage from './pages/subscription/SubscriptionPage'
import UpgradePage from './pages/subscription/UpgradePage'
import AdsPage from './pages/ads/AdsPage'
import ChatPage from './pages/chat/ChatPage'
import ReviewsPage from './pages/reviews/ReviewsPage'
import SettingsPage from './pages/settings/SettingsPage'
import DriverDashboardPage from './pages/driver/DriverDashboardPage'
import DriverDeliveriesPage from './pages/driver/DriverDeliveriesPage'
import DriverEarningsPage from './pages/driver/DriverEarningsPage'
import DriverHistoryPage from './pages/driver/DriverHistoryPage'
import DriverChatPage from './pages/driver/DriverChatPage'
import DriverSettingsPage from './pages/driver/DriverSettingsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'

import CustomerLayout from './layouts/CustomerLayout'
import CustomerHomePage from './pages/customer/CustomerHomePage'
import CustomerShopPage from './pages/customer/CustomerShopPage'
import CustomerProfilePage from './pages/customer/CustomerProfilePage'
import CustomerOrdersPage from './pages/customer/CustomerOrdersPage'
import CustomerMessagesPage from './pages/customer/CustomerMessagesPage'
import ConfirmDeliveryPage from './pages/ConfirmDeliveryPage'
import NotFound from './pages/NotFound'

function AuthGuard() {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-2 text-text-muted">
        <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
        Chargement...
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

function AppInit() {
  const { setAuth, setLoading, logout } = useAuthStore()

  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    if (!token) {
      setLoading(false)
      return
    }

    api.get('/auth/me')
      .then(res => {
        if (res.data.success) {
          setAuth(res.data.data, token)
        }
      })
      .catch(() => {
        logout()
      })
      .finally(() => {
        setLoading(false)
      })
  }, [setAuth, setLoading, logout])

  return null
}

function MerchantRoutes() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="upgrade" element={<UpgradePage />} />
        <Route path="ads" element={<AdsPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function DriverRoutes() {
  return (
    <Routes>
      <Route element={<DriverLayout />}>
        <Route index element={<DriverDashboardPage />} />
        <Route path="deliveries" element={<DriverDeliveriesPage />} />
        <Route path="chat" element={<DriverChatPage />} />
        <Route path="earnings" element={<DriverEarningsPage />} />
        <Route path="history" element={<DriverHistoryPage />} />
        <Route path="settings" element={<DriverSettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function AppContent() {
  const { user, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-2 text-text-muted">
        <div className="w-8 h-8 border-2 border-burkina-green-deep border-t-transparent rounded-full animate-spin" />
        Chargement...
      </div>
    )
  }

  const isDriver = user?.role === 'driver'
  const isMerchant = user?.role === 'merchant'
  const isCustomer = user?.role === 'customer'
  const isAdmin = user?.role === 'admin'

  return (
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Route>

      {/* Public: QR code delivery confirmation (scanned by the customer) */}
      <Route path="/confirm-delivery/:orderId" element={<ConfirmDeliveryPage />} />

      {/* Public / Customer Routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/marketplace" element={<CustomerHomePage />} />
        <Route path="/shops" element={<CustomerHomePage />} />
        <Route path="/shops/:subdomain" element={<CustomerShopPage />} />
        
        {/* If customer or guest, root goes to marketplace */}
        {(!user || isCustomer) && (
          <Route path="/" element={<CustomerHomePage />} />
        )}

        {/* Customer account pages */}
        {isCustomer && (
          <>
            <Route path="/profile" element={<CustomerProfilePage />} />
            <Route path="/orders" element={<CustomerOrdersPage />} />
            <Route path="/messages" element={<CustomerMessagesPage />} />
          </>
        )}
      </Route>

      {/* Protected Admin Routes */}
      <Route element={<AuthGuard />}>
        <Route path="/admin/*" element={
          isAdmin ? <AdminRoutes /> : <Navigate to="/marketplace" replace />
        } />
      </Route>

      {/* Protected Merchant / Driver Routes */}
      <Route element={<AuthGuard />}>
        <Route path="/*" element={
          isDriver ? <DriverRoutes /> :
          isMerchant ? <MerchantRoutes /> :
          <Navigate to="/marketplace" replace />
        } />
      </Route>

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <>
      <AppInit />
      <AppContent />
    </>
  )
}
