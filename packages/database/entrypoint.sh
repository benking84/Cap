#!/usr/bin/env bash
set -euo pipefail

: "${DB_USER:?missing}"
: "${DB_PASSWORD:?missing}"
: "${DB_HOST:?missing}"     # Private IP of Cloud SQL instance
: "${DB_NAME:?missing}"
: "${DB_PORT:=3306}"

export DATABASE_URL="mysql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo "Running Prisma migrations against ${DB_HOST}:${DB_PORT}/${DB_NAME} ..."
pnpm db:push
echo "Migrations complete."
