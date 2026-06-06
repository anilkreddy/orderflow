import type { PropsWithChildren } from 'react';

interface AdminPanelProps extends PropsWithChildren {
  className?: string;
}

export function AdminPanel({ children, className = '' }: AdminPanelProps) {
  return <section className={`backoffice-surface ${className}`}>{children}</section>;
}
