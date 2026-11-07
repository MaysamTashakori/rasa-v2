#!/bin/bash
# deploy.sh — استقرار رسا ۲ روی سرور (کنار نسل ۱، پورت ۸۷۴۱)
set -e
PORT="${RASA2_PORT:-8741}"
NAME="${RASA2_NAME:-rasa-2}"
DATA="${RASA2_DATA:-/opt/rasa-v2-data}"
ENV_FILE="${RASA2_ENV_FILE:-/etc/rasa-v2.env}"

cd "$(dirname "$0")/.."
echo "🚇 deploy $NAME on :$PORT"

git pull --ff-only || echo "⚠️  git pull ناموفق — با کد فعلی ادامه می‌دهیم"

# بیلدِ dist باید قبل از push به صورت محلی انجام شده باشد (dist کامیت می‌شود؛ روی سرور بیلد نمی‌کنیم تا working tree تمیز بماند)

docker rm -f "$NAME" 2>/dev/null || true
docker run -d --name "$NAME" \
  --restart unless-stopped --memory 256m \
  -p "$PORT:8080" \
  --env-file "$ENV_FILE" \
  -e DATA_DIR=/data -e NODE_NO_WARNINGS=1 \
  -v "$PWD:/app:ro" \
  -v "$DATA:/data" \
  -w /app \
  node:24-alpine node server/index.mjs

echo "⏳ health…"
for i in $(seq 1 30); do
  sleep 1
  if curl -sf "http://127.0.0.1:$PORT/api/health" > /dev/null; then
    echo "✅ $NAME healthy on :$PORT"
    exit 0
  fi
done
echo "❌ health-check failed"; docker logs --tail 30 "$NAME"; exit 1
