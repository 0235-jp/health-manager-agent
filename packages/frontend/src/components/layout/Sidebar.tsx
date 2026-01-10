import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'ダッシュボード', icon: '📊' },
  { path: '/health-data', label: 'データ管理', icon: '📋' },
  { path: '/reports', label: 'レポート', icon: '📝' },
  { path: '/plugins', label: 'プラグイン', icon: '🔌' },
  { path: '/settings', label: '設定', icon: '⚙️' },
];

function getNavLinkClassName(isActive: boolean): string {
  const baseClasses = 'flex items-center gap-3 rounded-lg px-4 py-2 transition-colors';
  if (isActive) {
    return `${baseClasses} bg-blue-50 text-blue-700`;
  }
  return `${baseClasses} text-gray-600 hover:bg-gray-100`;
}

export function Sidebar(): ReactElement {
  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-800">ヘルスマネージャー</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => getNavLinkClassName(isActive)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
