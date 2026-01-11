import type { ReactElement, ChangeEvent, FormEvent } from 'react';
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Plugin, PluginType, ConfigField } from '../types';

type TabType = 'all' | PluginType;

const TABS: { key: TabType; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'agent', label: 'エージェント' },
  { key: 'data-source', label: 'データソース' },
  { key: 'notification', label: '通知' },
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
  isToggling: boolean;
  isTesting: boolean;
  isFetching?: boolean;
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
  isToggling,
  isTesting,
  isFetching,
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
        {plugin.type === 'data-source' && plugin.isLoaded && plugin.isActive && onFetch && (
          <button
            onClick={onFetch}
            disabled={isFetching}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
          >
            {isFetching ? '取得中...' : 'データ取得'}
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

export function Plugins(): ReactElement {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [configuringPlugin, setConfiguringPlugin] = useState<Plugin | null>(null);
  const [testResult, setTestResult] = useState<{ name: string; success: boolean; message?: string } | null>(null);
  const [fetchResult, setFetchResult] = useState<{ name: string; count: number; errors?: string[] } | null>(null);

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

  const fetchMutation = useMutation({
    mutationFn: (name: string) => api.plugins.fetch(name, {}),
    onSuccess: (result, name) => {
      setFetchResult({ name, count: result.data.length, errors: result.errors });
      queryClient.invalidateQueries({ queryKey: ['health-data'] });
      setTimeout(() => setFetchResult(null), 5000);
    },
    onError: (error, name) => {
      setFetchResult({ name, count: 0, errors: [(error as Error).message] });
      setTimeout(() => setFetchResult(null), 5000);
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
  });

  const setCurrentAgentMutation = useMutation({
    mutationFn: (name: string) => api.plugins.setCurrentAgent(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-agent'] });
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
  });

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file) {
      installMutation.mutate(file);
    }
  }

  const filteredPlugins = activeTab === 'all'
    ? plugins
    : plugins.filter((p) => p.type === activeTab);

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">プラグイン管理</h2>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            className="hidden"
            id="plugin-upload"
          />
          <label
            htmlFor="plugin-upload"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50"
          >
            {installMutation.isPending ? 'インストール中...' : 'プラグインをインストール'}
          </label>
        </div>
      </div>

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

      {fetchResult && (
        <div className={`p-4 rounded-md border ${fetchResult.errors && fetchResult.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
          <p className={`text-sm ${fetchResult.errors && fetchResult.errors.length > 0 ? 'text-yellow-700' : 'text-green-700'}`}>
            {fetchResult.name}: {fetchResult.count}件のデータを取得しました
            {fetchResult.errors && fetchResult.errors.length > 0 && (
              <span className="block mt-1">警告: {fetchResult.errors.join(', ')}</span>
            )}
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
              <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {tab.key === 'all'
                  ? plugins.length
                  : plugins.filter((p) => p.type === tab.key).length}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {filteredPlugins.length === 0 ? (
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
              onFetch={plugin.type === 'data-source' ? () => fetchMutation.mutate(plugin.name) : undefined}
              isToggling={toggleMutation.isPending && toggleMutation.variables?.name === plugin.name}
              isTesting={testMutation.isPending && testMutation.variables === plugin.name}
              isFetching={fetchMutation.isPending && fetchMutation.variables === plugin.name}
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
    </div>
  );
}
