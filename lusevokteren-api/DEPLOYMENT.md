# FjordVind Lusevokteren API - Deployment Guide

Production deployment guide for the Lusevokteren sea lice monitoring API.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Database Setup](#database-setup)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Security Checklist](#security-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **Node.js**: 20.x LTS or newer
- **PostgreSQL**: 14.x or newer
- **Redis**: 7.x (optional, for caching)
- **Docker**: 24.x or newer (for containerized deployment)

### External Services

- **BarentsWatch API**: Required for official lice data
  - Register at: https://www.barentswatch.no/minside/
  - Create API credentials (client ID and secret)

- **Push Notifications** (optional):
  - Generate VAPID keys: `npx web-push generate-vapid-keys`

- **SMS/Twilio** (optional):
  - Create account at: https://www.twilio.com/

---

## Environment Variables

Copy `.env.example` to `.env` and configure all required values.

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `PORT` | API port | `3000` |
| `DATABASE_URL` | PostgreSQL connection URL | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Generate with: `openssl rand -hex 32` |
| `BARENTSWATCH_CLIENT_ID` | BarentsWatch API client ID | `your-client-id` |
| `BARENTSWATCH_CLIENT_SECRET` | BarentsWatch API client secret | `your-secret` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_EXPIRES_IN` | Token expiration time | `24h` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` |
| `REDIS_URL` | Redis connection URL | None (caching disabled) |
| `VAPID_PUBLIC_KEY` | Push notification public key | None |
| `VAPID_PRIVATE_KEY` | Push notification private key | None |
| `EMAIL_PROVIDER` | Email provider (console/smtp/sendgrid) | `console` |
| `SENTRY_DSN` | Sentry error tracking DSN | None |
| `LOG_LEVEL` | Logging level | `info` |
| `RATE_LIMIT_GENERAL` | Requests per 15 min | `100` |
| `RATE_LIMIT_AUTH` | Auth attempts per 15 min | `10` |

### Generating Secrets

```bash
# Generate JWT secret
openssl rand -hex 32

# Or with Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate VAPID keys
npx web-push generate-vapid-keys
```

---

## Docker Deployment

### Quick Start

```bash
# Clone repository
git clone https://github.com/fjordvind/lusevokteren-api.git
cd lusevokteren-api

# Create .env file from example
cp .env.example .env
# Edit .env with your values

# Start all services
docker compose up -d

# View logs
docker compose logs -f api
```

### With Redis (recommended for production)

```bash
docker compose --profile with-redis up -d
```

### With Nginx (for HTTPS)

1. Create SSL certificates in `./ssl/` directory
2. Configure `nginx.conf` (template provided)
3. Start with nginx profile:

```bash
docker compose --profile with-nginx up -d
```

### Health Check

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","message":"Lusevokteren API is running"}
```

### Container Management

```bash
# View container status
docker compose ps

# Restart API
docker compose restart api

# View logs
docker compose logs -f api

# Stop all services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

---

## Manual Deployment

### 1. Install Dependencies

```bash
npm ci --only=production
```

### 2. Set Up Database

```bash
# Run migrations
psql -U $DB_USER -d $DB_NAME -f migrations/001_initial.sql
psql -U $DB_USER -d $DB_NAME -f migrations/002_treatments.sql
psql -U $DB_USER -d $DB_NAME -f migrations/003_notifications.sql
```

### 3. Start Application

```bash
# Direct start
NODE_ENV=production node server.js

# With PM2 (recommended)
pm2 start server.js --name lusevokteren-api
pm2 save
pm2 startup
```

### PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'lusevokteren-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    max_memory_restart: '500M',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    merge_logs: true
  }]
};
```

Start with: `pm2 start ecosystem.config.js --env production`

---

## Database Setup

### PostgreSQL Configuration

Recommended `postgresql.conf` settings for production:

```ini
# Memory
shared_buffers = 256MB
effective_cache_size = 768MB
work_mem = 16MB

# Connections
max_connections = 100

# Logging
log_statement = 'mod'
log_min_duration_statement = 1000
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
pg_dump -U lusevokteren -d lusevokteren | gzip > /backups/lusevokteren_$DATE.sql.gz

# Keep last 30 days
find /backups -name "lusevokteren_*.sql.gz" -mtime +30 -delete
```

### Migrations

Run migrations in order:

```bash
# Check current migration status
psql -U $DB_USER -d $DB_NAME -c "SELECT * FROM schema_migrations;"

# Apply new migrations
for f in migrations/*.sql; do
  psql -U $DB_USER -d $DB_NAME -f "$f"
done
```

---

## SSL/TLS Configuration

### Using Let's Encrypt (Recommended)

```bash
# Install certbot
apt install certbot

# Generate certificate
certbot certonly --standalone -d api.lusevokteren.fjordvind.no

# Certificates stored in:
# /etc/letsencrypt/live/api.lusevokteren.fjordvind.no/
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.lusevokteren.fjordvind.no;

    ssl_certificate /etc/letsencrypt/live/api.lusevokteren.fjordvind.no/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.lusevokteren.fjordvind.no/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}

server {
    listen 80;
    server_name api.lusevokteren.fjordvind.no;
    return 301 https://$server_name$request_uri;
}
```

---

## Monitoring & Logging

### Health Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Basic health check |
| `GET /monitoring/health` | Detailed health with database status |
| `GET /monitoring/metrics` | System metrics (memory, uptime) |
| `GET /monitoring/status` | API status and version |

### Prometheus Metrics

Metrics are exposed in Prometheus format (if configured):

```bash
curl http://localhost:3000/monitoring/metrics
```

### Log Levels

Set with `LOG_LEVEL` environment variable:

- `error`: Only errors
- `warn`: Warnings and errors
- `info`: General information (default)
- `debug`: Verbose debugging

### External Monitoring

#### Sentry Integration

```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
```

#### Uptime Monitoring

Configure external uptime monitoring to check:

- `https://api.lusevokteren.fjordvind.no/health`
- Expected response: `{"status":"ok"}`

---

## Security Checklist

### Before Going Live

- [ ] **JWT_SECRET** is set and at least 32 characters
- [ ] **DATABASE_URL** uses a strong password
- [ ] **NODE_ENV** is set to `production`
- [ ] **CORS_ORIGIN** is set to your frontend domain only
- [ ] **Rate limiting** is enabled
- [ ] **HTTPS** is configured with valid SSL certificate
- [ ] **Database** is not exposed to the internet
- [ ] **Firewall** only allows ports 80, 443
- [ ] **API keys** (BarentsWatch, etc.) are not committed to git
- [ ] **Error messages** don't expose sensitive information

### Regular Maintenance

- [ ] Update dependencies monthly: `npm audit fix`
- [ ] Rotate JWT_SECRET quarterly
- [ ] Review access logs for anomalies
- [ ] Test backup restore procedure
- [ ] Update SSL certificates before expiry

---

## Troubleshooting

### Common Issues

#### Database Connection Failed

```
Error: ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
1. Check PostgreSQL is running: `systemctl status postgresql`
2. Verify DATABASE_URL is correct
3. Check pg_hba.conf allows connections

#### JWT Secret Too Short

```
KRITISK FEIL: JWT_SECRET må være minst 32 tegn
```

**Solution:** Generate a longer secret:
```bash
openssl rand -hex 32
```

#### CORS Errors in Browser

```
Access-Control-Allow-Origin header missing
```

**Solution:** Verify CORS_ORIGIN matches your frontend URL exactly.

#### High Memory Usage

**Solution:**
1. Enable Redis caching for expensive queries
2. Add PM2 max_memory_restart limit
3. Check for memory leaks with: `node --inspect server.js`

### Getting Help

1. Check logs: `docker compose logs -f api`
2. Enable debug logging: `LOG_LEVEL=debug`
3. Check health endpoint: `/monitoring/health`
4. Contact support: support@fjordvind.no

---

## Quick Reference

### Docker Commands

```bash
docker compose up -d              # Start services
docker compose down               # Stop services
docker compose logs -f api        # View logs
docker compose restart api        # Restart API
docker compose pull && docker compose up -d  # Update images
```

### Database Commands

```bash
# Connect to database
docker compose exec postgres psql -U lusevokteren -d lusevokteren

# Backup
docker compose exec postgres pg_dump -U lusevokteren lusevokteren > backup.sql

# Restore
cat backup.sql | docker compose exec -T postgres psql -U lusevokteren -d lusevokteren
```

### Useful URLs

- API Health: http://localhost:3000/health
- API Docs: http://localhost:3000/api/docs
- Metrics: http://localhost:3000/monitoring/metrics
