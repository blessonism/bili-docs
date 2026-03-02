#!/bin/bash

PROJECT_DIR="/root/projects/bili-docs-v2"
BUILD_LOG="/tmp/bili-build.log"
TG_TOKEN=$(cat /root/.dagu/secrets/tg_token 2>/dev/null || echo "")
CHAT_ID="-1003679244942"
TOPIC_ID="520"
DEPLOY_STATUS="unknown"
HTTP_CODE="000"

_notify() {
  local msg="$1"
  if [ -n "$TG_TOKEN" ]; then
    curl -s -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
      --data-urlencode "chat_id=${CHAT_ID}" \
      --data-urlencode "message_thread_id=${TOPIC_ID}" \
      --data-urlencode "text=${msg}" > /dev/null
  fi
}

_on_exit() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    TAIL=$(tail -5 "$BUILD_LOG" 2>/dev/null | head -c 300)
    _notify "❌ B站文档 Deploy 失败
Build 退出码: ${exit_code}
${TAIL}"
  fi
}

trap _on_exit EXIT
set -e

cd "$PROJECT_DIR"

echo "[$(date '%H:%M:%S')] Stopping server..."
systemctl stop bili-docs 2>/dev/null || pkill -f 'next-server.*bili' 2>/dev/null || true
sleep 1
rm -f .next/lock

echo "[$(date '%H:%M:%S')] Building..."
pnpm build > "$BUILD_LOG" 2>&1
echo "[$(date '%H:%M:%S')] Build OK"

echo "[$(date '%H:%M:%S')] Starting server..."
systemctl start bili-docs
sleep 4

HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  echo "[$(date '%H:%M:%S')] Server running (HTTP $HTTP_CODE)"
  echo "[$(date '%H:%M:%S')] http://bili.sukisq.me/"
  _notify "✅ B站文档 Deploy 完成
Build & 重启成功
http://bili.sukisq.me/"
else
  echo "[$(date '%H:%M:%S')] Health check failed: HTTP $HTTP_CODE"
  tail -10 /tmp/bili-serve.log
  TAIL=$(tail -5 "$BUILD_LOG" 2>/dev/null | head -c 300)
  _notify "❌ B站文档 Deploy 失败
Health check HTTP: ${HTTP_CODE}
${TAIL}"
fi
