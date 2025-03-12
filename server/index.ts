import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { securityHeaders, rateLimiter, corsHandler } from "./middleware/security";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";

// Validate critical environment variables in production
function validateEnvironment() {
  if (process.env.NODE_ENV !== 'production') return;
  
  const requiredVars = [
    'SESSION_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('CRITICAL ERROR: Missing required environment variables:');
    missingVars.forEach(varName => console.error(`- ${varName}`));
    console.error('Application may not function correctly without these variables.');
  }
}

// Check environment variables
validateEnvironment();

const app = express();

// CORS should be applied first
app.use(corsHandler);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply security middleware in production
if (process.env.NODE_ENV === 'production') {
  app.use(securityHeaders);
  app.use(rateLimiter);
  console.log('Production security middleware enabled');
} else {
  console.log('Running in development mode - full security middleware disabled');
}

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // API routes that weren't matched (404 handler)
  app.use('/api/*', notFoundHandler);
  
  // Global error handler (must be the last middleware)
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
