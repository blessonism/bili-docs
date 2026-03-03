#!/bin/bash

PROJECT_DIR="/root/projects/bili-docs-v2"
BUILD_LOG="/tmp/bili-build.log"
TG_TOKEN=$(cat /root/.dagu/secrets/tg_token 2>/dev/null || echo "")
CHAT_ID="-1003679244942"
TOPIC_ID="520"
DEPLOY_STATUS="unknown"
HTTP_CODE="000"

LOCK_FILE="/tmp/bili-docs-build.lock"
BUILD_WAIT_TIMEOUT=900

acquire_build_lock() {
  exec 9>"$LOCK_FILE"
  if ! flock -n 9; then
    echo "[$(date '+%H:%M:%S')] Another deploy/build is running, waiting for lock..."
    _notify "⏳ 检测到并发构建，等待锁释放后继续部署"
    flock 9
  fi
}

wait_for_next_build_idle() {
  local start_ts=$(date +%s)
  while pgrep -f "next/dist/bin/next build" >/dev/null 2>&1; do
    local now_ts=$(date +%s)
    local elapsed=$((now_ts - start_ts))
    if [ $elapsed -ge $BUILD_WAIT_TIMEOUT ]; then
      echo "[$(date '+%H:%M:%S')] Existing next build did not finish within ${BUILD_WAIT_TIMEOUT}s"
      return 1
    fi
    echo "[$(date '+%H:%M:%S')] Waiting existing next build to finish... (${elapsed}s)"
    sleep 5
  done
  return 0
}

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

acquire_build_lock
cd "$PROJECT_DIR"

if ! wait_for_next_build_idle; then
  _notify "❌ B站文档 Deploy 失败\n原因: 存在长时间未结束的并发 next build（>${BUILD_WAIT_TIMEOUT}s）"
  exit 1
fi

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
