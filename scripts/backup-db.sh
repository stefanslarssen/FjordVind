#!/bin/bash
# =============================================
# FjordVind Lusevokteren - Database Backup Script
# =============================================
# Usage: ./backup-db.sh [options]
# Options:
#   -d, --dir DIR      Backup directory (default: ./backups)
#   -r, --retain DAYS  Keep backups for N days (default: 30)
#   -c, --compress     Compress backup (default: yes)
#   -s, --s3           Upload to S3 (requires AWS CLI)
#   -h, --help         Show help

set -e

# Default configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN_DAYS="${RETAIN_DAYS:-30}"
COMPRESS=true
UPLOAD_S3=false
S3_BUCKET="${S3_BUCKET:-}"

# Database connection (from environment or .env)
if [ -f .env ]; then
    source .env
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-lusevokteren}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    echo "FjordVind Database Backup Script"
    echo ""
    echo "Usage: ./backup-db.sh [options]"
    echo ""
    echo "Options:"
    echo "  -d, --dir DIR      Backup directory (default: ./backups)"
    echo "  -r, --retain DAYS  Keep backups for N days (default: 30)"
    echo "  -n, --no-compress  Don't compress backup"
    echo "  -s, --s3           Upload to S3 (requires AWS CLI and S3_BUCKET env)"
    echo "  -h, --help         Show this help"
    echo ""
    echo "Environment variables:"
    echo "  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD"
    echo "  POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD (alternative)"
    echo "  S3_BUCKET (for S3 upload)"
    echo ""
    echo "Examples:"
    echo "  ./backup-db.sh                     # Basic backup"
    echo "  ./backup-db.sh -d /mnt/backups     # Custom directory"
    echo "  ./backup-db.sh -r 7 -s             # Keep 7 days, upload to S3"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retain)
            RETAIN_DAYS="$2"
            shift 2
            ;;
        -n|--no-compress)
            COMPRESS=false
            shift
            ;;
        -s|--s3)
            UPLOAD_S3=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate configuration
if [ -z "$DB_PASSWORD" ]; then
    log_error "Database password not set. Set POSTGRES_PASSWORD or DB_PASSWORD"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lusevokteren_${TIMESTAMP}.sql"

log_info "Starting database backup..."
log_info "Database: $DB_NAME@$DB_HOST:$DB_PORT"
log_info "Backup file: $BACKUP_FILE"

# Check if running in Docker
if docker ps -q -f name=lusevokteren-db 2>/dev/null | grep -q .; then
    log_info "Using Docker container for backup..."
    docker exec lusevokteren-db pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
elif docker ps -q -f name=fjordvind_db 2>/dev/null | grep -q .; then
    log_info "Using Docker container for backup..."
    docker exec fjordvind_db pg_dump -U "$DB_USER" "$DB_NAME" > "$BACKUP_FILE"
else
    # Direct connection
    log_info "Using direct PostgreSQL connection..."
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --no-owner \
        --no-privileges \
        > "$BACKUP_FILE"
fi

# Check backup size
BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
if [ "$BACKUP_SIZE" -lt 1000 ]; then
    log_error "Backup file is too small ($BACKUP_SIZE bytes). Something went wrong."
    rm -f "$BACKUP_FILE"
    exit 1
fi

log_info "Backup created: $(du -h "$BACKUP_FILE" | cut -f1)"

# Compress if requested
if [ "$COMPRESS" = true ]; then
    log_info "Compressing backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    log_info "Compressed: $(du -h "$BACKUP_FILE" | cut -f1)"
fi

# Upload to S3 if requested
if [ "$UPLOAD_S3" = true ]; then
    if [ -z "$S3_BUCKET" ]; then
        log_error "S3_BUCKET environment variable not set"
        exit 1
    fi

    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not installed. Cannot upload to S3."
        exit 1
    fi

    log_info "Uploading to S3: s3://$S3_BUCKET/backups/"
    aws s3 cp "$BACKUP_FILE" "s3://$S3_BUCKET/backups/$(basename "$BACKUP_FILE")"
    log_info "Upload complete"

    # Clean old S3 backups
    log_info "Cleaning old S3 backups (older than $RETAIN_DAYS days)..."
    CUTOFF_DATE=$(date -d "-${RETAIN_DAYS} days" +%Y-%m-%d 2>/dev/null || date -v-${RETAIN_DAYS}d +%Y-%m-%d)
    aws s3 ls "s3://$S3_BUCKET/backups/" | while read -r line; do
        FILE_DATE=$(echo "$line" | awk '{print $1}')
        FILE_NAME=$(echo "$line" | awk '{print $4}')
        if [[ "$FILE_DATE" < "$CUTOFF_DATE" ]]; then
            aws s3 rm "s3://$S3_BUCKET/backups/$FILE_NAME"
            log_info "Deleted old S3 backup: $FILE_NAME"
        fi
    done
fi

# Clean old local backups
log_info "Cleaning local backups older than $RETAIN_DAYS days..."
if [ "$(uname)" = "Darwin" ]; then
    # macOS
    find "$BACKUP_DIR" -name "lusevokteren_*.sql*" -mtime +${RETAIN_DAYS} -delete
else
    # Linux
    find "$BACKUP_DIR" -name "lusevokteren_*.sql*" -mtime +${RETAIN_DAYS} -delete
fi

# Summary
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/lusevokteren_*.sql* 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)

log_info "========================================"
log_info "Backup complete!"
log_info "File: $BACKUP_FILE"
log_info "Total backups: $TOTAL_BACKUPS"
log_info "Total size: $TOTAL_SIZE"
log_info "========================================"
