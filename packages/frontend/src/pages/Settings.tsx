import type { ReactElement, FormEvent } from 'react';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

interface SettingsFormData {
  collection_interval: number;
  webhook_url: string;
}

const DEFAULT_FORM_DATA: SettingsFormData = {
  collection_interval: 3600,
  webhook_url: '',
};

const INTERVAL_OPTIONS = [
  { value: 1800, label: '30分' },
  { value: 3600, label: '1時間' },
  { value: 7200, label: '2時間' },
  { value: 14400, label: '4時間' },
  { value: 86400, label: '24時間' },
];

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
        webhook_url: settings.webhook_url || DEFAULT_FORM_DATA.webhook_url,
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

  function updateField<K extends keyof SettingsFormData>(field: K, value: SettingsFormData[K]): void {
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
            <label className="mb-1 block text-sm font-medium text-gray-700">収集間隔</label>
            <select
              value={formData.collection_interval}
              onChange={(e) => updateField('collection_interval', parseInt(e.target.value, 10))}
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

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-800">Webhook</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Webhook URL</label>
              <input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => updateField('webhook_url', e.target.value)}
                placeholder="https://example.com/webhook"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <button
              type="button"
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
            >
              テスト送信
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-800">カスタム指示</h3>
          <div className="py-4 text-center text-gray-500">Phase 2で実装予定</div>
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
          <div className="text-right text-sm text-green-600">設定を保存しました</div>
        )}
        {mutation.isError && (
          <div className="text-right text-sm text-red-600">
            エラーが発生しました: {(mutation.error as Error).message}
          </div>
        )}
      </form>
    </div>
  );
}
