#!/bin/bash
# =============================================
# FjordVind Lusevokteren - Production Deployment Script
# =============================================
# Usage: ./deploy.sh [command]
# Commands: setup, deploy, update, backup, restore, logs, status, stop

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
PROD_COMPOSE_FILE="lusevokteren-api/deploy/docker-compose.prod.yml"
PROJECT_NAME="fjordvind"
BACKUP_DIR="./backups"

# Helper functions
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_env() {
    if [ ! -f .env ]; then
        log_error ".env file not found!"
        log_info "Copy .env.example to .env and fill in the values:"
        log_info "  cp .env.example .env"
        exit 1
    fi

    # Check required variables
    source .env
    if [ -z "$POSTGRES_PASSWORD" ]; then
        log_error "POSTGRES_PASSWORD is not set in .env"
        exit 1
    fi
    if [ -z "$JWT_SECRET" ]; then
        log_error "JWT_SECRET is not set in .env"
        exit 1
    fi
    log_info "Environment configuration OK"
}

setup() {
    log_info "Setting up FjordVind Lusevokteren..."

    # Check for .env
    if [ ! -f .env ]; then
        log_info "Creating .env from template..."
        cp .env.example .env

        # Generate random passwords
        POSTGRES_PWD=$(openssl rand -base64 24)
        JWT_SECRET=$(openssl rand -hex 64)

        # Update .env with generated values
        sed -i "s/^POSTGRES_PASSWORD=$/POSTGRES_PASSWORD=$POSTGRES_PWD/" .env
        sed -i "s/^JWT_SECRET=$/JWT_SECRET=$JWT_SECRET/" .env

        log_warn "Generated random passwords in .env"
        log_warn "Please review and update other settings as needed!"
    fi

    # Create backup directory
    mkdir -p "$BACKUP_DIR"

    # Build images
    log_info "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build

    log_info "Setup complete!"
    log_info "Run './deploy.sh deploy' to start the services"
}

deploy() {
    check_env
    log_info "Deploying FjordVind Lusevokteren..."

    # Pull latest images
    docker-compose -f "$COMPOSE_FILE" pull

    # Build and start services
    docker-compose -f "$COMPOSE_FILE" up -d --build

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check health
    status

    log_info "Deployment complete!"
}

deploy_prod() {
    check_env
    log_info "Deploying FjordVind Lusevokteren (PRODUCTION)..."

    # Ensure NODE_ENV is production
    export NODE_ENV=production

    # Build and start with production compose file
    docker-compose -f "$PROD_COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build

    log_info "Production deployment complete!"
    log_info "Services are starting. Check status with: ./deploy.sh status"
}

update() {
    check_env
    log_info "Updating FjordVind Lusevokteren..."

    # Create backup before update
    backup

    # Pull latest code (if in git repo)
    if [ -d .git ]; then
        log_info "Pulling latest code..."
        git pull
    fi

    # Rebuild and restart
    docker-compose -f "$COMPOSE_FILE" up -d --build

    log_info "Update complete!"
}

backup() {
    log_info "Creating database backup..."

    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"

    # Get database container name
    DB_CONTAINER=$(docker-compose -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || echo "lusevokteren-db")

    if docker ps -q -f name="$DB_CONTAINER" | grep -q .; then
        docker exec "$DB_CONTAINER" pg_dump -U postgres lusevokteren > "$BACKUP_FILE"

        # Compress backup
        gzip "$BACKUP_FILE"

        log_info "Backup created: ${BACKUP_FILE}.gz"

        # Remove backups older than 30 days
        find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +30 -delete
        log_info "Cleaned up old backups"
    else
        log_error "Database container not running. Cannot create backup."
        exit 1
    fi
}

restore() {
    if [ -z "$1" ]; then
        log_error "Usage: ./deploy.sh restore <backup_file>"
        log_info "Available backups:"
        ls -la "$BACKUP_DIR"/*.sql.gz 2>/dev/null || log_warn "No backups found"
        exit 1
    fi

    BACKUP_FILE="$1"

    if [ ! -f "$BACKUP_FILE" ]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    log_warn "This will OVERWRITE the current database!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    log_info "Restoring from: $BACKUP_FILE"

    DB_CONTAINER=$(docker-compose -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || echo "lusevokteren-db")

    # Decompress if needed
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U postgres lusevokteren
    else
        cat "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U postgres lusevokteren
    fi

    log_info "Restore complete!"
}

logs() {
    SERVICE="${1:-}"
    if [ -n "$SERVICE" ]; then
        docker-compose -f "$COMPOSE_FILE" logs -f "$SERVICE"
    else
        docker-compose -f "$COMPOSE_FILE" logs -f
    fi
}

status() {
    log_info "Service status:"
    docker-compose -f "$COMPOSE_FILE" ps

    echo ""
    log_info "Health checks:"

    # Check API health
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        log_info "API: ${GREEN}Healthy${NC}"
    else
        log_warn "API: ${RED}Not responding${NC}"
    fi

    # Check database
    DB_CONTAINER=$(docker-compose -f "$COMPOSE_FILE" ps -q postgres 2>/dev/null || echo "lusevokteren-db")
    if docker exec "$DB_CONTAINER" pg_isready -U postgres > /dev/null 2>&1; then
        log_info "Database: ${GREEN}Healthy${NC}"
    else
        log_warn "Database: ${RED}Not responding${NC}"
    fi
}

stop() {
    log_info "Stopping services..."
    docker-compose -f "$COMPOSE_FILE" down
    log_info "Services stopped"
}

clean() {
    log_warn "This will remove all containers, volumes, and images!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Cleanup cancelled"
        exit 0
    fi

    log_info "Stopping and removing all resources..."
    docker-compose -f "$COMPOSE_FILE" down -v --rmi all
    log_info "Cleanup complete"
}

ssl_setup() {
    DOMAIN="${1:-}"
    EMAIL="${2:-}"

    if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
        log_error "Usage: ./deploy.sh ssl-setup <domain> <email>"
        exit 1
    fi

    log_info "Setting up SSL for $DOMAIN..."

    # Create directories
    mkdir -p lusevokteren-api/deploy/certbot/conf
    mkdir -p lusevokteren-api/deploy/certbot/www

    # Get initial certificate
    docker run --rm -v "$(pwd)/lusevokteren-api/deploy/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/lusevokteren-api/deploy/certbot/www:/var/www/certbot" \
        certbot/certbot certonly --webroot \
        --webroot-path=/var/www/certbot \
        --email "$EMAIL" --agree-tos --no-eff-email \
        -d "$DOMAIN"

    # Update nginx config with domain
    sed -i "s/your-domain.no/$DOMAIN/g" lusevokteren-api/deploy/nginx.conf

    log_info "SSL setup complete for $DOMAIN"
    log_info "Restart nginx to apply: docker-compose restart nginx"
}

# Main command handler
case "${1:-help}" in
    setup)
        setup
        ;;
    deploy)
        deploy
        ;;
    deploy-prod)
        deploy_prod
        ;;
    update)
        update
        ;;
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    logs)
        logs "$2"
        ;;
    status)
        status
        ;;
    stop)
        stop
        ;;
    clean)
        clean
        ;;
    ssl-setup)
        ssl_setup "$2" "$3"
        ;;
    help|*)
        echo "FjordVind Lusevokteren Deployment Script"
        echo ""
        echo "Usage: ./deploy.sh [command]"
        echo ""
        echo "Commands:"
        echo "  setup       - Initial setup (create .env, build images)"
        echo "  deploy      - Deploy/start all services"
        echo "  deploy-prod - Deploy with production config"
        echo "  update      - Update to latest version (backup + rebuild)"
        echo "  backup      - Create database backup"
        echo "  restore     - Restore from backup file"
        echo "  logs        - View logs (optional: service name)"
        echo "  status      - Show service status and health"
        echo "  stop        - Stop all services"
        echo "  clean       - Remove all containers and volumes"
        echo "  ssl-setup   - Setup SSL certificate (domain email)"
        echo ""
        ;;
esac
