import { Request, Response, NextFunction } from 'express';

/**
 * Production security middleware to protect against common web vulnerabilities
 */

// Set secure HTTP headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent browsers from incorrectly detecting non-scripts as scripts
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Only allow connections from same origin by default
  if (!res.headersSent && !res.getHeader('Content-Security-Policy')) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; img-src 'self' https://images.unsplash.com data:; media-src 'self' blob:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss: https://*.cloudflarestream.com"
    );
  }
  
  next();
}

// Rate limiting middleware to prevent brute force attacks
export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // A simple in-memory rate limiter
  // In production, you would use a more robust solution like Redis
  
  // Only apply rate limiting to certain endpoints
  if (req.path.startsWith('/api/login') || req.path.startsWith('/api/register')) {
    // For demo purposes, we're not actually limiting here
    // In a real app, you would track requests by IP and apply limits
    console.log(`Rate limiting would be applied to: ${req.ip} for ${req.path}`);
  }
  
  next();
}