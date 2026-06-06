import type { PropsWithChildren } from 'react';

interface ProgressRingProps extends PropsWithChildren {
  color: string;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  value: number;
}

export function ProgressRing({
  children,
  color,
  size = 104,
  strokeWidth = 10,
  trackColor,
  value,
}: ProgressRingProps) {
  const normalizedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (normalizedValue / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ height: size, width: size }}>
      <svg className="-rotate-90" height={size} width={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
