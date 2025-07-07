#!/bin/bash

# Get session token from logged in user
SESSION_TOKEN=$(curl -s localhost:5000/api/auth/me -H "Cookie: sessionToken=demo-session-123" | jq -r '.id' 2>/dev/null)

if [ -z "$SESSION_TOKEN" ]; then
  echo "⚠️ No active session found. Using demo session..."
  # Login as demo user to get session
  RESPONSE=$(curl -s -X POST localhost:5000/api/auth/demo-login \
    -H "Content-Type: application/json" \
    -d '{"email": "demo@titletesterpro.com"}')
  
  SESSION_TOKEN=$(echo $RESPONSE | jq -r '.sessionToken' 2>/dev/null)
fi

echo "🔄 Testing Edit Campaign Functionality"
echo "=====================================\n"

# Get list of tests
echo "📊 Getting active tests..."
TESTS=$(curl -s localhost:5000/api/tests \
  -H "Cookie: sessionToken=$SESSION_TOKEN")

TEST_ID=$(echo $TESTS | jq -r '.[0].id' 2>/dev/null)
CURRENT_INTERVAL=$(echo $TESTS | jq -r '.[0].rotationIntervalMinutes' 2>/dev/null)

if [ ! -z "$TEST_ID" ] && [ "$TEST_ID" != "null" ]; then
  echo "✅ Found test: $TEST_ID"
  echo "📊 Current interval: $CURRENT_INTERVAL minutes"
  
  # Update the test
  NEW_INTERVAL=30
  echo "\n🔄 Updating test configuration..."
  echo "  - New interval: $NEW_INTERVAL minutes"
  echo "  - New titles: Updated Title 1, Updated Title 2, New Title 3"
  
  UPDATE_RESPONSE=$(curl -s -X PUT "localhost:5000/api/tests/$TEST_ID/config" \
    -H "Content-Type: application/json" \
    -H "Cookie: sessionToken=$SESSION_TOKEN" \
    -d '{
      "rotationIntervalMinutes": '$NEW_INTERVAL',
      "titles": ["Updated Title 1", "Updated Title 2", "New Title 3"]
    }')
  
  echo "\n📡 API Response:"
  echo "$UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$UPDATE_RESPONSE"
else
  echo "❌ No active tests found"
fi

