import { ProgressRing } from './ProgressRing';

interface AdminMetricProps {
  caption: string;
  progress: number;
  progressColor: string;
  progressTrackColor: string;
  title: string;
  trend: string;
  trendTone: 'danger' | 'success';
  value: string | number;
}

export function AdminMetric({
  caption,
  progress,
  progressColor,
  progressTrackColor,
  title,
  trend,
  trendTone,
  value,
}: AdminMetricProps) {
  return (
    <div className="dashboard-card flex flex-col gap-3 rounded-[22px] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-[13px] font-medium text-slate-500">{title}</p>
        <p className="mt-3 text-[2rem] font-extrabold tracking-tight text-slate-950">{value}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          <span className={trendTone === 'success' ? 'font-semibold text-emerald-600' : 'font-semibold text-rose-600'}>
            {trendTone === 'success' ? '↗' : '↘'} {trend}
          </span>
          <span className="text-slate-500">{caption}</span>
        </div>
      </div>

      <ProgressRing color={progressColor} trackColor={progressTrackColor} value={progress}>
        <div className="text-center">
          <div className="text-[1.7rem] font-bold text-slate-900">{Math.round(progress)}%</div>
        </div>
      </ProgressRing>
    </div>
  );
}
