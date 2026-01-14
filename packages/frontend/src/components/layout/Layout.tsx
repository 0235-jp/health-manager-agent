import type { ReactElement, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { HeaderProvider } from '../../contexts/HeaderContext';
import { SidebarProvider } from '../../contexts/SidebarContext';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps): ReactElement {
  return (
    <SidebarProvider>
      <HeaderProvider>
        <div className="flex h-dvh bg-gray-50">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
          </div>
        </div>
      </HeaderProvider>
    </SidebarProvider>
  );
}
