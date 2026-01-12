import type { ReactElement, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, schedulerApi } from '../lib/api';
import { formatDateForInput, getDateDaysAgo } from '../lib/date-utils';
import type { CustomInstruction } from '../types';

interface SettingsFormData {
  collection_interval: number;
}

const DEFAULT_FORM_DATA: SettingsFormData = {
  collection_interval: 3600,
};

const INTERVAL_OPTIONS = [
  { value: 1800, label: '30分' },
  { value: 3600, label: '1時間' },
  { value: 7200, label: '2時間' },
  { value: 14400, label: '4時間' },
  { value: 86400, label: '24時間' },
];

interface InstructionFormProps {
  onSubmit: (instruction: string, priority: number) => void;
  onCancel: () => void;
  initialInstruction?: string;
  initialPriority?: number;
  isLoading?: boolean;
}

function InstructionForm({
  onSubmit,
  onCancel,
  initialInstruction = '',
  initialPriority = 0,
  isLoading,
}: InstructionFormProps): ReactElement {
  const [instruction, setInstruction] = useState(initialInstruction);
  const [priority, setPriority] = useState(initialPriority);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (instruction.trim()) {
      onSubmit(instruction.trim(), priority);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-gray-50 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          指示内容
        </label>
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="例: 体重が70kgを超えないように注意してください"
          rows={2}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          優先度 (0-100)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={priority}
          onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
          className="w-24 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          disabled={isLoading || !instruction.trim()}
        >
          {isLoading ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
          disabled={isLoading}
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

interface InstructionItemProps {
  instruction: CustomInstruction;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isToggling?: boolean;
}

function InstructionItem({
  instruction,
  onToggle,
  onEdit,
  onDelete,
  isToggling,
}: InstructionItemProps): ReactElement {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg bg-white">
      <input
        type="checkbox"
        checked={instruction.is_active === 1}
        onChange={onToggle}
        disabled={isToggling}
        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm ${instruction.is_active === 1 ? 'text-gray-900' : 'text-gray-500 line-through'}`}
        >
          {instruction.instruction}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          優先度: {instruction.priority}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onEdit}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          編集
        </button>
        <button
          onClick={onDelete}
          className="text-sm text-red-600 hover:text-red-800"
        >
          削除
        </button>
      </div>
    </div>
  );
}

function DataBackfillSection(): ReactElement {
  const [startDate, setStartDate] = useState(() => formatDateForInput(getDateDaysAgo(7)));
  const [endDate, setEndDate] = useState(() => formatDateForInput(new Date()));

  const { data: status, isLoading: isLoadingStatus } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: schedulerApi.getStatus,
  });

  const fetchMutation = useMutation({
    mutationFn: schedulerApi.runBackfill,
  });

  function handleFetch(e: FormEvent) {
    e.preventDefault();
    if (startDate && endDate) {
      fetchMutation.mutate({ startDate, endDate });
    }
  }

  return (
    <div className="space-y-4">
      {/* プラグイン状態 */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">プラグイン収集状態</h4>
        {isLoadingStatus ? (
          <p className="text-sm text-gray-500">読み込み中...</p>
        ) : status?.plugins && status.plugins.length > 0 ? (
          <div className="space-y-2">
            {status.plugins.map((plugin) => (
              <div
                key={plugin.pluginName}
                className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
              >
                <span className="font-medium">{plugin.pluginName}</span>
                <div className="text-right text-gray-600">
                  {plugin.lastSuccessTime ? (
                    <span>
                      最終成功: {new Date(plugin.lastSuccessTime).toLocaleString('ja-JP')}
                    </span>
                  ) : (
                    <span className="text-gray-400">未取得</span>
                  )}
                  {plugin.consecutiveFailures > 0 && (
                    <span className="ml-2 text-red-600">
                      ({plugin.consecutiveFailures}回失敗)
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">アクティブなデータソースプラグインがありません</p>
        )}
      </div>

      {/* データ取得フォーム */}
      <form onSubmit={handleFetch}>
        <h4 className="text-sm font-medium text-gray-700 mb-2">データ取得</h4>
        <p className="text-xs text-gray-500 mb-3">
          指定した期間のデータを取得します。既存データは自動でスキップされます。
        </p>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-600 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={fetchMutation.isPending || !startDate || !endDate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {fetchMutation.isPending ? '取得中...' : '取得実行'}
          </button>
        </div>
        {fetchMutation.isSuccess && (
          <div className="mt-2 text-sm text-green-600">
            取得完了: {fetchMutation.data.inserted}件追加 / {fetchMutation.data.skipped}件スキップ
          </div>
        )}
        {fetchMutation.isError && (
          <div className="mt-2 text-sm text-red-600">
            エラー: {(fetchMutation.error as Error).message}
          </div>
        )}
      </form>
    </div>
  );
}

function CustomInstructionsSection(): ReactElement {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: instructionsData, isLoading } = useQuery({
    queryKey: ['custom-instructions'],
    queryFn: api.customInstructions.list,
  });

  const createMutation = useMutation({
    mutationFn: (data: { instruction: string; priority: number }) =>
      api.customInstructions.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-instructions'] });
      setIsAdding(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { instruction: string; priority: number };
    }) => api.customInstructions.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-instructions'] });
      setEditingId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.customInstructions.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-instructions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.customInstructions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-instructions'] });
    },
  });

  const instructions = instructionsData?.data ?? [];

  if (isLoading) {
    return <div className="py-4 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          + 指示を追加
        </button>
      )}

      {isAdding && (
        <InstructionForm
          onSubmit={(instruction, priority) =>
            createMutation.mutate({ instruction, priority })
          }
          onCancel={() => setIsAdding(false)}
          isLoading={createMutation.isPending}
        />
      )}

      {instructions.length === 0 && !isAdding && (
        <div className="py-4 text-center text-gray-500">
          カスタム指示がありません
        </div>
      )}

      <div className="space-y-2">
        {instructions.map((inst) =>
          editingId === inst.id ? (
            <InstructionForm
              key={inst.id}
              onSubmit={(instruction, priority) =>
                updateMutation.mutate({ id: inst.id, data: { instruction, priority } })
              }
              onCancel={() => setEditingId(null)}
              initialInstruction={inst.instruction}
              initialPriority={inst.priority}
              isLoading={updateMutation.isPending}
            />
          ) : (
            <InstructionItem
              key={inst.id}
              instruction={inst}
              onToggle={() => toggleMutation.mutate(inst.id)}
              onEdit={() => setEditingId(inst.id)}
              onDelete={() => {
                if (confirm('この指示を削除してもよろしいですか？')) {
                  deleteMutation.mutate(inst.id);
                }
              }}
              isToggling={toggleMutation.isPending}
            />
          )
        )}
      </div>
    </div>
  );
}

export function Settings(): ReactElement {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<SettingsFormData>(DEFAULT_FORM_DATA);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        collection_interval: settings.collection_interval || DEFAULT_FORM_DATA.collection_interval,
      });
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: api.settings.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    mutation.mutate(formData);
  }

  function updateField<K extends keyof SettingsFormData>(
    field: K,
    value: SettingsFormData[K]
  ): void {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">設定</h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-800">データ収集</h3>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              収集間隔
            </label>
            <select
              value={formData.collection_interval}
              onChange={(e) =>
                updateField('collection_interval', parseInt(e.target.value, 10))
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {mutation.isPending ? '保存中...' : '保存'}
          </button>
        </div>

        {mutation.isSuccess && (
          <div className="text-right text-sm text-green-600">
            設定を保存しました
          </div>
        )}
        {mutation.isError && (
          <div className="text-right text-sm text-red-600">
            エラーが発生しました: {(mutation.error as Error).message}
          </div>
        )}
      </form>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-800">データ取得</h3>
        <DataBackfillSection />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-800">
          カスタム指示
        </h3>
        <p className="mb-4 text-sm text-gray-600">
          評価レポート生成時に特に注目してほしいポイントを設定できます。
        </p>
        <CustomInstructionsSection />
      </div>
    </div>
  );
}
