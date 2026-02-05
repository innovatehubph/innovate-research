# Use Debian-based image for Prisma compatibility
FROM node:20-slim

# Install OpenSSL and other dependencies
RUN apt-get update -y && apt-get install -y openssl libssl-dev wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy source code
COPY tsconfig.json ./
COPY src ./src

# Set environment
ENV NODE_ENV=production
ENV PORT=5013

EXPOSE 5013

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5013/api/health || exit 1

# Run with tsx (TypeScript executor)
CMD ["npx", "tsx", "src/index.ts"]
