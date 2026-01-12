import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { ChatProvider } from './contexts/ChatContext';
import { Dashboard } from './pages/Dashboard';
import Chat from './pages/Chat';
import { HealthData } from './pages/HealthData';
import { Reports } from './pages/Reports';
import { Plugins } from './pages/Plugins';
import { Settings } from './pages/Settings';

const STALE_TIME_MS = 60_000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      retry: 1,
    },
  },
});

export function App(): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/health-data" element={<HealthData />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/plugins" element={<Plugins />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </ChatProvider>
    </QueryClientProvider>
  );
}
