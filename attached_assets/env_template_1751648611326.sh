# TitleTesterPro Enhanced - Environment Variables
# Copy this file to .env and fill in your actual values

# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=https://ttro3.replit.app

# Google OAuth Configuration
GOOGLE_CLIENT_ID=618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# YouTube API Configuration
YOUTUBE_API_KEY=AIzaSyDuyrmfMpeYZrFnAMwSodGQB56A57JmzHCQ

# Session Security
SESSION_SECRET=85DvMXCnQEUNuGR+rRZ6JxPebaC0deT2ftCQ09gK/f/TFQyDyCdolY9z7F46LK2zICIZW5MFrSLvUzztfDE1KA==

# Database Configuration (PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:npg_o2PW5ruEBHRL@ep-silent-limit-a5yjg6qj.us-east-2.aws.neon.tech/neondb?sslmode=require

# Supabase Configuration
REACT_APP_SUPABASE_URL=https://dnezcshuzdkhzrcjfwaq.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZXpjc2h1emRraHpyY2pmd2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1MDI3NzMsImV4cCI6MjA2NzA3ODc3M30.8jwPTaxqkfIj3DmJj5rPxato5g00zBXvh1n7WDrPlSs
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# AI Integration (Optional - for enhanced title suggestions)
ANTHROPIC_API_KEY=your_anthropic_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Security & Encryption
ENCRYPTION_KEY=my-super-secure-encryption-key-2025-titletesterpro
JWT_SECRET=your_jwt_secret_here

# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Analytics & Monitoring (Optional)
GOOGLE_ANALYTICS_ID=your_ga_tracking_id
SENTRY_DSN=your_sentry_dsn_here

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload (Optional)
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Redis Configuration (Optional - for session storage)
REDIS_URL=redis://localhost:6379

# Development Settings
DEBUG=true
LOG_LEVEL=info

# Production Settings (set these for production deployment)
# NODE_ENV=production
# DEBUG=false
# SECURE_COOKIES=true
# TRUST_PROXY=true

# Webhook URLs (Optional - for real-time updates)
WEBHOOK_SECRET=your_webhook_secret_here
YOUTUBE_WEBHOOK_URL=https://your-domain.com/api/webhooks/youtube

# Feature Flags
ENABLE_AI_SUGGESTIONS=true
ENABLE_ADVANCED_ANALYTICS=true
ENABLE_TEAM_COLLABORATION=false
ENABLE_WHITE_LABEL=false

# Backup Configuration
BACKUP_FREQUENCY=daily
BACKUP_RETENTION_DAYS=30

# Performance Settings
DB_CONNECTION_POOL_MIN=2
DB_CONNECTION_POOL_MAX=10
CACHE_TTL=3600

# Notification Settings
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_SLACK_NOTIFICATIONS=false
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Compliance & Privacy
GDPR_ENABLED=true
DATA_RETENTION_DAYS=365
COOKIE_CONSENT_REQUIRED=true

# API Versioning
API_VERSION=v1
API_BASE_PATH=/api

# CORS Settings
CORS_ORIGINS=https://ttro3.replit.app,https://titletesterpro.com,http://localhost:3000
CORS_CREDENTIALS=true

# Health Check
HEALTH_CHECK_INTERVAL=30000
HEALTH_CHECK_TIMEOUT=5000

# Deployment Information
BUILD_VERSION=2.0.0
DEPLOYMENT_DATE=2025-01-01
LAST_UPDATED=2025-07-04