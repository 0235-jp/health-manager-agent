import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod/v4';

type RequestTarget = 'query' | 'body';

function createValidator(schema: ZodSchema, target: RequestTarget): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      res.status(400).json({
        error: {
          message: 'Validation error',
          details: result.error.issues,
        },
      });
      return;
    }

    req[target] = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema): RequestHandler {
  return createValidator(schema, 'query');
}

export function validateBody(schema: ZodSchema): RequestHandler {
  return createValidator(schema, 'body');
}
