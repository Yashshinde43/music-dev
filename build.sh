#!/bin/bash

# Production Build Script for JukeStream
echo "🚀 Building JukeStream for production..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Build backend
echo "⚙️ Building backend..."
npm run build:server

echo "✅ Build complete!"
echo "📁 Output directory: ./dist"
echo "�� Ready to deploy!"
