import type { ChartDatum } from '../lib/dashboard';
import { formatCompactCurrency } from '../lib/format';

interface StackedBarChartProps {
  data: ChartDatum[];
}

export function StackedBarChart({ data }: StackedBarChartProps) {
  const totals = data.map((item) => item.segments.reduce((sum, segment) => sum + segment.value, 0));
  const maxValue = Math.max(...totals, 1);
  const tickValues = [1, 0.75, 0.5, 0.25, 0].map((factor) => Math.round(maxValue * factor));
  const legend = data[0]?.segments ?? [];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-500">
        {legend.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
            <span>{segment.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-3">
        <div className="flex h-[292px] w-14 flex-col justify-between pb-7 text-right text-[11px] font-medium text-slate-400">
          {tickValues.map((tick) => (
            <div key={tick}>{formatCompactCurrency(tick)}</div>
          ))}
        </div>

        <div className="relative flex-1">
          <div className="absolute inset-0 pb-7">
            {[0, 25, 50, 75, 100].map((offset) => (
              <div key={offset} className="absolute left-0 right-0 border-t border-dashed border-slate-200" style={{ bottom: `${offset}%` }} />
            ))}
          </div>

          <div className="relative flex h-[292px] items-end justify-between gap-2 pb-7">
            {data.map((item) => (
              <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full max-w-[48px] flex-col justify-end gap-[2px] overflow-hidden rounded-[16px] bg-slate-50 p-1">
                  {item.segments.map((segment) => {
                    const height = segment.value === 0 ? 0 : Math.max((segment.value / maxValue) * 100, 2.5);
                    if (height === 0) {
                      return null;
                    }

                    return (
                      <div
                        key={segment.label}
                        className="w-full rounded-[8px]"
                        style={{ backgroundColor: segment.color, height: `${height}%` }}
                        title={`${segment.label}: ${formatCompactCurrency(segment.value)}`}
                      />
                    );
                  })}
                </div>
                <div className="text-[13px] font-medium text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
