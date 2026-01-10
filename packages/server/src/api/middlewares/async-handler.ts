import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(fn: (req: Request, res: Response) => void): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      fn(req, res);
    } catch (error) {
      next(error);
    }
  };
}
