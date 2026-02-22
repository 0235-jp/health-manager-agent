import type { ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useTimezone } from '../contexts/SettingsContext';
import { getDatetimeRangeDaysAgo, dateTimeLocalToISO } from '../lib/date-utils';
import { LineChart, type ChartDataPoint } from '../components/charts/LineChart';
import { ReportCard } from '../components/ReportCard';
import { TrendIndicator } from '../components/charts/TrendIndicator';
import type { TrendResult } from '../types';

interface SummaryCardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: TrendResult;
  isLoading?: boolean;
}

function SummaryCard({ title, value, unit, trend, isLoading }: SummaryCardProps): ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      {isLoading ? (
        <div className="mt-2 h-9 w-24 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className="mt-2 text-3xl font-bold text-gray-900">
          {value}
          {unit && <span className="ml-1 text-lg font-normal text-gray-500">{unit}</span>}
        </p>
      )}
      <div className="mt-2">
        {trend ? (
          <TrendIndicator
            trend={trend.trend}
            value={Math.abs(trend.change_percent)}
            unit="%"
          />
        ) : (
          <span className="text-sm text-gray-400">データなし</span>
        )}
      </div>
    </div>
  );
}

const DATA_TYPES = ['body_weight', 'sleep_duration', 'steps'];
const DATA_TYPE_LABELS: Record<string, { label: string; unit: string; color: string }> = {
  body_weight: { label: '体重', unit: 'kg', color: '#3b82f6' },
  sleep_duration: { label: '睡眠時間', unit: 'h', color: '#10b981' },
  steps: { label: '歩数', unit: '', color: '#f59e0b' },
};

function formatValue(value: number, dataType: string): string {
  if (dataType === 'steps') {
    return Math.round(value).toLocaleString();
  }
  return value.toFixed(1);
}

export function Dashboard(): ReactElement {
  const timezone = useTimezone();

  const { data: latestData, isLoading: isLoadingLatest } = useQuery({
    queryKey: ['health-data', 'latest', DATA_TYPES],
    queryFn: () => api.healthData.getLatest(DATA_TYPES),
  });

  const { data: trendData, isLoading: isLoadingTrend } = useQuery({
    queryKey: ['health-data', 'trend', DATA_TYPES],
    queryFn: () => api.healthData.getTrend(DATA_TYPES, 7),
  });

  const { data: rangeData } = useQuery({
    queryKey: ['health-data', 'range', DATA_TYPES, timezone],
    queryFn: async () => {
      const { start, end } = getDatetimeRangeDaysAgo(7, timezone);

      const response = await api.healthData.list({
        start_date: dateTimeLocalToISO(start, timezone),
        end_date: dateTimeLocalToISO(end, timezone),
        limit: 1000,
      });

      return response.data;
    },
    enabled: !!timezone,
  });

  const { data: latestReport } = useQuery({
    queryKey: ['reports', 'latest'],
    queryFn: () => api.reports.getLatest(),
    retry: false,
  });

  const trendMap = new Map(trendData?.map((t) => [t.data_type, t]) ?? []);

  function getLatestValue(dataType: string): string {
    const record = latestData?.[dataType];
    if (!record) return '--';
    return formatValue(record.value, dataType);
  }

  function prepareChartData(): ChartDataPoint[] {
    if (!rangeData) return [];

    interface DayRecord {
      values: Record<string, number>;
      timestamps: Record<string, string>;
    }

    const dateMap = new Map<string, DayRecord>();

    for (const record of rangeData) {
      const date = record.recorded_at.split('T')[0];
      if (!dateMap.has(date)) {
        dateMap.set(date, { values: {}, timestamps: {} });
      }
      const dayRecord = dateMap.get(date)!;
      const existingTime = dayRecord.timestamps[record.data_type];

      if (!existingTime || record.recorded_at > existingTime) {
        dayRecord.values[record.data_type] = record.value;
        dayRecord.timestamps[record.data_type] = record.recorded_at;
      }
    }

    const sortedDates = Array.from(dateMap.keys()).sort();

    return sortedDates.map((date) => {
      const { values } = dateMap.get(date)!;
      return {
        date,
        body_weight: values.body_weight ?? 0,
        sleep_duration: values.sleep_duration ?? 0,
        steps: values.steps ?? 0,
      };
    });
  }

  const chartData = prepareChartData();
  const isLoading = isLoadingLatest || isLoadingTrend;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {DATA_TYPES.map((dataType) => {
          const config = DATA_TYPE_LABELS[dataType];
          return (
            <SummaryCard
              key={dataType}
              title={config.label}
              value={getLatestValue(dataType)}
              unit={config.unit}
              trend={trendMap.get(dataType)}
              isLoading={isLoading}
            />
          );
        })}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-800">7日間の推移</h3>
        {chartData.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {DATA_TYPES.map((dataType) => {
              const config = DATA_TYPE_LABELS[dataType];
              const hasData = chartData.some((d) => (d[dataType] as number) > 0);
              if (!hasData) {
                return (
                  <div
                    key={dataType}
                    className="flex h-48 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50"
                  >
                    <span className="text-gray-400">
                      {config.label}のデータなし
                    </span>
                  </div>
                );
              }
              return (
                <div key={dataType}>
                  <h4 className="mb-2 text-sm font-medium text-gray-600">
                    {config.label}
                  </h4>
                  <LineChart
                    data={chartData}
                    lines={[{ dataKey: dataType, color: config.color, name: config.label }]}
                    height={180}
                    showGrid={false}
                    timezone={timezone}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50">
            <span className="text-gray-400">
              データがありません。データ管理からデータを追加してください。
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-800">最新レポート</h3>
          <Link to="/reports" className="text-sm text-blue-600 hover:text-blue-800">
            すべて見る →
          </Link>
        </div>
        {latestReport ? (
          <ReportCard report={latestReport} />
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="py-8 text-center text-gray-500">
              <p>レポートはまだありません</p>
              <Link to="/reports" className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-800">
                レポートを生成する →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
