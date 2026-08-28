#!/bin/sh
set -eu

if [ -f .env.beta.import.local ]; then
  set -a
  . ./.env.beta.import.local
  set +a
fi

exec tsx scripts/import-device-canonical-beta.ts "$@"
