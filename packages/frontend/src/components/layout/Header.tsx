import type { ReactElement } from 'react';
import { useTimezone } from '../../contexts/SettingsContext';
import { getTodayInTimezone } from '../../lib/date-utils';

export function Header(): ReactElement {
  const timezone = useTimezone();
  const today = getTodayInTimezone(timezone);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <span className="text-sm text-gray-500">{today}</span>
    </header>
  );
}
