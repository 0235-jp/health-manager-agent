import { useState, type ReactElement } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { ReportCard } from '../components/ReportCard';
import { useTimezone } from '../contexts/SettingsContext';
import { useHeaderActions } from '../hooks/useHeaderActions';
import { getTodayDatetimeRange } from '../lib/date-utils';

type ReportFilter = 'all' | 'daily' | 'on_fetch' | 'manual';

export function Reports(): ReactElement {
  const [filter, setFilter] = useState<ReportFilter>('all');
  const [isGenerateFormOpen, setIsGenerateFormOpen] = useState(false);
  const timezone = useTimezone();
  const [startDatetime, setStartDatetime] = useState(() => getTodayDatetimeRange(timezone).start);
  const [endDatetime, setEndDatetime] = useState(() => getTodayDatetimeRange(timezone).end);
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
    mutationFn: () =>
      api.reports.generate({
        report_type: 'manual',
        start_datetime: startDatetime,
        end_datetime: endDatetime,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      setIsGenerateFormOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.reports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const handleDelete = (id: number): void => {
    if (confirm('このレポートを削除しますか？')) {
      deleteMutation.mutate(id);
    }
  };

  const filters: { value: ReportFilter; label: string }[] = [
    { value: 'all', label: 'すべて' },
    { value: 'daily', label: '日次' },
    { value: 'on_fetch', label: '定期' },
    { value: 'manual', label: '手動' },
  ];

  function handleToggleForm(): void {
    setIsGenerateFormOpen((prev) => !prev);
  }

  useHeaderActions([{
    label: 'レポートを生成',
    onClick: handleToggleForm,
    variant: 'primary',
  }], []);

  return (
    <div className="space-y-6">
      {/* 生成フォーム */}
      {isGenerateFormOpen && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日時
                </label>
                <input
                  type="datetime-local"
                  value={startDatetime}
                  onChange={(e) => setStartDatetime(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={generateMutation.isPending}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日時
                </label>
                <input
                  type="datetime-local"
                  value={endDatetime}
                  min={startDatetime}
                  onChange={(e) => setEndDatetime(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={generateMutation.isPending}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {generateMutation.isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    生成中...
                  </>
                ) : (
                  '生成'
                )}
              </button>
              <button
                onClick={() => setIsGenerateFormOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={generateMutation.isPending}
              >
                キャンセル
              </button>
            </div>

            {generateMutation.isError && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                レポートの生成に失敗しました: {(generateMutation.error as Error).message}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
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
          <p className="mt-2 text-sm">「レポートを生成」ボタンをクリックしてレポートを作成してください</p>
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
