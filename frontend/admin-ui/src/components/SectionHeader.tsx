import type { ReactNode } from 'react';

interface SectionHeaderProps {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function SectionHeader({ action, description, eyebrow, title }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-4xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</p>
        <h1 className="mt-2 font-display text-[1.95rem] font-bold tracking-tight text-slate-950 md:text-[2.2rem]">{title}</h1>
        <p className="mt-2.5 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
