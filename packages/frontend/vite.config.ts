import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: parseInt(env.VITE_PORT || '5173', 10),
      host: true,  // 0.0.0.0 でバインド（外部からアクセス可能）
      allowedHosts: env.VITE_ALLOWED_HOSTS?.split(',').filter(Boolean) || [],
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: parseInt(env.VITE_PREVIEW_PORT || '4173', 10),
      host: true,
      allowedHosts: env.VITE_ALLOWED_HOSTS?.split(',').filter(Boolean) || [],
    },
  };
});
