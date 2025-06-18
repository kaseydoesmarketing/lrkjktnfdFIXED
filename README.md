# TitleTesterPro

A YouTube title A/B testing platform that helps YouTubers optimize their video titles through automated testing and analytics.

## Features

- **Automated Title Testing**: Set up A/B tests with multiple title variants
- **Smart Rotation**: Automatic title rotation based on configurable intervals
- **Real-time Analytics**: Track CTR, views, impressions, and average view duration
- **Performance Visualization**: Charts and graphs to compare title performance
- **Test Management**: Pause, resume, and monitor active tests
- **Winner Detection**: Automatic identification of best-performing titles
- **Data Export**: Export test results to CSV for further analysis

## Tech Stack

### Frontend
- React with TypeScript
- Tailwind CSS for styling
- Shadcn/ui component library
- Recharts for data visualization
- TanStack Query for state management

### Backend
- Express.js with TypeScript
- PostgreSQL with Drizzle ORM
- Google OAuth for YouTube API access
- Node.js scheduler for automated tasks

## Setup Instructions

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Google Cloud Console project with YouTube Data API enabled

### 1. Clone and Install
```bash
git clone <repository-url>
cd titletesterpro
npm install
