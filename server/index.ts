import dotenv from "dotenv";
dotenv.config();

// Force Supabase database configuration (override Replit's system env vars)
// Using port 6543 for transaction pooler
process.env.DATABASE_URL = "postgresql://postgres.dnezcshuzdkhzrcjfwaq:Princeandmarley8625!@aws-0-us-east-2.pooler.supabase.com:6543/postgres";
process.env.PGHOST = "aws-0-us-east-2.pooler.supabase.com";
process.env.PGPORT = "6543";
process.env.PGUSER = "postgres.dnezcshuzdkhzrcjfwaq";
process.env.PGPASSWORD = "Princeandmarley8625!";
process.env.PGDATABASE = "postgres";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { analyticsCollector } from "./analyticsCollector";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import pg from "pg";

const app = express();
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Vite dev server
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration - always allow titletesterpro.com
app.use(cors({
  origin: [
    'https://titletesterpro.com',
    'http://localhost:3000',
    'http://localhost:5000',
    /\.replit\.app$/,
    /\.replit\.dev$/
  ],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes only
app.use('/api/', limiter);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit auth attempts
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60
  },
});

app.use('/api/auth/', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

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

  // Centralized error handling middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const requestId = req.headers['x-request-id'] || 'unknown';
    
    // Log error details (excluding sensitive info)
    console.error(`[Error ${requestId}] ${req.method} ${req.path}:`, {
      status,
      message: message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Standardized error response
    const errorResponse: any = {
      error: true,
      message: status === 500 ? 'Internal server error' : message,
      code: err.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString()
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development' && err.stack) {
      errorResponse.stack = err.stack;
    }

    res.status(status).json(errorResponse);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Initialize analytics collection for all active tests
    setTimeout(async () => {
      try {
        await analyticsCollector.initializeAllActiveTests();
        log(`Analytics collector initialized for active tests`);
      } catch (error) {
        console.error('Failed to initialize analytics collector:', error);
      }
    }, 2000); // 2 second delay to ensure database is ready
  });
})();
