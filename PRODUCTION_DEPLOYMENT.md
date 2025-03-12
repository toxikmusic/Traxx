# BeatStream Production Deployment Guide

This document outlines the steps to prepare and deploy the BeatStream application for production.

## Pre-deployment Checklist

Before deploying to production, ensure the following requirements are met:

### Environment Variables

Make sure the following environment variables are set in your production environment:

**Required:**
- `NODE_ENV=production` - Sets the application to production mode
- `SESSION_SECRET` - A strong, random string (at least 32 characters) used to secure sessions
- `CLOUDFLARE_API_KEY` - Valid API key for Cloudflare streaming services

**Recommended:**
- `CORS_ORIGIN` - Comma-separated list of allowed origins for CORS
- `RATE_LIMIT_MAX` - Maximum number of requests in rate limit window (recommended: 100)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds (recommended: 15 minutes = 900000)
- `SECURE_COOKIES` - Set to "true" to enable secure cookies
- `COOKIE_MAX_AGE` - Session cookie max age in milliseconds (default: 30 days)

### Security Considerations

1. **HTTP Security Headers:**
   - The application automatically applies security headers in production mode
   - Includes CSP, XSS Protection, HSTS, and other security headers

2. **Rate Limiting:**
   - Rate limiting is enabled in production to prevent abuse
   - Configure with `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_MS`

3. **CORS Protection:**
   - Set `CORS_ORIGIN` to restrict which domains can access your API
   - In production, wildcard (*) origins are not allowed

4. **Session Security:**
   - Use a strong, random `SESSION_SECRET`
   - Enable `SECURE_COOKIES` when using HTTPS
   - Review session store implementation for scalability

### Performance Considerations

1. **Client-side Build:**
   - Run `npm run build` to create optimized static files
   - Static files are served from the `client/dist` directory

2. **Memory Management:**
   - In a memory-constrained environment, consider using a session store other than memory
   - Configure connection pooling for database connections

## Deployment Steps

1. **Run Production Check:**
   ```bash
   tsx server/production-check.ts
   ```
   This will verify that all production requirements are met.

2. **Build for Production:**
   ```bash
   npm run build
   ```
   This will create optimized builds of both client and server code.

3. **Start the Production Server:**
   ```bash
   NODE_ENV=production node dist/index.js
   ```

## Monitoring and Maintenance

1. **Health Checks:**
   - Use the `/api/health` endpoint to monitor application health
   - The health check verifies database connectivity and services status

2. **Error Logging:**
   - In production, errors are logged with less detail for security
   - Consider implementing an external logging service for persistence

3. **Performance Monitoring:**
   - Monitor server resource usage (CPU, memory, disk)
   - Track client-side performance metrics
   - Set up alerts for abnormal patterns

## Scaling Considerations

1. **Horizontal Scaling:**
   - Ensure session state is shared across instances
   - Use a centralized database for session storage
   - Implement proper WebSocket load balancing

2. **Database Scaling:**
   - Implement read replicas for heavy read workloads
   - Consider database sharding for large datasets

3. **Media Streaming:**
   - Utilize Cloudflare for efficient media streaming and delivery
   - Consider regional edge caching for global deployments

## Troubleshooting

### Common Issues:

1. **Cloudflare API Connection Failures:**
   - Verify API key is valid and has appropriate permissions
   - Check for network connectivity issues to Cloudflare API

2. **Session Management Issues:**
   - Ensure session secret is consistent across deployments
   - Verify session store configuration

3. **WebSocket Connection Problems:**
   - Check WebSocket path configuration
   - Verify proxy settings if behind reverse proxy

## Support and Documentation

For additional assistance, refer to:
- Cloudflare Streaming API documentation
- Express.js production best practices
- React Query production guidelines