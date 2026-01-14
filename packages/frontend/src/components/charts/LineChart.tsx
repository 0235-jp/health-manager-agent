import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatShortDate, formatDate } from '../../lib/date-utils';

export interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface LineChartProps {
  data: ChartDataPoint[];
  lines: Array<{
    dataKey: string;
    color: string;
    name?: string;
  }>;
  xAxisKey?: string;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  timezone?: string;
}

export function LineChart({
  data,
  lines,
  xAxisKey = 'date',
  height = 300,
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  timezone = 'Asia/Tokyo',
}: LineChartProps) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const formatDateTick = (dateStr: string) => {
    return formatShortDate(dateStr, timezone);
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
        <XAxis
          dataKey={xAxisKey}
          tickFormatter={formatDateTick}
          stroke="#6b7280"
          fontSize={12}
        />
        <YAxis stroke="#6b7280" fontSize={12} />
        {showTooltip && (
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
            }}
            labelFormatter={(label) => formatDate(String(label), timezone)}
          />
        )}
        {showLegend && <Legend />}
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            name={line.name ?? line.dataKey}
            strokeWidth={2}
            dot={{ fill: line.color, strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
