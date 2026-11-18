#!/usr/bin/env bash
# Production Cloud Deployment for paywall-worker -> Cloudflare Workers + Extension Repackaging
(
  set -uo pipefail

  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$SCRIPT_DIR" || exit 1

  echo "=================================================================="
  echo " Cloud Deploy: Cloudflare Worker + Production Store Zips (v1.0.0)"
  echo "=================================================================="

  ENV_FILE="paywall-worker/.env"
  if [ ! -f "$ENV_FILE" ]; then
    echo "[!] Файл $ENV_FILE не найден. Создайте его с вашим ключом:"
    echo "    MONETIZE_API_KEY=ваш_ключ_из_monetize_software"
    exit 1
  fi

  API_KEY="$(grep -E '^MONETIZE_API_KEY=' "$ENV_FILE" | head -n1 | cut -d'=' -f2- | tr -d '\r"\x27 ')"
  if [ -z "$API_KEY" ]; then
    echo "[!] В файле $ENV_FILE пустой MONETIZE_API_KEY."
    exit 1
  fi
  echo "[OK] Ключ MONETIZE_API_KEY найден в $ENV_FILE (скрыт)."

  echo "[1/5] Проверка авторизации Cloudflare Wrangler..."
  if ! npx --yes wrangler whoami >/dev/null 2>&1; then
    echo " -> Открываю браузер для входа в бесплатный аккаунт Cloudflare..."
    npx --yes wrangler login || { echo "[!] Не удалось авторизоваться в Cloudflare."; exit 1; }
  fi

  echo "[2/5] Деплой paywall-worker в Cloudflare Workers..."
  DEPLOY_OUT="$(npx --yes wrangler deploy --config paywall-worker/wrangler.toml 2>&1)"
  echo "$DEPLOY_OUT"

  WORKER_URL="$(printf '%s\n' "$DEPLOY_OUT" | grep -Eo 'https://[a-zA-Z0-9._-]+\.workers\.dev' | head -n1)"
  if [ -z "$WORKER_URL" ]; then
    echo "[!] Не удалось автоматически извлечь URL *.workers.dev из вывода wrangler."
    printf "Введите опубликованный https://...workers.dev URL вручную: "
    read -r WORKER_URL
  fi

  if [ -z "$WORKER_URL" ]; then
    echo "[!] Пустой URL воркера — прерываю."
    exit 1
  fi
  echo "[OK] Боевой URL воркера: $WORKER_URL"

  echo "[3/5] Загрузка секрета MONETIZE_API_KEY в Cloudflare Worker..."
  printf '%s' "$API_KEY" | npx --yes wrangler secret put MONETIZE_API_KEY --config paywall-worker/wrangler.toml

  echo "[4/5] Привязка боевого URL в расширении и удаление 127.0.0.1 из manifest..."
  node scripts/set_worker_url.mjs "$WORKER_URL"

  echo "[5/5] Финальная пересборка архивов v1.0.0 в dist/..."
  npm run package

  git add src/paywall/config.js manifest.json manifest.firefox.json dist-sdk/
  if ! git diff --cached --quiet; then
    git commit -m "chore(release): bind production Cloudflare Worker URL for v1.0.0 store submission"
    git push
  fi

  echo ""
  echo "=================================================================="
  echo " ГОТОВО К ЗАГРУЗКЕ В МАГАЗИНЫ!"
  echo " Проверьте здоровье прокси: $WORKER_URL/health"
  echo " Готовые архивы лежат в папке dist/:"
  ls -lh dist/*.zip
  echo "=================================================================="
)
