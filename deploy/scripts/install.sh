#!/usr/bin/env bash
# ---------------------------------------------------------------
# RUN ON THE CUSTOMER HOST (air-gapped). One command install.
# ---------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$( [ -f VERSION ] && cat VERSION || echo 'dev' )"

# Up-front plan so the operator knows the whole process before anything runs.
cat <<BANNER

============================================================
  DecisionOS on-premise kurulumu  (sürüm: ${VERSION})
============================================================
  Bu script baştan sona aşağıdaki 6 adımı çalıştıracak:

   1/6  Container imajlarını yükle       (docker load, ~5-10 dk)
   2/6  Gizli anahtarları üret + .env    (JWT, DB parolası, DEPLOYMENT_ID)
   3/6  Yerel LLM ağırlıklarını kur      (ollama volume'üne kopyalama)
   4/6  Stack'i başlat                   (docker compose up -d, 9 servis)
   5/6  Veritabanı migration'larını uygula (idempotent, tekrar çalıştırılabilir)
   6/6  Lisans durumunu kontrol et

  Kurulum sonrası: ilk admin kullanıcıyı oluşturun ve gerekiyorsa
  lisans anahtarını ./scripts/license-activate.sh <key> ile aktive edin.

  Not: Adım 2 bir DEPLOYMENT_ID üretir; lisans anahtarı almak için
  bu kimliği üreticiye iletmeniz gerekir.
  Hiçbir adım internet erişimi gerektirmez. Süreç ~10-20 dk sürer.
------------------------------------------------------------
BANNER

if [ -t 0 ] && [ "${DECISIONOS_ASSUME_YES:-false}" != "true" ]; then
  read -r -p "Kuruluma başlansın mı? [E/h] " _ans
  case "${_ans:-E}" in
    [hHnN]*) echo "İptal edildi."; exit 0;;
  esac
fi
echo

echo "==> 1/6 Loading container images"
[ -f images/decisionos-images.tar.gz ] && gunzip -c images/decisionos-images.tar.gz | docker load

echo "==> 2/6 Generating secrets"
[ -f ./.env ] || ./scripts/generate-keys.sh

echo "==> 3/6 Installing local LLM weights"
mkdir -p volumes/ollama
[ -d models ] && cp -rn models/. volumes/ollama/ || true

echo "==> 4/6 Starting the stack"
docker compose --env-file ./.env up -d

echo "==> 5/6 Applying database migrations"
./scripts/migrate.sh

echo "==> 6/6 Checking license"
./scripts/license-activate.sh --status || true

set -a; source ./.env; set +a
echo
echo "DecisionOS is up:  http://$(hostname -I | awk '{print $1}'):${APP_HTTP_PORT}"
echo "Create the first admin user with: ./scripts/create-admin.sh <email> <password>"
