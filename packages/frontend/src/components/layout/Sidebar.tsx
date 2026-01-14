import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { useSidebar } from '../../contexts/SidebarContext';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { path: '/', label: 'ダッシュボード', icon: '📊' },
  { path: '/chat', label: 'チャット', icon: '💬' },
  { path: '/health-data', label: 'データ管理', icon: '📋' },
  { path: '/reports', label: 'レポート', icon: '📝' },
  { path: '/plugins', label: 'プラグイン', icon: '🔌' },
  { path: '/settings', label: '設定', icon: '⚙️' },
];

function getNavLinkClassName(isActive: boolean): string {
  const baseClasses = 'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors';
  if (isActive) {
    return `${baseClasses} bg-blue-50 text-blue-700`;
  }
  return `${baseClasses} text-gray-600 hover:bg-gray-100`;
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }): ReactElement {
  return (
    <>
      <div className="border-b border-gray-200 p-4">
        <h1 className="text-xl font-bold text-gray-800">ヘルスマネージャー</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavClick}
            className={({ isActive }) => getNavLinkClassName(isActive)}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export function Sidebar(): ReactElement {
  const { isOpen, close } = useSidebar();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-gray-200 bg-white">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50"
            onClick={close}
            aria-hidden="true"
          />
          {/* Sidebar Panel */}
          <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl">
            <SidebarContent onNavClick={close} />
          </aside>
        </div>
      )}
    </>
  );
}
