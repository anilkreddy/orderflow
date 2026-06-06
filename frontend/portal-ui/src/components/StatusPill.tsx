interface StatusPillProps {
  status: string;
}

const statusStyles: Record<string, string> = {
  CONFIRMED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CREATED: 'border-amber-200 bg-amber-50 text-amber-700',
  FAILED: 'border-rose-200 bg-rose-50 text-rose-700',
  CANCELLED: 'border-slate-300 bg-slate-100 text-slate-600',
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${statusStyles[status] ?? 'border-slate-200 bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}
