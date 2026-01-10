import type { ReactElement } from 'react';

interface SummaryCardProps {
  title: string;
  value: string;
  unit?: string;
  subtitle: string;
}

function SummaryCard({ title, value, unit, subtitle }: SummaryCardProps): ReactElement {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-gray-900">
        {value}
        {unit && ` ${unit}`}
      </p>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

const SUMMARY_CARDS: SummaryCardProps[] = [
  { title: '体重', value: '--', unit: 'kg', subtitle: 'データなし' },
  { title: '睡眠時間', value: '--', unit: 'h', subtitle: 'データなし' },
  { title: '歩数', value: '--', subtitle: 'データなし' },
];

export function Dashboard(): ReactElement {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">ダッシュボード</h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {SUMMARY_CARDS.map((card) => (
          <SummaryCard key={card.title} {...card} />
        ))}
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-medium text-gray-800">7日間の推移</h3>
        <div className="flex h-64 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50">
          <span className="text-gray-400">グラフ表示エリア（Phase 2で実装）</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-800">最新レポート</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800">
            すべて見る →
          </button>
        </div>
        <div className="py-8 text-center text-gray-500">レポートはまだありません</div>
      </div>
    </div>
  );
}
