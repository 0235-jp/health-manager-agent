import { useState, type ReactElement } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Markdown } from '../components/Markdown';
import { TrendIndicator } from '../components/charts/TrendIndicator';
import { useTimezone } from '../contexts/SettingsContext';
import { formatDateTime, formatPeriod as formatPeriodUtil } from '../lib/date-utils';
import type { Report } from '../types';

type ReportFilter = 'all' | 'daily' | 'on_fetch';

function ReportTypeBadge({ type }: { type: 'on_fetch' | 'daily' }): ReactElement {
  const config = {
    daily: { label: '日次', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    on_fetch: { label: '定期', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  };
  const { label, bgColor, textColor } = config[type];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}

interface ReportCardProps {
  report: Report;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function ReportCard({ report, onDelete, isDeleting }: ReportCardProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const timezone = useTimezone();
  const { content } = report;

  const metricEntries = Object.entries(content.metrics);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ReportTypeBadge type={report.report_type} />
              <span className="text-sm text-gray-500">
                {formatPeriodUtil(report.period_start, report.period_end, timezone)}
              </span>
            </div>
            <Markdown className="mt-2 text-gray-700">{content.summary}</Markdown>
          </div>
          <button
            onClick={() => onDelete(report.id)}
            disabled={isDeleting}
            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {metricEntries.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {metricEntries.map(([key, metric]) => (
              <div key={key} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">{key}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {metric.value}
                  <span className="ml-1 text-sm font-normal text-gray-500">{metric.unit}</span>
                </p>
                <TrendIndicator trend={metric.trend} showValue={false} />
              </div>
            ))}
          </div>
        )}

        {(content.risks.length > 0 || content.recommendations.length > 0) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? '詳細を閉じる' : '詳細を表示'}
          </button>
        )}

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {content.risks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-700">リスク・注意点</h4>
                <ul className="mt-2 space-y-1">
                  {content.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-red-500">!</span>
                      <Markdown>{risk}</Markdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-700">推奨事項</h4>
                <ul className="mt-2 space-y-1">
                  {content.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span>
                      <Markdown>{rec}</Markdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          作成日時: {formatDateTime(report.created_at, timezone)}
        </p>
      </div>
    </div>
  );
}

export function Reports(): ReactElement {
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['reports', filter],
    queryFn: () =>
      api.reports.list({
        report_type: filter === 'all' ? undefined : filter,
        limit: 50,
      }),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.reports.generate({ report_type: 'daily' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setIsGenerating(false);
    },
    onError: () => {
      setIsGenerating(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.reports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const handleGenerate = (): void => {
    setIsGenerating(true);
    generateMutation.mutate();
  };

  const handleDelete = (id: number): void => {
    if (confirm('このレポートを削除しますか？')) {
      deleteMutation.mutate(id);
    }
  };

  const filters: { value: ReportFilter; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'daily', label: '日次' },
    { value: 'on_fetch', label: '定期' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">レポート</h2>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || generateMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isGenerating || generateMutation.isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              生成中...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              日次レポートを生成
            </>
          )}
        </button>
      </div>

      <div className="flex gap-2">
        {filters.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {generateMutation.isError && (
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          レポートの生成に失敗しました。しばらくしてから再試行してください。
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-6">
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-3/4 rounded bg-gray-200" />
              <div className="mt-4 grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-16 rounded bg-gray-100" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-700">
          レポートの読み込みに失敗しました
        </div>
      ) : data?.data.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <p>レポートがありません</p>
          <p className="mt-2 text-sm">「日次レポートを生成」ボタンをクリックしてレポートを作成してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          {data?.data.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDelete={handleDelete}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
