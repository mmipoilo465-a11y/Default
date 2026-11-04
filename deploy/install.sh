#!/usr/bin/env bash
# Установка на чистый сервер Ubuntu/Debian одной командой:
#   bash deploy/install.sh                 — адрес вида 1-2-3-4.sslip.io (свой домен не нужен)
#   bash deploy/install.sh zapis.mysite.ru — свой домен (A-запись должна указывать на этот сервер)
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v docker >/dev/null; then
  echo "Ставлю Docker…"; curl -fsSL https://get.docker.com | sh
fi
IP=$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')
DOMAIN=${1:-${IP//./-}.sslip.io}
touch .env
grep -q '^DOMAIN=' .env && sed -i "s/^DOMAIN=.*/DOMAIN=$DOMAIN/" .env || echo "DOMAIN=$DOMAIN" >> .env
mkdir -p data
docker compose up -d --build
echo
echo "Готово. Через минуту (пока выпускается сертификат) откроется: https://$DOMAIN/"
echo "Новая студия:  docker compose exec app node scripts/new-studio.js <адрес> \"Название\" почта@владельца --from <шаблон>"
