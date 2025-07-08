#!/bin/bash
# cleanup-dashboards.sh - Remove duplicate dashboard components

echo "🧹 Cleaning up duplicate dashboard files..."

# Navigate to pages directory
cd client/src/pages

# Keep dashboard-clean.tsx as the main Dashboard.tsx
if [ -f "dashboard-clean.tsx" ]; then
  echo "✅ Renaming dashboard-clean.tsx to Dashboard.tsx"
  mv dashboard-clean.tsx Dashboard.tsx
fi

# Remove all duplicate dashboard files
echo "🗑️ Removing duplicate dashboard files..."
rm -f dashboard-futuristic.tsx
rm -f dashboard-improved.tsx
rm -f dashboard-simple.tsx
rm -f dashboard-bulletproof.tsx
rm -f dashboard-video-complete.tsx
rm -f DashboardV2.tsx
rm -f dashboard-old.tsx

echo "✅ Dashboard cleanup complete"

# Update imports in other files
echo "📝 Updating imports..."

# Fix imports in all TypeScript files
find .. -name "*.tsx" -o -name "*.ts" | while read file; do
  # Skip node_modules
  if [[ $file == *"node_modules"* ]]; then
    continue
  fi
  
  # Replace various dashboard imports with Dashboard
  sed -i '' 's/from.*dashboard-clean.*/from ".\/Dashboard"/g' "$file" 2>/dev/null || \
  sed -i 's/from.*dashboard-clean.*/from ".\/Dashboard"/g' "$file" 2>/dev/null
  
  sed -i '' 's/from.*dashboard-futuristic.*/from ".\/Dashboard"/g' "$file" 2>/dev/null || \
  sed -i 's/from.*dashboard-futuristic.*/from ".\/Dashboard"/g' "$file" 2>/dev/null
  
  sed -i '' 's/from.*dashboard-improved.*/from ".\/Dashboard"/g' "$file" 2>/dev/null || \
  sed -i 's/from.*dashboard-improved.*/from ".\/Dashboard"/g' "$file" 2>/dev/null
done

echo "✅ Import updates complete"

# Verify Dashboard.tsx exists
if [ -f "Dashboard.tsx" ]; then
  echo "✅ Dashboard.tsx exists and is ready"
else
  echo "❌ Error: Dashboard.tsx not found!"
  exit 1
fi

echo "🎉 Dashboard consolidation complete!"