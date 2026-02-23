#!/bin/bash
set -e

PROJECT_DIR="/root/projects/bili-docs-v2"
BUILD_LOG="/tmp/bili-build.log"

cd "$PROJECT_DIR"

echo "[$(date '+%H:%M:%S')] Stopping server..."
systemctl stop bili-docs 2>/dev/null || pkill -f 'next-server.*bili' 2>/dev/null || true
sleep 1
rm -f .next/lock

echo "[$(date '+%H:%M:%S')] Building..."
pnpm build > "$BUILD_LOG" 2>&1
if [ $? -ne 0 ]; then
  echo "[$(date '+%H:%M:%S')] Build failed!"
  tail -20 "$BUILD_LOG"
  exit 1
fi
echo "[$(date '+%H:%M:%S')] Build OK"

echo "[$(date '+%H:%M:%S')] Starting server..."
systemctl start bili-docs
sleep 4

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date '+%H:%M:%S')] Server running (HTTP $HTTP_CODE)"
  echo "[$(date '+%H:%M:%S')] http://bili.sukisq.me/"
else
  echo "[$(date '+%H:%M:%S')] Health check: HTTP $HTTP_CODE"
  tail -10 /tmp/bili-serve.log
fi
