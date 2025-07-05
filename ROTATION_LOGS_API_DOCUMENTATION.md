# Title Rotation Logs API Documentation

## Overview
The Title Rotation Logs API provides comprehensive tracking and monitoring of YouTube title A/B tests, including real-time rotation status, historical performance data, and detailed analytics.

## Endpoints

### 1. Rotation History
**GET** `/api/tests/:testId/rotation-history`

Returns complete rotation history with timestamps and performance metrics.

**Response:**
```json
[
  {
    "rotationNumber": 1,
    "titleId": "uuid",
    "title": "First Title Variant",
    "startedAt": "2025-01-01T10:00:00Z",
    "endedAt": "2025-01-01T11:00:00Z",
    "durationMinutes": 60,
    "youtubeUpdateSuccessful": true,
    "performance": {
      "views": 1182,
      "ctr": 7.4,
      "impressions": 15974
    }
  }
]
```

### 2. Current Rotation Status
**GET** `/api/tests/:testId/current-rotation`

Real-time status of the current rotation.

**Response:**
```json
{
  "currentTitle": "Active title text",
  "timeUntilNextRotation": 45,
  "rotationNumber": 3,
  "totalTitles": 5,
  "testStatus": "active"
}
```

### 3. Comprehensive Test Logs
**GET** `/api/tests/:testId/logs`

Detailed logs with full rotation history and aggregated performance data.

**Response:**
```json
{
  "test": {
    "id": "uuid",
    "videoId": "youtube-video-id",
    "status": "active",
    "rotationIntervalMinutes": 60,
    "winnerMetric": "ctr",
    "startDate": "2025-01-01T00:00:00Z",
    "endDate": "2025-01-08T00:00:00Z"
  },
  "titles": [
    {
      "id": "uuid",
      "text": "Title text",
      "order": 0
    }
  ],
  "rotationHistory": [
    {
      "rotationNumber": 1,
      "title": "First Title",
      "startedAt": "2025-01-01T10:00:00Z",
      "endedAt": "2025-01-01T11:00:00Z",
      "durationMinutes": 60,
      "youtubeUpdateSuccessful": true,
      "performance": {
        "views": 1182,
        "ctr": 7.4,
        "impressions": 15974,
        "averageViewDuration": 240
      }
    }
  ],
  "summary": {
    "totalRotations": 15,
    "successfulUpdates": 14,
    "failedUpdates": 1,
    "totalTestDuration": 720
  }
}
```

### 4. Individual Title Performance
**GET** `/api/titles/:titleId/performance`

Performance history for a specific title variant.

**Response:**
```json
{
  "titleId": "uuid",
  "titleText": "Title variant text",
  "order": 0,
  "activatedAt": "2025-01-01T10:00:00Z",
  "performanceHistory": [
    {
      "timestamp": "2025-01-01T10:30:00Z",
      "views": 500,
      "impressions": 6000,
      "ctr": 8.3,
      "averageViewDuration": 245
    }
  ]
}
```

## Usage in React

```javascript
// Get rotation logs
const { data: rotationLogs } = useQuery({
  queryKey: [`/api/tests/${testId}/logs`],
  refetchInterval: 60000 // Update every minute
});

// Show real-time rotation status  
const { data: currentRotation } = useQuery({
  queryKey: [`/api/tests/${testId}/current-rotation`],
  refetchInterval: 30000 // Update every 30 seconds
});
```

## Features

- **Real-time Updates**: Rotation status updates every 30 seconds
- **Performance Metrics**: Views, CTR, impressions tracked per rotation
- **Historical Data**: Complete rotation history with timestamps
- **Aggregated Analytics**: Summary statistics for entire test duration
- **Individual Title Tracking**: Performance data for each title variant

## Implementation Details

- Rotation history is built from title activation timestamps
- Performance metrics are aggregated from analytics polls during each rotation period
- Current rotation status calculates time remaining based on test configuration
- All endpoints require authentication and verify test ownership