import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { runWithCorrelationId } from '../utils/context.js';

/**
 * Middleware to add correlation ID to every request
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Try to get CID from header or generate a new one
  const correlationId = (req.header('x-correlation-id') || uuidv4()) as string;
  
  // Add to response headers so client knows it
  res.setHeader('x-correlation-id', correlationId);
  
  // Attach to request object (for convenience)
  (req as any).correlationId = correlationId;
  
  // Wrap the rest of the request processing in context
  runWithCorrelationId(correlationId, () => {
    next();
  });
}
