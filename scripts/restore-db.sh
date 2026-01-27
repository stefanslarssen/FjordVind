#!/bin/bash
# =============================================
# FjordVind Lusevokteren - Database Restore Script
# =============================================
# Usage: ./restore-db.sh <backup_file>

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Load environment
if [ -f .env ]; then
    source .env
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-lusevokteren}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    log_error "Usage: ./restore-db.sh <backup_file>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/*.sql* 2>/dev/null || echo "No backups found in ./backups/"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    log_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    log_error "Database password not set"
    exit 1
fi

log_warn "========================================"
log_warn "DATABASE RESTORE WARNING"
log_warn "========================================"
log_warn "This will OVERWRITE all data in: $DB_NAME"
log_warn "Backup file: $BACKUP_FILE"
log_warn "========================================"
echo ""
read -p "Type 'RESTORE' to confirm: " confirm

if [ "$confirm" != "RESTORE" ]; then
    log_info "Restore cancelled"
    exit 0
fi

log_info "Starting restore..."

# Create a backup before restore
log_info "Creating safety backup before restore..."
./scripts/backup-db.sh -d ./backups/pre-restore 2>/dev/null || true

# Determine if compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    log_info "Decompressing backup..."
    TEMP_FILE=$(mktemp)
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

# Check if running in Docker
if docker ps -q -f name=lusevokteren-db 2>/dev/null | grep -q .; then
    log_info "Restoring via Docker container..."

    # Drop and recreate database
    docker exec lusevokteren-db psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
    docker exec lusevokteren-db psql -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};"

    # Restore
    cat "$RESTORE_FILE" | docker exec -i lusevokteren-db psql -U "$DB_USER" -d "$DB_NAME"

elif docker ps -q -f name=fjordvind_db 2>/dev/null | grep -q .; then
    log_info "Restoring via Docker container..."

    docker exec fjordvind_db psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
    docker exec fjordvind_db psql -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};"

    cat "$RESTORE_FILE" | docker exec -i fjordvind_db psql -U "$DB_USER" -d "$DB_NAME"
else
    log_info "Restoring via direct connection..."

    # Drop and recreate
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME};"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME};"

    # Restore
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$RESTORE_FILE"
fi

# Clean up temp file
if [ -n "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
    rm -f "$TEMP_FILE"
fi

log_info "========================================"
log_info "Restore complete!"
log_info "Database: $DB_NAME"
log_info "From: $BACKUP_FILE"
log_info "========================================"
log_info ""
log_info "Restart the API server to reconnect:"
log_info "  docker-compose restart api"
