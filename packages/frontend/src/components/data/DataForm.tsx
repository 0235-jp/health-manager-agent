import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { HealthData } from '../../types';
import { api } from '../../lib/api';
import { formatForDateTimeLocal, dateTimeLocalToISO } from '../../lib/date-utils';
import { useTimezone } from '../../contexts/SettingsContext';

const STANDARD_DATA_TYPES = [
  { value: 'weight', label: '体重', unit: 'kg' },
  { value: 'sleep_duration', label: '睡眠時間', unit: 'hours' },
  { value: 'steps', label: '歩数', unit: 'count' },
  { value: 'heart_rate', label: '心拍数', unit: 'bpm' },
  { value: 'body_temperature', label: '体温', unit: '°C' },
  { value: 'blood_pressure_systolic', label: '収縮期血圧', unit: 'mmHg' },
  { value: 'blood_pressure_diastolic', label: '拡張期血圧', unit: 'mmHg' },
  { value: 'body_fat', label: '体脂肪率', unit: '%' },
];

interface DataFormProps {
  isOpen: boolean;
  onClose: () => void;
  editData?: HealthData | null;
  onSuccess?: () => void;
}

export function DataForm({ isOpen, onClose, editData, onSuccess }: DataFormProps) {
  const timezone = useTimezone();
  const [dataType, setDataType] = useState('weight');
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState('kg');
  const [recordedAt, setRecordedAt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editData;

  useEffect(() => {
    if (editData) {
      setDataType(editData.data_type);
      setValue(String(editData.value));
      setUnit(editData.unit ?? '');
      setRecordedAt(formatForDateTimeLocal(editData.recorded_at, timezone));
    } else {
      setDataType('weight');
      setValue('');
      setUnit('kg');
      setRecordedAt(formatForDateTimeLocal(new Date().toISOString(), timezone));
    }
    setError(null);
  }, [editData, isOpen, timezone]);

  useEffect(() => {
    const selectedType = STANDARD_DATA_TYPES.find((t) => t.value === dataType);
    if (selectedType && !isEditMode) {
      setUnit(selectedType.unit);
    }
  }, [dataType, isEditMode]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) {
        throw new Error('値は数値で入力してください');
      }

      const data = {
        data_type: dataType,
        value: parsedValue,
        unit: unit || undefined,
        recorded_at: dateTimeLocalToISO(recordedAt, timezone),
      };

      if (isEditMode && editData) {
        await api.healthData.update(editData.id, data);
      } else {
        await api.healthData.create(data);
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">
            {isEditMode ? 'データを編集' : 'データを追加'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              データタイプ
            </label>
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              {STANDARD_DATA_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                値
              </label>
              <input
                type="number"
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 70.5"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                単位
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: kg"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              記録日時
            </label>
            <input
              type="datetime-local"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? '保存中...' : isEditMode ? '更新' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
