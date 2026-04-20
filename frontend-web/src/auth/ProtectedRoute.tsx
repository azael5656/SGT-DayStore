import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '../types';
import { useAuth } from './AuthContext';

interface Props {
  children: ReactNode;
  roles?: Role[];
}

export default function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) {
    return (
      <div className="p-8">
        <h2 className="text-xl font-bold text-red-600">Acceso denegado</h2>
        <p className="text-gray-600 mt-2">
          Tu rol ({user.role}) no tiene permisos para esta seccion.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
