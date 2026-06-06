import type { PropsWithChildren } from 'react';

interface StatusPillProps extends PropsWithChildren {
  tone?: 'danger' | 'info' | 'muted' | 'success' | 'warning';
}

const toneClasses: Record<NonNullable<StatusPillProps['tone']>, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  info: 'bg-blue-50 text-blue-700 ring-blue-200',
  muted: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function StatusPill({ children, tone = 'muted' }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${toneClasses[tone]}`}>
      {children}
    </span>
  );
}
