import { useState, type ReactElement } from 'react';
import { Markdown } from './Markdown';
import { TrendIndicator } from './charts/TrendIndicator';
import { useTimezone } from '../contexts/SettingsContext';
import { formatDateTime, formatPeriod } from '../lib/date-utils';
import type { Report, ReportType } from '../types';

function ReportTypeBadge({ type }: { type: ReportType }): ReactElement {
  const config = {
    daily: { label: '日次', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
    on_fetch: { label: '定期', bgColor: 'bg-green-100', textColor: 'text-green-800' },
    manual: { label: '手動', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  };
  const { label, bgColor, textColor } = config[type];

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
}

interface ReportCardProps {
  report: Report;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

export function ReportCard({ report, onDelete, isDeleting }: ReportCardProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const timezone = useTimezone();
  const { content } = report;

  const metricEntries = Object.entries(content.metrics);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ReportTypeBadge type={report.report_type} />
              <span className="text-sm text-gray-500">
                {formatPeriod(
                  report.period_start,
                  report.period_end,
                  timezone,
                  report.report_type !== 'daily'
                )}
              </span>
            </div>
            <Markdown className="mt-2 text-gray-700">{content.summary}</Markdown>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(report.id)}
              disabled={isDeleting}
              className="text-gray-400 hover:text-red-500 disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>

        {metricEntries.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {metricEntries.map(([key, metric]) => (
              <div key={key} className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">{key}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {metric.value}
                  <span className="ml-1 text-sm font-normal text-gray-500">{metric.unit}</span>
                </p>
                <TrendIndicator trend={metric.trend} showValue={false} />
              </div>
            ))}
          </div>
        )}

        {(content.risks.length > 0 || content.recommendations.length > 0) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 text-sm text-blue-600 hover:text-blue-800"
          >
            {isExpanded ? '詳細を閉じる' : '詳細を表示'}
          </button>
        )}

        {isExpanded && (
          <div className="mt-4 space-y-4">
            {content.risks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-700">リスク・注意点</h4>
                <ul className="mt-2 space-y-1">
                  {content.risks.map((risk, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-red-500">!</span>
                      <Markdown>{risk}</Markdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content.recommendations.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-700">推奨事項</h4>
                <ul className="mt-2 space-y-1">
                  {content.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500">✓</span>
                      <Markdown>{rec}</Markdown>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-gray-400">
          作成日時: {formatDateTime(report.created_at, timezone)}
        </p>
      </div>
    </div>
  );
}
