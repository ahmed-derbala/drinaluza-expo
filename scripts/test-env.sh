#!/bin/bash

# Test script to verify environment variable loading

echo "=== Testing Environment Variable Loading ==="
echo ""

# Load .env
export $(grep -v '^#' .env | xargs)

echo "1. Environment variables from .env:"
echo "   EXPO_PUBLIC_BACKEND_URL=$EXPO_PUBLIC_BACKEND_URL"
echo ""

echo "2. Testing app.config.js loading:"
node --no-warnings -e "import('./app.config.js').then(c => {
  console.log('   Backend URL in app config:', c.default.expo.extra.EXPO_PUBLIC_BACKEND_URL);
  console.log('   App version:', c.default.expo.version);
})"
echo ""

echo "3. Testing eas.json exists:"
if [ -f "eas.json" ]; then
  echo "   ✓ eas.json found"
else
  echo "   ✗ eas.json not found"
fi
echo ""

echo "=== All tests completed ==="
