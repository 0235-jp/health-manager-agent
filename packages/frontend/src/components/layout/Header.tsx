import type { ReactElement } from 'react';

export function Header(): ReactElement {
  const today = new Date().toLocaleDateString('ja-JP');

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div />
      <span className="text-sm text-gray-500">{today}</span>
    </header>
  );
}
