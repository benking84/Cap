#!/bin/sh
set -e

# Construct DATABASE_URL from individual components
# Always construct it to ensure proper variable expansion
if [ -n "$DB_USER" ] && [ -n "$DB_PASS" ] && [ -n "$DB_NAME" ] && [ -n "$INSTANCE_CONNECTION_NAME" ]; then
  export DATABASE_URL="mysql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}?socket=/cloudsql/${INSTANCE_CONNECTION_NAME}"
  echo "✅ DATABASE_URL constructed from environment variables"
  echo "Connection: mysql://${DB_USER}:***@localhost/${DB_NAME}?socket=/cloudsql/${INSTANCE_CONNECTION_NAME}"
else
  echo "⚠️  Warning: Missing environment variables for DATABASE_URL construction"
  echo "DB_USER: ${DB_USER:-NOT SET}"
  echo "DB_NAME: ${DB_NAME:-NOT SET}"
  echo "INSTANCE_CONNECTION_NAME: ${INSTANCE_CONNECTION_NAME:-NOT SET}"
fi

# Execute the main command
exec "$@"
