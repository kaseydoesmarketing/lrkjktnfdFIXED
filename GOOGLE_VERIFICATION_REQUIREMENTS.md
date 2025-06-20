# Google OAuth Verification Requirements

## Scope Justifications for TitleTesterPro

### youtube.readonly
**Purpose**: Read YouTube channel data and video information
**Justification**: Required to retrieve user's video list, video metadata, and channel information for A/B testing setup. Users need to select which videos to test titles on.

### youtube
**Purpose**: Manage YouTube account and video metadata
**Justification**: Essential for updating video titles during A/B tests. This is the core functionality - automatically rotating between different title variants to test performance.

### youtube.force-ssl
**Purpose**: Secure YouTube operations
**Justification**: Ensures all title updates and API calls are made securely via HTTPS, protecting user data and maintaining YouTube's security standards.

### yt-analytics.readonly
**Purpose**: Access YouTube Analytics data
**Justification**: Critical for measuring A/B test performance. Need to track views, impressions, click-through rates, and watch time to determine which title variants perform better.

### userinfo.email & userinfo.profile
**Purpose**: User identification and authentication
**Justification**: Standard OAuth scopes for user authentication and account management within the application.

## Demo Video Requirements

### Key Features to Demonstrate:
1. **User Authentication**: Show Google OAuth login process
2. **Video Selection**: Display how users select videos for title testing
3. **Title Variant Setup**: Show creation of multiple title variants for A/B testing
4. **Automated Rotation**: Demonstrate title rotation functionality
5. **Analytics Dashboard**: Show performance metrics and test results
6. **Winner Selection**: Display how users identify best-performing titles

### Script Outline:
- Introduction: "TitleTesterPro helps YouTubers optimize video titles through automated A/B testing"
- Authentication: "Users sign in with Google to access their YouTube account securely"
- Test Setup: "Select a video and create multiple title variants to test"
- Automation: "The system automatically rotates titles at set intervals"
- Analytics: "Real-time performance data helps identify winning titles"
- Results: "Users can see which titles drive the most engagement"

## Additional Information for Verification

### App Details:
- **App Name**: TitleTesterPro
- **Purpose**: YouTube title A/B testing platform for content creators
- **Target Users**: YouTubers and content creators looking to optimize video performance
- **Data Usage**: Only accesses user's own YouTube channel data for optimization purposes
- **Data Storage**: Minimal storage of test configurations and performance metrics
- **Privacy**: No sharing of user data with third parties

### Technical Implementation:
- Built with Node.js/Express backend and React frontend
- Secure token handling with encryption
- Session-based authentication
- Automated scheduling system for title rotation
- Real-time analytics integration

This application helps content creators make data-driven decisions about their video titles, potentially increasing their viewership and engagement.