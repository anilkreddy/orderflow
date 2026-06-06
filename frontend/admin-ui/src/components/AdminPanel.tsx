import type { PropsWithChildren } from 'react';

interface AdminPanelProps extends PropsWithChildren {
  className?: string;
}

export function AdminPanel({ children, className = '' }: AdminPanelProps) {
  return <section className={`dashboard-card rounded-[22px] p-4 ${className}`}>{children}</section>;
}
