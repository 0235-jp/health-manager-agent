import { createApp } from './app.js';
import { config } from './config/index.js';
import { initializeSchema } from './db/schema.js';
import { seedInitialData } from './db/seed.js';
import { AgentService } from './agent/index.js';
import { getScheduler } from './scheduler/index.js';

async function main(): Promise<void> {
  // Initialize database
  initializeSchema();
  seedInitialData();

  // Initialize agent service
  const agentService = AgentService.getInstance();
  await agentService.initialize();
  console.log('Agent service initialized');

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

    await scheduler.stop();
    await agentService.dispose();

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
