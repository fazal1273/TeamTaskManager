# Multi-stage Dockerfile for TeamTaskManager (client + server)
# Builds the React client, generates Prisma client, compiles the TypeScript server,
# and produces a minimal production image suitable for Railway (Debian-based).

FROM node:20-bullseye-slim AS builder
WORKDIR /app

# Copy workspace manifests first for efficient caching
COPY package.json package-lock.json* ./
COPY server/package.json server/package-lock.json* ./server/
COPY client/package.json client/package-lock.json* ./client/

# Copy source
COPY server ./server
COPY client ./client

# Install all deps needed for building the client and server.
RUN npm ci

# Build client
RUN npm run build -w client

# Generate Prisma client (includes debian binary target in schema.prisma)
RUN npm run prisma:generate -w server

# Build server (tsc + prisma generate already run by package script)
RUN npm run build -w server

# Remove build-time dependencies before copying into the runtime image.
RUN npm prune --omit=dev


FROM node:20-bullseye-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/teamtask.sqlite
ENV JWT_SECRET=change-me-in-production

RUN mkdir -p /app/data

# Copy node_modules and built outputs from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./client/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY package.json ./

# Expose server port
EXPOSE 4000
ENV PORT=4000

# Apply migrations at startup, then launch the API server without relying on npm workspaces.
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy --schema server/prisma/schema.prisma && node server/dist/index.js"]
