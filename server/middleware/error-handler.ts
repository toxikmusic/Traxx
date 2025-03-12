/**
 * Global Error Handler Middleware
 * Provides consistent error response formatting for the BeatStream API
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { log } from '../vite';

/**
 * Custom API error class with status code and additional details
 */
export class ApiError extends Error {
  statusCode: number;
  details?: any;
  
  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Middleware to handle all errors in a consistent way
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  // Log the error for debugging
  log(`Error: ${err.message}`, 'error');
  
  // Default error values
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details: any = undefined;
  
  // Handle specific error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err instanceof z.ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors;
  } else if (err instanceof SyntaxError && 'body' in err) {
    // JSON parsing error
    statusCode = 400;
    message = 'Invalid JSON';
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  }
  
  // In production, don't expose stack traces or internal error details
  if (process.env.NODE_ENV === 'production') {
    // Only include validation errors in production
    if (statusCode !== 400) {
      details = undefined;
    }
  } else {
    console.error(err);
  }
  
  // Send JSON response with appropriate headers
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      details,
      // Include timestamp for logging/debugging
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Middleware to handle 404 errors for routes that don't exist
 */
export function notFoundHandler(req: Request, res: Response) {
  const statusCode = 404;
  const message = `Route not found: ${req.method} ${req.path}`;
  
  // Log the 404 for monitoring unusual activity
  log(message, 'warning');
  
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString()
    }
  });
}

/**
 * Utility function to catch async errors in route handlers
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}