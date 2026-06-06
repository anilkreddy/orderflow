import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="market-panel rounded-[30px] px-8 py-12 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-slate-500">No results</p>
      <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
