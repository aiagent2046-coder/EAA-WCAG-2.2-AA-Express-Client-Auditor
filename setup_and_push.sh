#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/aiagent2046-coder/EAA-WCAG-2.2-AA-Express-Client-Auditor.git"

# Optional: pull official upstream ExtPay.js if online (keeps offline dev wrapper if skipped/offline)
if [[ "${FETCH_UPSTREAM_EXTPAY:-0}" == "1" ]]; then
  ./scripts/fetch_extpay.sh
fi

python3 scripts/package_store.py

if [[ ! -d .git ]]; then
  git init -b main
fi

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

git add .
git commit -m "feat: initial MVP of EAA & WCAG 2.2 AA Express Client Auditor" || true
git branch -M main
git push -u origin main
echo "Successfully pushed MVP to $REPO_URL"
