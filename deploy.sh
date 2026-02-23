#!/bin/bash
set -e

PROJECT_DIR="/root/projects/bili-docs-v2"
LOG_DIR="/tmp"
BUILD_LOG="$LOG_DIR/bili-build.log"
SERVE_LOG="$LOG_DIR/bili-serve.log"
PORT=3000

cd "$PROJECT_DIR"

echo "[$(date '+%H:%M:%S')] 🔨 Stopping old server..."
pkill -f 'next-server.*bili-docs' 2>/dev/null || true
pkill -f 'pnpm start' 2>/dev/null || true
sleep 1
rm -f .next/lock

echo "[$(date '+%H:%M:%S')] 📦 Building..."
pnpm build > "$BUILD_LOG" 2>&1
if [ $? -ne 0 ]; then
  echo "[$(date '+%H:%M:%S')] ❌ Build failed! Check $BUILD_LOG"
  tail -20 "$BUILD_LOG"
  exit 1
fi

echo "[$(date '+%H:%M:%S')] ✅ Build OK"

echo "[$(date '+%H:%M:%S')] 🚀 Starting server on port $PORT..."
nohup pnpm start > "$SERVE_LOG" 2>&1 &
SERVER_PID=$!
sleep 3

# Health check
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:$PORT/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date '+%H:%M:%S')] ✅ Server running (PID: $SERVER_PID, HTTP $HTTP_CODE)"
  echo "[$(date '+%H:%M:%S')] 🌐 http://bili.sukisq.me/"
else
  echo "[$(date '+%H:%M:%S')] ⚠️  Server started but health check returned HTTP $HTTP_CODE"
  tail -10 "$SERVE_LOG"
fi
