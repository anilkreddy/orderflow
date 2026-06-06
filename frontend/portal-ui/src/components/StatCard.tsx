interface StatCardProps {
  label: string;
  value: string | number;
  hint: string;
  accent?: 'teal' | 'amber' | 'slate' | 'rose';
}

const accents = {
  teal: 'bg-teal-50 text-teal-700 border-teal-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
};

export function StatCard({ label, value, hint, accent = 'slate' }: StatCardProps) {
  return (
    <div className={`rounded-[22px] border p-5 ${accents[accent]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] opacity-80">{label}</p>
      <p className="mt-4 font-display text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm opacity-80">{hint}</p>
    </div>
  );
}
