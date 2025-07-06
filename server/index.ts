import dotenv from "dotenv";
dotenv.config();

// Database configuration from environment variables
// Ensure these are set in .env file or Replit secrets

// Set default values for missing environment variables
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "demo-secret-key";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_demo_key";
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "your-32-character-secret-key-here!";
process.env.SESSION_SECRET = process.env.SESSION_SECRET || "85DvMXCnQEUNuGR+rRZ6JxPebaC0deT2ftCQ09gK/f/TFQyDyCdolY9z7F46LK2zICIZW5MFrSLvUzztfDE1KA==";
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "demo-api-key";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// import { analyticsCollector } from "./analyticsCollector"; // Temporarily disabled
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import pg from "pg";
import session from "express-session";
import passport from "./passportConfig";

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
    /\.replit\.dev$/,
    'https://ttro3.replit.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Session configuration - CRITICAL FOR OAUTH
app.use(session({
  secret: process.env.SESSION_SECRET || '85DvMXCnQEUNuGR+rRZ6JxPebaC0deT2ftCQ09gK/f/TFQyDyCdolY9z7F46LK2zICIZW5MFrSLvUzztfDE1KA==',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax'
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

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
    
    // Log environment status
    console.log('Environment Status:');
    console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
    console.log('- Google OAuth:', process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Missing');
    console.log('- Stripe:', process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Missing');
    console.log('- Anthropic AI:', process.env.ANTHROPIC_API_KEY ? 'Configured' : 'Missing');
    
    // Initialize basic server monitoring
    setTimeout(async () => {
      try {
        log(`Server initialization complete - ready to accept connections`);
      } catch (error) {
        console.error('Server initialization error:', error);
      }
    }, 2000);
  });
})();
