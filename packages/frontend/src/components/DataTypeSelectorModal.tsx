import { useState, useMemo } from 'react';
import type { Plugin, DataTypeDefinition } from '../types';

interface DataTypeSelectorModalProps {
  plugin: Plugin;
  onClose: () => void;
  onSave: (enabledDataTypes: string[]) => void;
  isSaving: boolean;
}

/** カテゴリの表示順序 */
const CATEGORY_ORDER = [
  '睡眠',
  '活動',
  '心臓',
  'フィットネス',
  '身体',
  '体温',
  '精神',
  '栄養',
  '健康',
  '呼吸器',
  '女性の健康',
  '位置情報',
  'その他',
];

/**
 * Set のトグル操作を行い、新しい Set を返す
 */
function toggleSetItem<T>(set: Set<T>, item: T): Set<T> {
  const newSet = new Set(set);
  if (newSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
}

/**
 * データタイプをカテゴリごとにグループ化
 */
function groupByCategory(
  dataTypes: DataTypeDefinition[]
): Record<string, DataTypeDefinition[]> {
  const groups: Record<string, DataTypeDefinition[]> = {};

  for (const dt of dataTypes) {
    const category = dt.category || 'その他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(dt);
  }

  return groups;
}

/**
 * カテゴリをソート
 */
function sortCategories(categories: string[]): string[] {
  return categories.sort((a, b) => {
    const indexA = CATEGORY_ORDER.indexOf(a);
    const indexB = CATEGORY_ORDER.indexOf(b);
    // 定義されていないカテゴリは末尾に
    const orderA = indexA === -1 ? 999 : indexA;
    const orderB = indexB === -1 ? 999 : indexB;
    return orderA - orderB;
  });
}

export function DataTypeSelectorModal({
  plugin,
  onClose,
  onSave,
  isSaving,
}: DataTypeSelectorModalProps) {
  const supportedDataTypes = plugin.supportedDataTypes || [];
  const allDataTypeNames = useMemo(
    () => supportedDataTypes.map((dt) => dt.name),
    [supportedDataTypes]
  );

  // 現在の設定を取得（未設定 or 空配列 = 全選択）
  const currentEnabled = (plugin.config?.enabledDataTypes as string[]) || [];
  const initialSelection =
    currentEnabled.length > 0 ? currentEnabled : allDataTypeNames;

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(initialSelection)
  );
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(CATEGORY_ORDER)
  );

  // カテゴリごとにグループ化
  const groupedTypes = useMemo(
    () => groupByCategory(supportedDataTypes),
    [supportedDataTypes]
  );

  // ソートされたカテゴリ一覧
  const sortedCategories = useMemo(
    () => sortCategories(Object.keys(groupedTypes)),
    [groupedTypes]
  );

  // カテゴリの展開/折りたたみ
  function toggleCategory(category: string): void {
    setExpandedCategories((prev) => toggleSetItem(prev, category));
  }

  // 個別のデータタイプの選択/解除
  function toggleDataType(name: string): void {
    setSelectedTypes((prev) => toggleSetItem(prev, name));
  }

  // カテゴリ内の全選択/全解除
  function toggleCategoryAll(category: string, select: boolean): void {
    const typesInCategory = groupedTypes[category] || [];
    setSelectedTypes((prev) => {
      const newSet = new Set(prev);
      for (const dt of typesInCategory) {
        if (select) {
          newSet.add(dt.name);
        } else {
          newSet.delete(dt.name);
        }
      }
      return newSet;
    });
  }

  function selectAll(): void {
    setSelectedTypes(new Set(allDataTypeNames));
  }

  function deselectAll(): void {
    setSelectedTypes(new Set());
  }

  function handleSave(): void {
    // 全選択の場合は空配列として保存（= 全取得）
    const enabledTypes =
      selectedTypes.size === allDataTypeNames.length
        ? []
        : Array.from(selectedTypes);
    onSave(enabledTypes);
  }

  function getCategorySelectedCount(category: string): number {
    const typesInCategory = groupedTypes[category] || [];
    return typesInCategory.filter((dt) => selectedTypes.has(dt.name)).length;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {plugin.displayName} - データタイプ選択
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* アクションボタン */}
        <div className="px-6 py-3 border-b bg-gray-50 flex gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
          >
            すべて選択
          </button>
          <button
            onClick={deselectAll}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            すべて解除
          </button>
        </div>

        {/* データタイプ一覧 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {sortedCategories.map((category) => {
            const typesInCategory = groupedTypes[category];
            const selectedCount = getCategorySelectedCount(category);
            const totalCount = typesInCategory.length;
            const isExpanded = expandedCategories.has(category);
            const allSelected = selectedCount === totalCount;

            return (
              <div key={category} className="mb-4">
                {/* カテゴリヘッダー */}
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    <span className="text-gray-400">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <span>{category}</span>
                    <span className="text-gray-500 font-normal">
                      ({selectedCount}/{totalCount})
                    </span>
                  </button>
                  <button
                    onClick={() => toggleCategoryAll(category, !allSelected)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    {allSelected ? '解除' : '全選択'}
                  </button>
                </div>

                {/* データタイプ一覧 */}
                {isExpanded && (
                  <div className="ml-6 space-y-1">
                    {typesInCategory.map((dt) => (
                      <label
                        key={dt.name}
                        className="flex items-start gap-2 cursor-pointer py-1 hover:bg-gray-50 rounded px-2 -mx-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTypes.has(dt.name)}
                          onChange={() => toggleDataType(dt.name)}
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900">
                            {dt.displayName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {dt.name}
                            {dt.unit && ` (${dt.unit})`}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            {supportedDataTypes.length}種類中 {selectedTypes.size}種類を選択
            {selectedTypes.size === 0 && (
              <span className="text-amber-600 ml-2">
                (選択がない場合はすべて取得します)
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSaving}
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
