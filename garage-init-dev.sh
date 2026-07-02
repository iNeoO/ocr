#!/usr/bin/env bash
set -euo pipefail

: "${S3_BUCKET:?S3_BUCKET must be set}"
: "${S3_ACCESS_KEY:?S3_ACCESS_KEY must be set}"
: "${S3_SECRET_KEY:?S3_SECRET_KEY must be set}"

docker compose exec garage /garage key import --yes "$S3_ACCESS_KEY" "$S3_SECRET_KEY" -n ocr-dev
docker compose exec garage /garage bucket create "$S3_BUCKET"
docker compose exec garage /garage bucket allow --read --write --key "$S3_ACCESS_KEY" "$S3_BUCKET"
