#!/bin/bash
# DB Backup Script for rate_db
# Usage: ./backup.sh [backup_dir]

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-rate-postgres}"
RATE_DB_USERNAME="${RATE_DB_USERNAME:-rate_user}"
RATE_DB_NAME="${RATE_DB_NAME:-rate_db}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${RATE_DB_NAME}_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Backup directory: $BACKUP_DIR"
echo "Backup file: $BACKUP_FILE"

docker exec "$POSTGRES_CONTAINER" pg_dump -U "$RATE_DB_USERNAME" -d "$RATE_DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully!"
    echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    echo "Cleaning up old backups (keeping last 10)..."
    ls -t "$BACKUP_DIR"/"${RATE_DB_NAME}"_*.sql | tail -n +11 | xargs -r rm
    
    echo "Current backups:"
    ls -lh "$BACKUP_DIR"/"${RATE_DB_NAME}"_*.sql
else
    echo "Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi
