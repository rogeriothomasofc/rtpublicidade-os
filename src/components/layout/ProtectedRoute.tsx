import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useIsClientRole } from '@/hooks/useClientPortal';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  allowClient?: boolean;
}

export function ProtectedRoute({ children, allowClient }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { data: isClient, isLoading: loadingRole } = useIsClientRole();

  if (loading || loadingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user is a client and the route doesn't allow clients, redirect to portal
  if (isClient && !allowClient) {
    return <Navigate to="/portal" replace />;
  }

  // Allow non-client (admin) users to access portal routes too (e.g. to preview a client's portal)

  return <>{children}</>;
}
