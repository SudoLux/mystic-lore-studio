#!/bin/sh
set -eu

if [ -f .env.beta.import.local ]; then
  set -a
  . ./.env.beta.import.local
  set +a
fi

export ML_V1_FABRIC_RECREATION_CONFIRM=read-v1-write-beta-no-media
exec tsx scripts/recreate-v1-fabrics-beta.ts "$@"
