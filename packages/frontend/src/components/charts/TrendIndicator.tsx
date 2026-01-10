interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
  value?: number;
  unit?: string;
  showValue?: boolean;
}

export function TrendIndicator({
  trend,
  value,
  unit = '',
  showValue = true,
}: TrendIndicatorProps) {
  const config = {
    up: {
      icon: '\u2197',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      prefix: '+',
    },
    down: {
      icon: '\u2198',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      prefix: '',
    },
    stable: {
      icon: '\u2192',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      prefix: '\u00B1',
    },
  };

  const { icon, color, bgColor, prefix } = config[trend];

  function formatValue(val: number): string {
    const absVal = Math.abs(val);
    if (absVal < 1) return val.toFixed(2);
    if (absVal < 10) return val.toFixed(1);
    return Math.round(val).toString();
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm ${bgColor} ${color}`}
    >
      <span>{icon}</span>
      {showValue && value !== undefined && (
        <span>
          {prefix}
          {formatValue(value)}
          {unit && <span className="ml-0.5">{unit}</span>}
        </span>
      )}
    </span>
  );
}
