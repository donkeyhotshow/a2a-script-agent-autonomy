# Multi-stage build for production-ready container
FROM node:18-alpine AS base

# Install security updates and dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mcp -u 1001 -G nodejs

WORKDIR /app

# Copy package files
COPY package*.json ./

# ============================================================================
# Dependencies stage
# ============================================================================
FROM base AS deps

# Install all dependencies (including dev)
RUN npm ci --include=dev && npm cache clean --force

# ============================================================================
# Build stage
# ============================================================================
FROM base AS build

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build application
RUN npm run build && \
    npm prune --production && \
    npm cache clean --force

# ============================================================================
# Production stage
# ============================================================================
FROM base AS production

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy production dependencies
COPY --from=build /app/node_modules ./node_modules

# Copy built application
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/data /app/logs && \
    chown -R mcp:nodejs /app

# Copy health check script
COPY --from=build /app/scripts/health-check.js ./scripts/

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node scripts/health-check.js || exit 1

# Switch to non-root user
USER mcp

# Expose port
EXPOSE 3000

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/mcp-server.js"]

# Labels for metadata
LABEL maintainer="MCP Terminal Team" \
      version="2.0.0" \
      description="Enterprise MCP Terminal Server" \
      org.opencontainers.image.title="MCP Terminal Server" \
      org.opencontainers.image.description="Enterprise-grade MCP Terminal Server with comprehensive testing, monitoring, and security" \
      org.opencontainers.image.version="2.0.0" \
      org.opencontainers.image.vendor="MCP Terminal Team" \
      org.opencontainers.image.licenses="MIT"
