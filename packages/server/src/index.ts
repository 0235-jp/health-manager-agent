import { createApp } from './app.js';
import { config } from './config/index.js';
import { initializeSchema } from './db/schema.js';
import { seedInitialData } from './db/seed.js';

// Initialize database
initializeSchema();
seedInitialData();

const app = createApp();

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});
