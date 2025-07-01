// Using Claude AI to analyze the optimal dashboard architecture
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

async function analyzeDashboardArchitecture() {
  const prompt = `
  You are a senior React/TypeScript architect analyzing a critical production bug in a YouTube A/B testing platform.

  CONTEXT:
  - Dashboard briefly appears then disappears into white screen
  - OAuth authentication and video data fetching affected
  - Issue persists even with simplified inline styles
  - Production site: https://titletesterpro.com/dashboard
  
  CURRENT ARCHITECTURE:
  - React 18 + TypeScript
  - TanStack Query for state management  
  - Wouter for routing
  - Express.js backend with PostgreSQL
  - Session-based auth with OAuth tokens
  - Multiple authentication token sources (localStorage + cookies)

  REQUIREMENTS:
  Design the most robust, bulletproof dashboard architecture that:
  1. Eliminates authentication race conditions
  2. Handles token management flawlessly
  3. Provides stable rendering without disappearing
  4. Works across browser refreshes and sessions
  5. Handles network failures gracefully

  Provide:
  1. Root cause analysis of the disappearing dashboard
  2. Optimal authentication flow design
  3. Component lifecycle strategy
  4. Error handling patterns
  5. Step-by-step implementation plan
  `;

  try {
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL_STR,
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    return response.content[0].text;
  } catch (error) {
    console.error('Claude analysis failed:', error);
    return null;
  }
}

export { analyzeDashboardArchitecture };