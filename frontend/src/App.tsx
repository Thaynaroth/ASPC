import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import OrderPage from '@/pages/OrderPage';
import CategoryPage from '@/pages/CategoryPage';
import PlaceholderPage from '@/pages/PlaceholderPage';

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/en" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/en" replace />} />

            <Route
              path="/:lang/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />

            <Route
              path="/:lang"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="report" element={<PlaceholderPage title="Report" />} />
              <Route path="agent" element={<PlaceholderPage title="Agent" />} />
              <Route path="chat" element={<PlaceholderPage title="Chat" />} />
              <Route path="order" element={<OrderPage />} />
              <Route path="promotion" element={<PlaceholderPage title="Promotion" />} />
              <Route path="product" element={<PlaceholderPage title="Product" />} />
              <Route path="category" element={<CategoryPage />} />
              <Route path="customer" element={<PlaceholderPage title="Customer" />} />
              <Route path="shop" element={<PlaceholderPage title="Shop" />} />
              <Route path="user" element={<PlaceholderPage title="User" />} />
              <Route path="setting" element={<PlaceholderPage title="Setting" />} />
              <Route path="profile" element={<PlaceholderPage title="Profile" />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
