import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
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
              <Route path="dashboard" element={<PlaceholderPage title="Dashboard" />} />
              <Route path="report" element={<PlaceholderPage title="Report" />} />
              <Route path="order" element={<PlaceholderPage title="Order" />} />
              <Route path="product" element={<PlaceholderPage title="Product" />} />
              <Route path="customer" element={<PlaceholderPage title="Customer" />} />
              <Route path="team" element={<PlaceholderPage title="Team" />} />
              <Route path="setting" element={<PlaceholderPage title="Setting" />} />
              <Route path="profile" element={<PlaceholderPage title="Profile" />} />
            </Route>
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
