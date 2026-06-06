import type { ReactNode } from 'react';

interface SectionHeaderProps {
  action?: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}

export function SectionHeader({ action, description, eyebrow, title }: SectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-500">{eyebrow}</p>
        <h1 className="mt-2.5 text-[2rem] font-extrabold tracking-tight text-slate-950 md:text-[2.35rem]">{title}</h1>
        <p className="mt-2.5 text-sm leading-6 text-slate-600 md:text-[15px]">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
