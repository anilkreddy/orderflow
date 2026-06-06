import type { PropsWithChildren } from 'react';

interface PanelProps extends PropsWithChildren {
  className?: string;
}

export function Panel({ children, className = '' }: PanelProps) {
  return <section className={`rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}
