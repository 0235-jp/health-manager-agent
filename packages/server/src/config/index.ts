export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  serverBaseUrl: process.env.SERVER_BASE_URL || 'http://localhost:3001',
  bearerToken: process.env.HEALTH_MANAGER_BEARER_TOKEN || '',
  cfAccessClientId: process.env.CF_ACCESS_CLIENT_ID || '',
  cfAccessClientSecret: process.env.CF_ACCESS_CLIENT_SECRET || '',
};
