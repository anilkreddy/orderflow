interface LoadingPanelProps {
  message?: string;
}

export function LoadingPanel({ message = 'Loading data...' }: LoadingPanelProps) {
  return (
    <div className="market-panel rounded-[30px] px-8 py-14 text-center">
      <div className="mx-auto mb-4 h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-[#0f63ff]" />
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}
