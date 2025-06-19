# TitleTesterPro - YouTube A/B Testing Platform

## Overview

TitleTesterPro is a full-stack web application designed to help YouTubers optimize their video titles through automated A/B testing. The platform allows users to test multiple title variants, automatically rotate titles based on configurable intervals, and analyze performance metrics to determine the best-performing titles.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Styling**: Tailwind CSS with Shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Data Visualization**: Recharts for charts and analytics
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript for type safety
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom session-based auth with Google OAuth integration
- **Scheduler**: Node.js cron jobs for automated title rotation and data polling
- **API Integration**: YouTube Data API v3 for video analytics

### Database Design
- **Users**: Store user profiles and OAuth tokens (encrypted)
- **Tests**: Track A/B test configurations and status
- **Titles**: Store title variants for each test
- **Analytics**: Historical performance data for each title
- **Sessions**: User session management

## Key Components

### Authentication System
- Google OAuth 2.0 integration for YouTube API access
- Session-based authentication with encrypted token storage
- Automatic token refresh handling
- Protected routes requiring authentication

### Test Management
- Create A/B tests with multiple title variants
- Configure rotation intervals (minutes between title changes)
- Choose success metrics (CTR or Average View Duration)
- Pause, resume, and complete tests

### Automated Scheduler
- Background job system using Node.js cron
- Automatic title rotation based on configured intervals
- Periodic analytics polling from YouTube API
- Data aggregation and summary generation

### Analytics Dashboard
- Real-time performance metrics visualization
- Comparative analysis between title variants
- Export functionality for test results (CSV)
- Winner detection based on statistical significance

## Data Flow

1. **User Authentication**: Users authenticate via Google OAuth to access YouTube API
2. **Test Creation**: Users create A/B tests by providing video URL and title variants
3. **Title Rotation**: Scheduler automatically rotates video titles at configured intervals
4. **Data Collection**: System polls YouTube API for performance metrics (views, impressions, CTR, AVD)
5. **Analysis**: Analytics engine processes data to identify winning titles
6. **Reporting**: Users view results through interactive dashboards and export data

## External Dependencies

### Google APIs
- **YouTube Data API v3**: For retrieving video analytics and updating video metadata
- **Google OAuth 2.0**: For user authentication and API authorization

### Database
- **PostgreSQL**: Primary data storage with connection pooling via Neon
- **Drizzle ORM**: Type-safe database operations and schema management

### Infrastructure
- **Replit**: Development and deployment platform
- **Node.js Scheduler**: Built-in cron functionality for background tasks

## Deployment Strategy

### Development Environment
- Uses Vite dev server for hot module replacement
- PostgreSQL database provisioned through Replit
- Environment variables for API keys and secrets
- Development mode with debug logging

### Production Build
- Vite builds optimized static assets
- Express server serves both API and static files
- Database migrations managed through Drizzle Kit
- Session storage using PostgreSQL with connect-pg-simple

### Environment Configuration
- Database URL for PostgreSQL connection
- Google OAuth credentials for API access
- YouTube API key for data retrieval
- Encryption keys for token security
- Session secrets for authentication

## Recent Changes
- June 18, 2025: Complete TitleTesterPro implementation with full authentication system
- Fixed authentication flow with proper session token handling in API requests
- Enhanced login page with YouTube branding and feature highlights
- Implemented automated title rotation and analytics polling system
- Added comprehensive dashboard with stats cards and test management
- Prepared application for private deployment with production YouTube API integration
- June 19, 2025: Configured Google OAuth integration with real YouTube API credentials
- Added professional landing page with branding assets and conversion optimization
- Implemented dual authentication: Google OAuth for production, demo mode for testing
- Resolved OAuth client ID configuration issues and redirect URI mismatches
- Diagnosed OAuth consent screen setup requirement for authentication to function
- Identified missing OAuth scopes configuration as root cause of authentication issues
- Discovered Client ID mismatch between Google Cloud Console and environment configuration
- Corrected Client ID to match Google Cloud Console: 618794070994-n4n3b75oktui4efj7671il3jvef23peu.apps.googleusercontent.com
- Verified OAuth consent screen configuration with scopes and test user properly added
- Fixed redirect URI configuration to include required /google suffix for OAuth callback
- June 19, 2025: Identified OAuth consent screen verification requirement as blocking authentication
- Google Cloud Console OAuth app requires verification or publishing to allow external users
- Added enhanced debugging to track OAuth callback parameters and flow
- Created Privacy Policy and Terms of Service pages based on provided legal documents
- Added routing for /privacy and /terms pages with proper navigation
- Integrated privacy and terms links into login page footer
- Diagnosed and fixed 404 routing issues for privacy and terms pages
- Changed routing syntax to use component functions for proper rendering
- Added debug logging to track component rendering and routing behavior
- Fixed OAuth login database error by changing expires_at field from integer to bigint for timestamp handling
- Resolved "value out of range for type integer" error that prevented successful OAuth authentication
- June 19, 2025: Identified Google OAuth consent screen verification requirement for YouTube scopes
- OAuth requires scope justifications and demo video for production use due to YouTube API security requirements
- Created detailed setup guide for completing Google Cloud Console OAuth verification process
- June 19, 2025: Complete UI overhaul from dark to light theme with gamification elements
- Redesigned dashboard with Apple-inspired clean aesthetic and professional white theme
- Added momentum scoring system, achievement badges, and challenge-based language
- Enhanced stats cards with progress indicators and performance visualization
- Transformed test management into gamified "challenges" with streak tracking
- Updated landing page with modern gradient text and gamification preview
- Improved login page with feature highlights and professional card design
- June 19, 2025: Fixed Google OAuth verification issues for production deployment
- Updated OAuth redirect URIs to support both development and production domains
- Configured dynamic URL handling for proper domain resolution
- Created deployment guide for resolving Google verification requirements
- Prepared application for production deployment with responsive URLs
- Added Google Search Console domain verification setup for OAuth compliance
- Created verification file and meta tag placeholders for domain ownership proof
- Updated guides with complete domain verification process and requirements

## Deployment Configuration
- Application ready for Replit private deployment
- Production build configured with Vite optimization
- PostgreSQL database with connection pooling
- Session-based authentication system
- Environment variables configured for API keys and secrets

## Changelog
- June 18, 2025: Initial setup and complete application build
- June 18, 2025: Application prepared for private deployment

## User Preferences

Preferred communication style: Simple, everyday language.