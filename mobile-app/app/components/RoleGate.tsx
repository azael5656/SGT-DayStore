import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../utils/storage';

interface Props {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Renderiza children solo si el rol del usuario actual esta en la lista
 * permitida. Util para botones o secciones segregadas por rol.
 */
export default function RoleGate({ roles, children, fallback = null }: Props) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
