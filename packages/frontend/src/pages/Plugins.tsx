import type { ReactElement, FormEvent } from 'react';
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, schedulerApi } from '../lib/api';
import { formatDateForInput, getDateDaysAgo, formatDateTime } from '../lib/date-utils';
import { useTimezone } from '../contexts/SettingsContext';
import { useHeaderActions } from '../hooks/useHeaderActions';
import type { Plugin, PluginType, ConfigField, DataTypeDefinition } from '../types';
import { DataTypeSelectorModal } from '../components/DataTypeSelectorModal';

type TabType = 'all' | PluginType | 'settings';

const TABS: { key: TabType; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'agent', label: 'エージェント' },
  { key: 'data-source', label: 'データソース' },
  { key: 'notification', label: '通知' },
  { key: 'settings', label: '設定' },
];

const PLUGIN_TYPE_CONFIG: Record<PluginType, { label: string; badgeClass: string }> = {
  agent: { label: 'エージェント', badgeClass: 'bg-purple-100 text-purple-800' },
  'data-source': { label: 'データソース', badgeClass: 'bg-blue-100 text-blue-800' },
  notification: { label: '通知', badgeClass: 'bg-green-100 text-green-800' },
};

function getPluginTypeLabel(type: PluginType): string {
  return PLUGIN_TYPE_CONFIG[type]?.label ?? type;
}

function getPluginTypeBadgeClass(type: PluginType): string {
  return PLUGIN_TYPE_CONFIG[type]?.badgeClass ?? 'bg-gray-100 text-gray-800';
}

/**
 * 有効データタイプ数の表示テキストを取得
 */
function getEnabledDataTypesLabel(plugin: Plugin): string {
  const enabled = plugin.config?.enabledDataTypes as string[] | undefined;
  const total = plugin.supportedDataTypes?.length ?? 0;
  const count = enabled?.length ? enabled.length : total;
  return `${count}/${total}`;
}

const INPUT_CLASS = 'w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500';

interface ConfigFormProps {
  plugin: Plugin;
  onSave: (config: Record<string, unknown>) => void;
  onCancel: () => void;
  isSaving: boolean;
}

function ConfigForm({ plugin, onSave, onCancel, isSaving }: ConfigFormProps): ReactElement {
  const [formData, setFormData] = useState<Record<string, unknown>>(plugin.config || {});

  function handleChange(key: string, value: unknown): void {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault();
    onSave(formData);
  }

  const fields = Object.entries(plugin.configSchema || {}) as [string, ConfigField][];

  function renderField(key: string, field: ConfigField): ReactElement | null {
    switch (field.type) {
      case 'string':
        return (
          <input
            type={field.secret ? 'password' : 'text'}
            value={(formData[key] as string) || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className={INPUT_CLASS}
            required={field.required}
            disabled={isSaving}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={(formData[key] as number) || ''}
            onChange={(e) => handleChange(key, parseFloat(e.target.value) || 0)}
            className={INPUT_CLASS}
            required={field.required}
            disabled={isSaving}
          />
        );
      case 'boolean':
        return (
          <input
            type="checkbox"
            checked={(formData[key] as boolean) || false}
            onChange={(e) => handleChange(key, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            disabled={isSaving}
          />
        );
      case 'select':
        return (
          <select
            value={(formData[key] as string) || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className={INPUT_CLASS}
            required={field.required}
            disabled={isSaving}
          >
            <option value="">選択してください</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'multiselect':
        return (
          <div className="space-y-2 border rounded-md p-3 bg-gray-50">
            {field.options?.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={((formData[key] as string[]) || []).includes(opt.value)}
                  onChange={(e) => {
                    const current = (formData[key] as string[]) || [];
                    const updated = e.target.checked
                      ? [...current, opt.value]
                      : current.filter((v) => v !== opt.value);
                    handleChange(key, updated);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isSaving}
                />
                <span className="text-sm text-gray-700">{opt.label}</span>
              </label>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.length === 0 ? (
        <p className="text-gray-500 text-sm">このプラグインには設定項目がありません</p>
      ) : (
        fields.map(([key, field]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-1">{field.description}</p>
            )}
            {renderField(key, field)}
          </div>
        ))
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? '保存中...' : '保存'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

interface PluginCardProps {
  plugin: Plugin;
  onToggle: () => void;
  onConfigure: () => void;
  onTest: () => void;
  onUninstall: () => void;
  onFetch?: () => void;
  onConfigureDataTypes?: () => void;
  isToggling: boolean;
  isTesting: boolean;
  isCurrentAgent?: boolean;
  onSetCurrentAgent?: () => void;
}

function PluginCard({
  plugin,
  onToggle,
  onConfigure,
  onTest,
  onUninstall,
  onFetch,
  onConfigureDataTypes,
  isToggling,
  isTesting,
  isCurrentAgent,
  onSetCurrentAgent,
}: PluginCardProps): ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-gray-900">{plugin.displayName}</h3>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPluginTypeBadgeClass(plugin.type)}`}
            >
              {getPluginTypeLabel(plugin.type)}
            </span>
            {!plugin.isLoaded && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                未ロード
              </span>
            )}
            {isCurrentAgent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                使用中
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {plugin.name} v{plugin.version}
          </p>
          {plugin.description && (
            <p className="text-sm text-gray-600 mt-2">{plugin.description}</p>
          )}

          {plugin.type === 'data-source' && plugin.supportedDataTypes && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">対応データタイプ:</p>
              <div className="flex flex-wrap gap-1">
                {plugin.supportedDataTypes.slice(0, 5).map((dt) => (
                  <span
                    key={dt.name}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                  >
                    {dt.displayName}
                  </span>
                ))}
                {plugin.supportedDataTypes.length > 5 && (
                  <span className="text-xs text-gray-500">
                    +{plugin.supportedDataTypes.length - 5}
                  </span>
                )}
              </div>
            </div>
          )}

          {plugin.type === 'agent' && plugin.supportedModels && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">対応モデル:</p>
              <div className="flex flex-wrap gap-1">
                {plugin.supportedModels.map((model) => (
                  <span
                    key={model}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                  >
                    {model}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={plugin.isActive}
              onChange={onToggle}
              disabled={isToggling || !plugin.isLoaded}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
        <button
          onClick={onConfigure}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          設定
        </button>
        {plugin.isLoaded && (
          <button
            onClick={onTest}
            disabled={isTesting}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {isTesting ? 'テスト中...' : 'テスト'}
          </button>
        )}
        {plugin.type === 'data-source' && plugin.supportedDataTypes && plugin.supportedDataTypes.length > 0 && onConfigureDataTypes && (
          <button
            onClick={onConfigureDataTypes}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            データタイプ選択
            <span className="ml-1 text-xs text-gray-500">
              ({getEnabledDataTypesLabel(plugin)})
            </span>
          </button>
        )}
        {plugin.type === 'data-source' && plugin.isLoaded && plugin.isActive && onFetch && (
          <button
            onClick={onFetch}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            データ取得
          </button>
        )}
        {plugin.type === 'agent' && plugin.isLoaded && !isCurrentAgent && onSetCurrentAgent && (
          <button
            onClick={onSetCurrentAgent}
            className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 border border-green-200 rounded-md hover:bg-green-100"
          >
            使用する
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(`プラグイン "${plugin.displayName}" をアンインストールしますか？`)) {
              onUninstall();
            }
          }}
          className="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-gray-300 rounded-md hover:bg-red-50"
        >
          削除
        </button>
      </div>
    </div>
  );
}

interface ConfigModalProps {
  plugin: Plugin;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => void;
  isSaving: boolean;
}

function ConfigModal({ plugin, onClose, onSave, isSaving }: ConfigModalProps): ReactElement {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {plugin.displayName} の設定
            </h3>
            <ConfigForm
              plugin={plugin}
              onSave={onSave}
              onCancel={onClose}
              isSaving={isSaving}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface FetchModalProps {
  plugin: Plugin;
  onClose: () => void;
}

function FetchModal({ plugin, onClose }: FetchModalProps): ReactElement {
  const timezone = useTimezone();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(() => formatDateForInput(getDateDaysAgo(7)));
  const [endDate, setEndDate] = useState(() => formatDateForInput(new Date()));

  const { data: status } = useQuery({
    queryKey: ['scheduler-status'],
    queryFn: schedulerApi.getStatus,
  });

  const backfillMutation = useMutation({
    mutationFn: schedulerApi.runBackfill,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      queryClient.invalidateQueries({ queryKey: ['scheduler-status'] });
    },
  });

  const pluginStatus = status?.plugins.find((p) => p.pluginName === plugin.name);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (startDate && endDate) {
      backfillMutation.mutate({
        startDate,
        endDate,
        pluginNames: [plugin.name],
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md">
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              {plugin.displayName} からデータ取得
            </h3>

            {pluginStatus && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
                <p className="text-gray-600">
                  最終成功:{' '}
                  {pluginStatus.lastSuccessTime
                    ? formatDateTime(pluginStatus.lastSuccessTime, timezone)
                    : '未取得'}
                </p>
                {pluginStatus.consecutiveFailures > 0 && (
                  <p className="text-red-600">
                    連続失敗回数: {pluginStatus.consecutiveFailures}
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  required
                />
              </div>

              {backfillMutation.isSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                  取得完了: {backfillMutation.data.inserted}件追加 / {backfillMutation.data.skipped}件スキップ
                </div>
              )}

              {backfillMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                  エラー: {(backfillMutation.error as Error).message}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={backfillMutation.isPending || !startDate || !endDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {backfillMutation.isPending ? '取得中...' : 'データ取得'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
                >
                  閉じる
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 重複データタイプの情報 */
interface OverlappingDataType {
  dataType: DataTypeDefinition;
  sources: Array<{ pluginName: string; displayName: string }>;
}

/** 重複データタイプを計算する */
function getOverlappingDataTypes(plugins: Plugin[]): OverlappingDataType[] {
  const dataTypeMap = new Map<string, OverlappingDataType>();

  for (const plugin of plugins) {
    if (plugin.type !== 'data-source' || !plugin.isActive || !plugin.supportedDataTypes) {
      continue;
    }

    for (const dt of plugin.supportedDataTypes) {
      const existing = dataTypeMap.get(dt.name);
      const source = { pluginName: plugin.name, displayName: plugin.displayName };

      if (existing) {
        existing.sources.push(source);
      } else {
        dataTypeMap.set(dt.name, { dataType: dt, sources: [source] });
      }
    }
  }

  return Array.from(dataTypeMap.values()).filter((item) => item.sources.length >= 2);
}

interface DataSourcePrioritySectionProps {
  plugins: Plugin[];
}

function DataSourcePrioritySection({ plugins }: DataSourcePrioritySectionProps): ReactElement {
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
  });

  const [editedPriority, setEditedPriority] = useState<Record<string, string> | null>(null);
  const overlappingTypes = useMemo(() => getOverlappingDataTypes(plugins), [plugins]);

  const savedPriority = settings?.data_source_priority || {};
  const isEditing = editedPriority !== null;
  const displayPriority = editedPriority ?? savedPriority;

  const updateMutation = useMutation({
    mutationFn: (priority: Record<string, string>) =>
      api.settings.update({ data_source_priority: priority }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setEditedPriority(null);
    },
  });

  function handleChange(dataType: string, source: string): void {
    const current = editedPriority ?? { ...savedPriority };
    if (source === '') {
      const { [dataType]: _removed, ...rest } = current;
      void _removed;
      setEditedPriority(rest);
    } else {
      setEditedPriority({ ...current, [dataType]: source });
    }
  }

  function handleSave(): void {
    if (editedPriority) {
      updateMutation.mutate(editedPriority);
    }
  }

  function handleCancel(): void {
    setEditedPriority(null);
  }

  if (overlappingTypes.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-800">データソース優先度</h3>
        <p className="text-gray-500 text-sm">
          複数のデータソースが同じデータタイプを提供している場合にのみ、優先度を設定できます。
        </p>
        <p className="text-gray-400 text-sm mt-2">
          現在、重複するデータタイプはありません。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-2 text-lg font-medium text-gray-800">データソース優先度</h3>
      <p className="text-gray-500 text-sm mb-4">
        複数のデータソースが同じデータタイプを提供している場合、どのソースを優先するか設定できます。
      </p>

      <div className="space-y-3">
        {overlappingTypes.map(({ dataType, sources }) => (
          <div key={dataType.name} className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700">{dataType.displayName}</p>
              <p className="text-xs text-gray-400">{dataType.name}</p>
            </div>
            <select
              value={displayPriority[dataType.name] || ''}
              onChange={(e) => handleChange(dataType.name, e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">自動（先着優先）</option>
              {sources.map((source) => (
                <option key={source.pluginName} value={source.pluginName}>
                  {source.displayName}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? '保存中...' : '保存'}
          </button>
          <button
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
        </div>
      )}

      {updateMutation.isSuccess && !isEditing && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          設定を保存しました
        </div>
      )}

      {updateMutation.isError && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
          エラー: {(updateMutation.error as Error).message}
        </div>
      )}
    </div>
  );
}

export function Plugins(): ReactElement {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [configuringPlugin, setConfiguringPlugin] = useState<Plugin | null>(null);
  const [fetchingPlugin, setFetchingPlugin] = useState<Plugin | null>(null);
  const [dataTypeSelectorPlugin, setDataTypeSelectorPlugin] = useState<Plugin | null>(null);
  const [testResult, setTestResult] = useState<{ name: string; success: boolean; message?: string } | null>(null);

  const { data: plugins = [], isLoading } = useQuery({
    queryKey: ['plugins'],
    queryFn: () => api.plugins.list(),
  });

  const { data: currentAgent } = useQuery({
    queryKey: ['current-agent'],
    queryFn: () => api.plugins.getCurrentAgent(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ name, isActive }: { name: string; isActive: boolean }) =>
      api.plugins.setActive(name, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const configMutation = useMutation({
    mutationFn: ({ name, config }: { name: string; config: Record<string, unknown> }) =>
      api.plugins.updateConfig(name, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      setConfiguringPlugin(null);
    },
  });

  const testMutation = useMutation({
    mutationFn: (name: string) => api.plugins.test(name),
    onSuccess: (result, name) => {
      setTestResult({ name, ...result });
      setTimeout(() => setTestResult(null), 5000);
    },
    onError: (error, name) => {
      setTestResult({ name, success: false, message: (error as Error).message });
      setTimeout(() => setTestResult(null), 5000);
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: (name: string) => api.plugins.uninstall(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const installMutation = useMutation({
    mutationFn: (file: File) => api.plugins.install(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const setCurrentAgentMutation = useMutation({
    mutationFn: (name: string) => api.plugins.setCurrentAgent(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-agent'] });
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  const filteredPlugins = activeTab === 'all' || activeTab === 'settings'
    ? plugins
    : plugins.filter((p) => p.type === activeTab);

  const handleFileUpload = useCallback((file: File) => {
    installMutation.mutate(file);
  }, [installMutation]);

  useHeaderActions([{
    label: installMutation.isPending ? 'インストール中...' : 'プラグインをインストール',
    type: 'file-upload',
    accept: '.zip',
    onFileChange: handleFileUpload,
    variant: 'primary',
    disabled: installMutation.isPending,
  }], [handleFileUpload, installMutation.isPending]);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      {installMutation.isError && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">
            インストールエラー: {(installMutation.error as Error).message}
          </p>
        </div>
      )}

      {installMutation.isSuccess && (
        <div className="p-4 rounded-md bg-green-50 border border-green-200">
          <p className="text-sm text-green-700">
            プラグイン "{installMutation.data.plugin.displayName}" をインストールしました
          </p>
        </div>
      )}

      {testResult && (
        <div className={`p-4 rounded-md border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {testResult.name}: {testResult.success ? 'テスト成功' : 'テスト失敗'}
            {testResult.message && ` - ${testResult.message}`}
          </p>
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.key !== 'settings' && (
                <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {tab.key === 'all'
                    ? plugins.length
                    : plugins.filter((p) => p.type === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'settings' ? (
        <DataSourcePrioritySection plugins={plugins} />
      ) : filteredPlugins.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            {activeTab === 'all'
              ? 'プラグインがインストールされていません'
              : `${TABS.find((t) => t.key === activeTab)?.label}プラグインがインストールされていません`}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            ZIPファイルをアップロードしてプラグインをインストールしてください
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPlugins.map((plugin) => (
            <PluginCard
              key={plugin.name}
              plugin={plugin}
              onToggle={() => toggleMutation.mutate({ name: plugin.name, isActive: !plugin.isActive })}
              onConfigure={() => setConfiguringPlugin(plugin)}
              onTest={() => testMutation.mutate(plugin.name)}
              onUninstall={() => uninstallMutation.mutate(plugin.name)}
              onFetch={plugin.type === 'data-source' ? () => setFetchingPlugin(plugin) : undefined}
              onConfigureDataTypes={plugin.type === 'data-source' ? () => setDataTypeSelectorPlugin(plugin) : undefined}
              isToggling={toggleMutation.isPending && toggleMutation.variables?.name === plugin.name}
              isTesting={testMutation.isPending && testMutation.variables === plugin.name}
              isCurrentAgent={plugin.type === 'agent' && currentAgent?.name === plugin.name}
              onSetCurrentAgent={plugin.type === 'agent' ? () => setCurrentAgentMutation.mutate(plugin.name) : undefined}
            />
          ))}
        </div>
      )}

      {configuringPlugin && (
        <ConfigModal
          plugin={configuringPlugin}
          onClose={() => setConfiguringPlugin(null)}
          onSave={(config) => configMutation.mutate({ name: configuringPlugin.name, config })}
          isSaving={configMutation.isPending}
        />
      )}

      {fetchingPlugin && (
        <FetchModal
          plugin={fetchingPlugin}
          onClose={() => setFetchingPlugin(null)}
        />
      )}

      {dataTypeSelectorPlugin && (
        <DataTypeSelectorModal
          plugin={dataTypeSelectorPlugin}
          onClose={() => setDataTypeSelectorPlugin(null)}
          onSave={(enabledDataTypes) => {
            configMutation.mutate({
              name: dataTypeSelectorPlugin.name,
              config: { enabledDataTypes },
            });
            setDataTypeSelectorPlugin(null);
          }}
          isSaving={configMutation.isPending}
        />
      )}
    </div>
  );
}
