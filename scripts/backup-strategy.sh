#!/bin/bash

###############################################################################
# SQLite Backup & Recovery Strategy
#
# Backup frequency: Daily at 02:00 UTC
# Retention: 7 days local, 30 days cloud storage
# Recovery: Point-in-time restore via WAL files
#
# Setup (add to crontab):
# 0 2 * * * /app/scripts/backup-strategy.sh >> /var/log/feedia-backup.log 2>&1
###############################################################################

set -e

# Configuration
DB_PATH="${DB_PATH:-/app/data/runtime/agent.db}"
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
S3_BUCKET="${S3_BACKUP_BUCKET:-feedia-backups}"
RETENTION_DAYS=7
S3_RETENTION_DAYS=30

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/agent_${TIMESTAMP}.db"
BACKUP_WAL="${BACKUP_DIR}/agent_${TIMESTAMP}.db-wal"
BACKUP_SHM="${BACKUP_DIR}/agent_${TIMESTAMP}.db-shm"

# Logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "🔄 Starting SQLite backup..."

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# 1. Backup main database file
if [ ! -f "${DB_PATH}" ]; then
    log "❌ Database not found at ${DB_PATH}"
    exit 1
fi

cp "${DB_PATH}" "${BACKUP_FILE}"
log "✅ Database backed up: ${BACKUP_FILE}"

# 2. Backup WAL (Write-Ahead Log) if exists
# WAL contains uncommitted transactions
if [ -f "${DB_PATH}-wal" ]; then
    cp "${DB_PATH}-wal" "${BACKUP_WAL}"
    log "✅ WAL backed up: ${BACKUP_WAL}"
fi

# 3. Backup SHM (Shared memory) if exists
if [ -f "${DB_PATH}-shm" ]; then
    cp "${DB_PATH}-shm" "${BACKUP_SHM}"
    log "✅ SHM backed up: ${BACKUP_SHM}"
fi

# 4. Compress backup
gzip "${BACKUP_FILE}"
log "✅ Backup compressed: ${BACKUP_FILE}.gz"

# 5. Upload to S3
if command -v aws &> /dev/null; then
    aws s3 cp "${BACKUP_FILE}.gz" "s3://${S3_BUCKET}/backups/${TIMESTAMP}/" --region us-east-1
    log "✅ Backup uploaded to S3"
else
    log "⚠️  AWS CLI not found, skipping S3 upload"
fi

# 6. Local retention policy (keep last 7 days)
log "🔄 Cleaning up old local backups..."
find "${BACKUP_DIR}" -name "agent_*.db.gz" -mtime +${RETENTION_DAYS} -delete
log "✅ Old backups cleaned (retention: ${RETENTION_DAYS} days)"

# 7. Verify backup integrity
if gzip -t "${BACKUP_FILE}.gz" 2>/dev/null; then
    log "✅ Backup integrity verified (gzip check passed)"
else
    log "❌ Backup integrity check FAILED"
    exit 1
fi

# 8. Log backup metadata
cat > "${BACKUP_DIR}/.latest_backup" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "database": "${BACKUP_FILE}.gz",
  "size_bytes": $(stat -f%z "${BACKUP_FILE}.gz" 2>/dev/null || echo 0),
  "s3_location": "s3://${S3_BUCKET}/backups/${TIMESTAMP}/",
  "recovery_instructions": "See RUNBOOK_PHASE6-10.md#recovery"
}
EOF

log "✅ Backup complete!"

###############################################################################
# Recovery Instructions (manual, or automated via lambda)
#
# Point-in-time restore:
# 1. Stop application
# 2. aws s3 cp s3://feedia-backups/backups/TIMESTAMP/ ./restore/
# 3. gunzip restore/*.gz
# 4. cp restore/agent_TIMESTAMP.db /app/data/runtime/agent.db
# 5. cp restore/agent_TIMESTAMP.db-wal /app/data/runtime/agent.db-wal (if exists)
# 6. Start application
#
# Verify recovery:
# sqlite3 /app/data/runtime/agent.db "PRAGMA integrity_check;"
###############################################################################

exit 0
