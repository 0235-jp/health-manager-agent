import type { ReactElement } from 'react';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDateTime, getDatetimeRangeDaysAgo } from '../lib/date-utils';
import { DateTimePicker } from '../components/ui/DateTimePicker';
import { formatUnit } from '../lib/unit-utils';
import { useTimezone } from '../contexts/SettingsContext';
import { useHeaderActions } from '../hooks/useHeaderActions';
import type { HealthData as HealthDataType, PaginatedResponse, Plugin, DataType } from '../types';
import { DataForm } from '../components/data/DataForm';
import { LineChart, type ChartDataPoint } from '../components/charts/LineChart';

type TabType = 'list' | 'chart';

const PAGE_SIZE = 20;

interface DataTableContentProps {
  isLoading: boolean;
  error: Error | null;
  data: PaginatedResponse<HealthDataType> | undefined;
  onEdit: (item: HealthDataType) => void;
  onDelete: (item: HealthDataType) => void;
  formatDataType: (name: string) => string;
}

function DataTableContent({
  isLoading,
  error,
  data,
  onEdit,
  onDelete,
  formatDataType,
}: DataTableContentProps): ReactElement {
  const timezone = useTimezone();

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        エラーが発生しました: {error.message}
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return <div className="p-8 text-center text-gray-500">データがありません</div>;
  }

  return (
    <>
      {/* Desktop: Table */}
      <table className="hidden md:table w-full">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
              タイプ
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
              値
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
              ソース
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
              記録日時
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{formatDataType(item.data_type)}</td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {item.value} {formatUnit(item.unit, item.data_type)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.source}</td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDateTime(item.recorded_at, timezone)}
              </td>
              <td className="px-6 py-4 text-right">
                {item.source === 'manual' ? (
                  <>
                    <button
                      onClick={() => onEdit(item)}
                      className="mr-3 text-sm text-blue-600 hover:text-blue-800"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      削除
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile: Card List */}
      <div className="md:hidden divide-y divide-gray-200">
        {data.data.map((item) => (
          <div key={item.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{formatDataType(item.data_type)}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {item.source}
                  </span>
                </div>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {item.value} {item.unit && <span className="text-sm font-normal text-gray-500">{formatUnit(item.unit, item.data_type)}</span>}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {formatDateTime(item.recorded_at, timezone)}
                </p>
              </div>
              {item.source === 'manual' && (
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-blue-600 hover:bg-blue-50"
                    aria-label="編集"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    aria-label="削除"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

interface PaginationProps {
  page: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

function Pagination({ page, total, onPrevious, onNext }: PaginationProps): ReactElement | null {
  if (total <= PAGE_SIZE) {
    return null;
  }

  const startItem = page * PAGE_SIZE + 1;
  const endItem = Math.min((page + 1) * PAGE_SIZE, total);
  const hasNextPage = (page + 1) * PAGE_SIZE < total;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-4 md:px-6 py-3">
      <span className="text-sm text-gray-500">
        全 {total} 件中 {startItem} - {endItem} 件表示
      </span>
      <div className="flex gap-2">
        <button
          onClick={onPrevious}
          disabled={page === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-gray-100"
        >
          前へ
        </button>
        <button
          onClick={onNext}
          disabled={!hasNextPage}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50 hover:bg-gray-100"
        >
          次へ
        </button>
      </div>
    </div>
  );
}

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps): ReactElement | null {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold mb-2">削除の確認</h3>
        <p className="text-gray-600 mb-4">このデータを削除してもよろしいですか？</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
            disabled={isDeleting}
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            disabled={isDeleting}
          >
            {isDeleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ChartContentProps {
  dataTypeOptions: Array<{ value: string; label: string }>;
  chartDataType: string;
  setChartDataType: (value: string) => void;
  chartStartDate: string;
  setChartStartDate: (value: string) => void;
  chartEndDate: string;
  setChartEndDate: (value: string) => void;
  chartData: ChartDataPoint[];
  isLoading: boolean;
  dataTypeName: string;
  timezone: string;
}

function ChartContent({
  dataTypeOptions,
  chartDataType,
  setChartDataType,
  chartStartDate,
  setChartStartDate,
  chartEndDate,
  setChartEndDate,
  chartData,
  isLoading,
  dataTypeName,
  timezone,
}: ChartContentProps): ReactElement {
  function renderChartArea(): ReactElement {
    if (!chartDataType) {
      return (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          データタイプを選択してください
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          読み込み中...
        </div>
      );
    }

    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-gray-500">
          データがありません
        </div>
      );
    }

    return (
      <LineChart
        data={chartData}
        lines={[
          {
            dataKey: 'value',
            color: '#3b82f6',
            name: dataTypeName,
          },
        ]}
        height={300}
        showLegend={true}
        timezone={timezone}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              データタイプ
            </label>
            <select
              value={chartDataType}
              onChange={(e) => setChartDataType(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">選択してください</option>
              {dataTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <DateTimePicker
            value={chartStartDate}
            onChange={setChartStartDate}
            timezone={timezone}
            label="開始日時"
          />
          <DateTimePicker
            value={chartEndDate}
            onChange={setChartEndDate}
            timezone={timezone}
            label="終了日時"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {renderChartArea()}
      </div>
    </div>
  );
}

export function HealthData(): ReactElement {
  const timezone = useTimezone();

  // タブ状態
  const [activeTab, setActiveTab] = useState<TabType>('list');

  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<HealthDataType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HealthDataType | null>(null);

  // フィルター用state（一覧タブ）
  const [filterDataType, setFilterDataType] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // グラフ用state
  const [chartDataType, setChartDataType] = useState('');
  const [chartStartDate, setChartStartDate] = useState('');
  const [chartEndDate, setChartEndDate] = useState('');
  const [chartDatesInitialized, setChartDatesInitialized] = useState(false);

  // タイムゾーンが取得できたらグラフの日付範囲を初期化
  useEffect(() => {
    if (timezone && !chartDatesInitialized) {
      const { start, end } = getDatetimeRangeDaysAgo(30, timezone);
      setChartStartDate(start);
      setChartEndDate(end);
      setChartDatesInitialized(true);
    }
  }, [timezone, chartDatesInitialized]);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['health-data', page, filterDataType, filterSource, filterStartDate, filterEndDate],
    queryFn: () => api.healthData.list({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      data_type: filterDataType || undefined,
      source: filterSource || undefined,
      start_date: filterStartDate ? new Date(filterStartDate).toISOString() : undefined,
      end_date: filterEndDate ? new Date(filterEndDate).toISOString() : undefined,
    }),
  });

  // データソースプラグイン一覧を取得
  const { data: plugins } = useQuery({
    queryKey: ['plugins', 'data-source'],
    queryFn: () => api.plugins.list('data-source'),
  });

  // データタイプ一覧を取得
  const { data: dataTypesResponse } = useQuery({
    queryKey: ['data-types'],
    queryFn: () => api.dataTypes.list(),
  });

  // データタイプ名からdisplayNameを取得するマップ
  const dataTypeDisplayMap = new Map<string, string>(
    (dataTypesResponse?.data || []).map((dt: DataType) => [dt.name, dt.display_name])
  );

  // データタイプを「displayName (name)」形式でフォーマット
  function formatDataType(name: string): string {
    const displayName = dataTypeDisplayMap.get(name);
    return displayName ? `${displayName} (${name})` : name;
  }

  // ソース選択肢を構築（manual + data-sourceプラグイン）
  const sourceOptions = [
    { value: 'manual', label: '手動入力' },
    ...(plugins || []).map((p: Plugin) => ({
      value: p.name,
      label: p.displayName,
    })),
  ];

  // データタイプ選択肢
  const dataTypeOptions = (dataTypesResponse?.data || []).map((dt: DataType) => ({
    value: dt.name,
    label: `${dt.display_name} (${dt.name})`,
  }));

  // グラフ用データ取得
  const { data: chartRawData, isLoading: isChartLoading } = useQuery({
    queryKey: ['health-data-chart', chartDataType, chartStartDate, chartEndDate],
    queryFn: () => api.healthData.list({
      data_type: chartDataType,
      start_date: chartStartDate ? new Date(chartStartDate).toISOString() : undefined,
      end_date: chartEndDate ? new Date(chartEndDate).toISOString() : undefined,
    }),
    enabled: activeTab === 'chart' && !!chartDataType,
  });

  // グラフ用データ変換
  const chartData = useMemo((): ChartDataPoint[] => {
    if (!chartRawData?.data) return [];

    // 日付ごとに最新の値を取得
    const dateMap = new Map<string, { value: number; timestamp: string }>();
    for (const record of chartRawData.data) {
      const date = record.recorded_at.split('T')[0];
      const existing = dateMap.get(date);
      if (!existing || record.recorded_at > existing.timestamp) {
        dateMap.set(date, { value: record.value, timestamp: record.recorded_at });
      }
    }

    // 日付順にソートしてChartDataPoint[]に変換
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { value }]) => ({ date, value }));
  }, [chartRawData]);

  // 選択中のデータタイプの表示名
  const chartDataTypeName = dataTypeDisplayMap.get(chartDataType) || chartDataType;

  // フィルター変更時にページをリセット
  function updateFilterAndResetPage(setter: (value: string) => void, value: string): void {
    setter(value);
    setPage(0);
  }

  // フィルターリセット
  function resetFilters(): void {
    setFilterDataType('');
    setFilterSource('');
    setFilterStartDate('');
    setFilterEndDate('');
    setPage(0);
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.healthData.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      setDeleteTarget(null);
    },
  });

  function handleEdit(item: HealthDataType): void {
    setEditData(item);
    setIsFormOpen(true);
  }

  function handleDelete(item: HealthDataType): void {
    setDeleteTarget(item);
  }

  function handleFormSuccess(): void {
    queryClient.invalidateQueries({ queryKey: ['health-data'] });
  }

  function confirmDelete(): void {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  }

  function handleAdd(): void {
    setEditData(null);
    setIsFormOpen(true);
  }

  useHeaderActions([{
    label: '+ データを追加',
    onClick: handleAdd,
    variant: 'primary',
  }], []);

  return (
    <div className="space-y-6">
      {/* タブ切り替え */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          一覧
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'chart'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          グラフ
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-4">
              <select
                value={filterDataType}
                onChange={(e) => updateFilterAndResetPage(setFilterDataType, e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">すべてのタイプ</option>
                {dataTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={filterSource}
                onChange={(e) => updateFilterAndResetPage(setFilterSource, e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">すべてのソース</option>
                {sourceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <DateTimePicker
                value={filterStartDate}
                onChange={(v) => updateFilterAndResetPage(setFilterStartDate, v)}
                timezone={timezone}
                label="開始日時"
              />
              <DateTimePicker
                value={filterEndDate}
                onChange={(v) => updateFilterAndResetPage(setFilterEndDate, v)}
                timezone={timezone}
                label="終了日時"
              />
              <button
                onClick={resetFilters}
                className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
              >
                リセット
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <DataTableContent
              isLoading={isLoading}
              error={error}
              data={data}
              onEdit={handleEdit}
              onDelete={handleDelete}
              formatDataType={formatDataType}
            />
            {data && (
              <Pagination
                page={page}
                total={data.pagination.total}
                onPrevious={() => setPage((p) => Math.max(0, p - 1))}
                onNext={() => setPage((p) => p + 1)}
              />
            )}
          </div>
        </>
      ) : (
        <ChartContent
          dataTypeOptions={dataTypeOptions}
          chartDataType={chartDataType}
          setChartDataType={setChartDataType}
          chartStartDate={chartStartDate}
          setChartStartDate={setChartStartDate}
          chartEndDate={chartEndDate}
          setChartEndDate={setChartEndDate}
          chartData={chartData}
          isLoading={isChartLoading}
          dataTypeName={chartDataTypeName}
          timezone={timezone}
        />
      )}

      <DataForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        editData={editData}
        onSuccess={handleFormSuccess}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
