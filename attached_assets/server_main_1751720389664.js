// ========================================
// TITLETESTERPRO MAIN SERVER
// ========================================

import 'dotenv/config';
import app from './api-routes.js';
import { configureStripeForReplit } from './stripe-payment-integration.js';

// ========================================
// ENVIRONMENT VALIDATION
// ========================================

const requiredEnvVars = [
  'DATABASE_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'OAUTH_REDIRECT_URI'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please add these to your Replit Secrets or .env file');
  process.exit(1);
}

// ========================================
// REPLIT-SPECIFIC CONFIGURATION
// ========================================

if (process.env.REPL_ID || process.env.REPLIT_DOMAIN) {
  console.log('🔧 Detected Replit environment, configuring...');
  
  // Set Replit-specific environment variables
  if (!process.env.PORT) {
    process.env.PORT = '3000';
  }
  
  // Configure Stripe for Replit
  configureStripeForReplit();
  
  console.log('✅ Replit configuration complete');
}

// ========================================
// STARTUP SEQUENCE
// ========================================

console.log('🚀 Starting TitleTesterPro Server...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔌 Port: ${process.env.PORT || 3001}`);

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, shutting down gracefully');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

console.log('✅ TitleTesterPro Server ready for connections!');