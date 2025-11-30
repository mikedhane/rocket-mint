#!/bin/bash

# Auto-increment version and deploy to Firebase

echo "🚀 Starting deployment process..."

# Increment patch version in package.json
echo "📝 Incrementing version..."
npm version patch --no-git-tag-version

# Get the new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo "✨ New version: $NEW_VERSION"

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete! Version $NEW_VERSION is now live."
