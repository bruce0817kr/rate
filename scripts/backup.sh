#!/bin/bash
# DB Backup Script for rate_db
# Usage: ./backup.sh [backup_dir]

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/rate_db_${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

echo "Starting database backup..."
echo "Backup directory: $BACKUP_DIR"
echo "Backup file: $BACKUP_FILE"

docker exec rate-postgres pg_dump -U rate_user -d rate_db > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "Backup completed successfully!"
    echo "File size: $(du -h "$BACKUP_FILE" | cut -f1)"
    
    echo "Cleaning up old backups (keeping last 10)..."
    ls -t "$BACKUP_DIR"/rate_db_*.sql | tail -n +11 | xargs -r rm
    
    echo "Current backups:"
    ls -lh "$BACKUP_DIR"/rate_db_*.sql
else
    echo "Backup failed!"
    rm -f "$BACKUP_FILE"
    exit 1
fi
