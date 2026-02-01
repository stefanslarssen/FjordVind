# FjordVind Lusevokteren API - Production Dockerfile
# Multi-stage build for smaller image size

# ============================================
# Stage 1: Build dependencies
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --only=production && npm cache clean --force

# ============================================
# Stage 2: Production image
# ============================================
FROM node:20-alpine AS production

# Add labels
LABEL org.opencontainers.image.title="FjordVind Lusevokteren API"
LABEL org.opencontainers.image.description="REST API for sea lice monitoring"
LABEL org.opencontainers.image.vendor="FjordVind AS"
LABEL org.opencontainers.image.version="1.1.0"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY --chown=nodejs:nodejs . .

# Remove development files
RUN rm -rf tests/ coverage/ .git/ *.md Dockerfile docker-compose.yml

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
