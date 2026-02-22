import { Request, Response, NextFunction } from 'express';
import { config } from '../../config/index.js';

const authEnabled = !!(config.bearerToken || config.cfAccessClientId);

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!authEnabled) {
    next();
    return;
  }

  // Bearer token check
  if (config.bearerToken) {
    const authHeader = req.headers.authorization;
    if (authHeader === `Bearer ${config.bearerToken}`) {
      next();
      return;
    }
  }

  // Cloudflare Service Token check
  if (config.cfAccessClientId) {
    const clientId = req.headers['cf-access-client-id'];
    const clientSecret = req.headers['cf-access-client-secret'];
    if (clientId === config.cfAccessClientId && clientSecret === config.cfAccessClientSecret) {
      next();
      return;
    }
  }

  res.status(401).json({ error: { message: 'Unauthorized' } });
}
