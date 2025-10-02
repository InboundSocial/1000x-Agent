#!/usr/bin/env bash
set -euo pipefail

echo "🔐 Doppler Setup for 1000x-Agent"
echo "=================================="
echo ""

# Check if doppler is installed
if ! command -v doppler >/dev/null 2>&1; then
  echo "❌ Doppler CLI not found. Please install it first."
  exit 1
fi

# Check if already authenticated
if doppler me >/dev/null 2>&1; then
  echo "✅ Already logged in to Doppler"
  doppler me
else
  echo "🔑 Logging in to Doppler..."
  echo "   (This will open your browser)"
  echo ""
  doppler login
fi

echo ""
echo "🔗 Linking project to 1000x-agent/dev..."
doppler setup --project 1000x-agent --config dev --no-interactive

echo ""
echo "✅ Setup complete! Testing secrets access..."
NODE_ENV=$(doppler secrets get NODE_ENV --plain 2>/dev/null || echo "not found")
if [ "$NODE_ENV" != "not found" ]; then
  echo "✅ Secrets accessible! NODE_ENV=$NODE_ENV"
  echo ""
  echo "🚀 You're ready to run:"
  echo "   npm install"
  echo "   npm run dev"
else
  echo "⚠️  Could not access secrets. Please check your Doppler permissions."
  exit 1
fi

