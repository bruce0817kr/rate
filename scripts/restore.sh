#!/bin/bash
# DB Restore Script for rate_db
# Usage: ./restore.sh <backup_file>

set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "Usage: ./restore.sh <backup_file>"
    echo "Example: ./restore.sh ./backups/rate_db_20240101_120000.sql"
    exit 1
fi

BACKUP_FILE="$1"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-rate-postgres}"
RATE_DB_USERNAME="${RATE_DB_USERNAME:-rate_user}"
RATE_DB_NAME="${RATE_DB_NAME:-rate_db}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "WARNING: This will overwrite the current database!"
echo "Backup file: $BACKUP_FILE"
echo "Database: $RATE_DB_NAME"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo "Starting database restore..."
docker exec -i "$POSTGRES_CONTAINER" psql -U "$RATE_DB_USERNAME" -d "$RATE_DB_NAME" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Restore completed successfully!"
else
    echo "Restore failed!"
    exit 1
fi
