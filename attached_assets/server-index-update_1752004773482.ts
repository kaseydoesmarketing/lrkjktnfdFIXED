// server/index.ts - Updated with all services
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';

// Load environment variables
dotenv.config();

// Import services
import { schedulerService } from './schedulerService';
import { sessionCleanupJob } from './jobs/sessionCleanup';
import { setupRoutes } from './routes';

// Import route handlers
import authSupabaseRoutes from './routes/auth-supabase';
import stripeWebhookRoutes from './routes/stripe-webhook';

const app = express();
const server = createServer(app);

// IMPORTANT: Stripe webhook must be before body parser
app.use('/api/stripe/webhook', stripeWebhookRoutes);

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://titletesterpro.com' 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Auth routes
app.use(authSupabaseRoutes);

// API routes
setupRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist', 'index.html'));
  });
}

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start background services
const startServices = async () => {
  try {
    // Start scheduler
    await schedulerService.initialize();
    console.log('✅ Scheduler service started');

    // Start session cleanup
    sessionCleanupJob.start();
    console.log('✅ Session cleanup service started');

  } catch (error) {
    console.error('❌ Failed to start services:', error);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Stop services
  schedulerService.stop();
  sessionCleanupJob.stop();
  
  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Start background services
  await startServices();
});