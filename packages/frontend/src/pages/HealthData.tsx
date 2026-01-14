import type { ReactElement } from 'react';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/date-utils';
import { useTimezone } from '../contexts/SettingsContext';
import { useHeaderActions } from '../hooks/useHeaderActions';
import type { HealthData as HealthDataType, PaginatedResponse, Plugin, DataType } from '../types';
import { DataForm } from '../components/data/DataForm';

const PAGE_SIZE = 20;

interface DataTableContentProps {
  isLoading: boolean;
  error: Error | null;
  data: PaginatedResponse<HealthDataType> | undefined;
  onEdit: (item: HealthDataType) => void;
  onDelete: (item: HealthDataType) => void;
}

function DataTableContent({
  isLoading,
  error,
  data,
  onEdit,
  onDelete,
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
              <td className="px-6 py-4 text-sm text-gray-900">{item.data_type}</td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {item.value} {item.unit}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">{item.source}</td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDateTime(item.recorded_at, timezone)}
              </td>
              <td className="px-6 py-4 text-right">
                {item.source === 'manual' && (
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
                )}
                {item.source !== 'manual' && (
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
                  <span className="text-sm font-medium text-gray-900">{item.data_type}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                    {item.source}
                  </span>
                </div>
                <p className="mt-1 text-lg font-semibold text-gray-900">
                  {item.value} {item.unit && <span className="text-sm font-normal text-gray-500">{item.unit}</span>}
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

export function HealthData(): ReactElement {
  const [page, setPage] = useState(0);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<HealthDataType | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HealthDataType | null>(null);

  // フィルター用state
  const [filterDataType, setFilterDataType] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['health-data', page, filterDataType, filterSource, filterStartDate, filterEndDate],
    queryFn: () => api.healthData.list({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      data_type: filterDataType || undefined,
      source: filterSource || undefined,
      start_date: filterStartDate || undefined,
      end_date: filterEndDate || undefined,
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
    label: dt.display_name,
  }));

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
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => updateFilterAndResetPage(setFilterStartDate, e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => updateFilterAndResetPage(setFilterEndDate, e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
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
