import type { ReactElement, ChangeEvent } from 'react';
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useHeader, type HeaderAction } from '../../contexts/HeaderContext';
import { useSidebar } from '../../contexts/SidebarContext';

const PAGE_TITLES: Record<string, string> = {
  '/': 'ダッシュボード',
  '/health-data': 'データ管理',
  '/reports': 'レポート',
  '/plugins': 'プラグイン管理',
  '/settings': '設定',
  '/chat': 'AI アシスタント',
};

function getButtonClassName(variant: 'primary' | 'secondary' | undefined, disabled: boolean | undefined): string {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors';
  const variantStyles = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : '';
  return `${base} ${variantStyles} ${disabledStyles}`;
}

function ActionButton({ action }: { action: HeaderAction }): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const className = getButtonClassName(action.variant, action.disabled);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (file && action.onFileChange) {
      action.onFileChange(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  if (action.type === 'file-upload') {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept={action.accept}
          onChange={handleFileChange}
          className="hidden"
          id={`file-upload-${action.label}`}
        />
        <label
          htmlFor={`file-upload-${action.label}`}
          className={`${className} cursor-pointer`}
        >
          {action.label}
        </label>
      </>
    );
  }

  return (
    <button
      onClick={action.onClick}
      disabled={action.disabled}
      className={className}
    >
      {action.label}
    </button>
  );
}

function HamburgerButton(): ReactElement {
  const { toggle } = useSidebar();

  return (
    <button
      onClick={toggle}
      className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 md:hidden"
      aria-label="メニューを開く"
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

export function Header(): ReactElement {
  const location = useLocation();
  const { actions } = useHeader();
  const pageTitle = PAGE_TITLES[location.pathname] ?? '';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-6">
      <div className="flex items-center">
        <HamburgerButton />
        <h1 className="text-lg md:text-xl font-semibold text-gray-800">{pageTitle}</h1>
      </div>
      {actions.length > 0 && (
        <div className="flex items-center gap-2">
          {actions.map((action, index) => (
            <ActionButton key={index} action={action} />
          ))}
        </div>
      )}
    </header>
  );
}
