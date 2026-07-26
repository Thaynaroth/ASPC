import { type ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { lang } = useParams<{ lang: string }>();

  if (loading) return null;
  if (!user) return <Navigate to={`/${lang || 'en'}/login`} replace />;

  return <>{children}</>;
}
