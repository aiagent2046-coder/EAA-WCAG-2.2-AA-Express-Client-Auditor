#!/usr/bin/env bash
set -euo pipefail
echo "Downloading official ExtPay.js SDK from Glench/ExtPay..."
curl -fsSL https://raw.githubusercontent.com/Glench/ExtPay/main/dist/ExtPay.js -o vendor/ExtPay.js
echo "Updated vendor/ExtPay.js ($(wc -c < vendor/ExtPay.js) bytes)."
