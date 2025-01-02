import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/hooks/useSession';
import { LoadingState } from '@/components/client/dashboard/LoadingState';

export const ProtectedRoute = () => {
  const { getSession, isLoading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getSession();
      
      if (!session) {
        // Determine which login page to redirect to based on the current path
        const isAdminRoute = location.pathname.startsWith('/admin');
        const loginPath = isAdminRoute ? '/admin/login' : '/client/login';
        navigate(loginPath, { replace: true });
      }
    };

    checkAuth();
  }, [getSession, navigate, location]);

  if (isLoading) {
    return <LoadingState />;
  }

  return <Outlet />;
};