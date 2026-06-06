interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function QuantitySelector({ value, min = 1, max = 99, onChange }: QuantitySelectorProps) {
  const decrementDisabled = value <= min;
  const incrementDisabled = value >= max;

  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-2 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
      <button
        type="button"
        disabled={decrementDisabled}
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        -
      </button>
      <span className="min-w-12 text-center text-sm font-semibold text-slate-900">{value}</span>
      <button
        type="button"
        disabled={incrementDisabled}
        className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        +
      </button>
    </div>
  );
}
