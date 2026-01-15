import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { getTodayDateString } from '../../lib/date-utils';

interface DateTimePickerProps {
  value: string;  // datetime-local形式 (YYYY-MM-DDTHH:mm)
  onChange: (value: string) => void;
  timezone: string;
  label?: string;
}

/**
 * タイムゾーン対応の日時ピッカー
 * - カレンダーで日付を選択
 * - 時刻入力
 * - 設定タイムゾーンを表示
 */
export function DateTimePicker({
  value,
  onChange,
  timezone,
  label,
}: DateTimePickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // value から Date オブジェクトを作成（表示用）
  const selectedDate = value ? new Date(value) : undefined;

  // value から時刻部分を抽出
  const timeValue = value ? value.split('T')[1] || '' : '';

  // カレンダー外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 日付選択時
  function handleDateSelect(date: Date | undefined) {
    if (date) {
      const dateStr = formatDatePart(date);
      const time = timeValue || '00:00';
      onChange(`${dateStr}T${time}`);
    }
    setIsCalendarOpen(false);
  }

  // 時刻変更時
  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTime = e.target.value;
    if (selectedDate) {
      const dateStr = formatDatePart(selectedDate);
      onChange(`${dateStr}T${newTime}`);
    } else {
      // 日付が未選択の場合は設定タイムゾーンでの今日の日付を使用
      const dateStr = getTodayDateString(timezone);
      onChange(`${dateStr}T${newTime}`);
    }
  }

  // Date を YYYY-MM-DD 形式に変換
  function formatDatePart(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 表示用の日付フォーマット
  function formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // タイムゾーンの短縮表示（都市名部分を抽出）
  function formatTimezoneShort(tz: string): string {
    return tz.split('/').pop()?.replace(/_/g, ' ') || tz;
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="flex gap-2">
        {/* 日付選択ボタン */}
        <button
          type="button"
          onClick={() => setIsCalendarOpen(!isCalendarOpen)}
          className="flex-1 px-3 py-2 text-left border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {selectedDate ? formatDisplayDate(selectedDate) : '日付を選択'}
        </button>

        {/* 時刻入力 */}
        <input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* タイムゾーン表示 */}
      <p className="mt-1 text-xs text-gray-500">
        {formatTimezoneShort(timezone)}
      </p>

      {/* カレンダーポップアップ */}
      {isCalendarOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            className="p-2"
          />
        </div>
      )}
    </div>
  );
}
