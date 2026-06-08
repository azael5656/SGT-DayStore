import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

/** Superficie base tokenizada: tarjetas, paneles y modales. */
export default function Card({ children, className = '' }: Props) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  );
}
