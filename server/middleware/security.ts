import { Request, Response, NextFunction } from 'express';

/**
 * Production security middleware to protect against common web vulnerabilities
 */

// In-memory store for rate limiting (would use Redis in a real production app)
interface RateLimitData {
  count: number;
  resetAt: number;
}

const ipLimiter: Map<string, RateLimitData> = new Map();
const pathLimiter: Map<string, RateLimitData> = new Map();

// Set secure HTTP headers
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent browsers from incorrectly detecting non-scripts as scripts
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict Transport Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Disable referrer information for cross-origin requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
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
  const isProd = process.env.NODE_ENV === 'production';
  const clientIp = req.ip || 'unknown';
  const pathKey = `${clientIp}:${req.path}`;
  const now = Date.now();
  
  // Configure rate limits based on endpoint sensitivity
  let maxRequests = 100; // Default limit
  let windowMs = 60 * 1000; // Default window: 1 minute
  
  // Stricter limits for authentication endpoints
  if (req.path.startsWith('/api/login') || req.path.startsWith('/api/register')) {
    maxRequests = isProd ? 10 : 30; // 10 requests per minute in production
    windowMs = 60 * 1000; // 1 minute window
  } 
  // API endpoints with sensitive operations
  else if (req.path.startsWith('/api/admin') || req.path.includes('cloudflare')) {
    maxRequests = isProd ? 20 : 50; // 20 requests per minute in production
    windowMs = 60 * 1000; // 1 minute window
  }
  
  // Skip rate limiting if not needed
  if (maxRequests === 0 || !isProd) {
    // In development, just log instead of enforcing
    if (!isProd && (req.path.startsWith('/api/login') || req.path.startsWith('/api/register'))) {
      console.log(`[DEV] Rate limiting would be applied to: ${clientIp} for ${req.path}`);
    }
    return next();
  }
  
  // Get current limit data for this IP + path combination
  let limitData = pathLimiter.get(pathKey);
  
  if (!limitData || now > limitData.resetAt) {
    // First request or window expired, create new limit data
    limitData = {
      count: 1,
      resetAt: now + windowMs
    };
    pathLimiter.set(pathKey, limitData);
  } else {
    // Increment count for existing window
    limitData.count++;
    
    // Check if limit exceeded
    if (limitData.count > maxRequests) {
      console.warn(`Rate limit exceeded for ${clientIp} on ${req.path}`);
      
      // Set headers to inform client about rate limiting
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(limitData.resetAt / 1000).toString());
      res.setHeader('Retry-After', Math.ceil((limitData.resetAt - now) / 1000).toString());
      
      return res.status(429).json({
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil((limitData.resetAt - now) / 1000)
      });
    }
  }
  
  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - limitData.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(limitData.resetAt / 1000).toString());
  
  next();
}

// Middleware for handling cross-origin resource sharing
export function corsHandler(req: Request, res: Response, next: NextFunction) {
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = isProd 
    ? [process.env.APP_URL || ''].filter(Boolean) 
    : ['http://localhost:5000'];
    
  const origin = req.headers.origin;
  
  // Check if the origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  next();
}