import { createApp } from './app.js';
import { config } from './config/index.js';
import { initializeSchema } from './db/schema.js';
import { seedInitialData } from './db/seed.js';
import { PluginManager } from './plugins/manager.js';
import { getScheduler } from './scheduler/index.js';
import { closeMcpSessions } from './mcp/index.js';
import path from 'path';

async function main(): Promise<void> {
  // Initialize database
  initializeSchema();
  seedInitialData();

  // Initialize plugin manager
  const pluginsDir = path.resolve(process.cwd(), 'data', 'plugins');
  const pluginManager = PluginManager.getInstance(pluginsDir);
  await pluginManager.initialize();
  console.log('Plugin manager initialized');

  // Start scheduler
  const scheduler = getScheduler();
  await scheduler.start();

  // Create and start server
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    await closeMcpSessions();
    await scheduler.stop();
    await pluginManager.dispose();

    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });

    // Force exit after timeout
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
