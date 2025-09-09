# Dockerfile for backend - should be run from monorepo root
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Enable corepack to ensure modern npm
RUN corepack enable && corepack prepare npm@10.8.2 --activate

# Copy monorepo package files
COPY package*.json ./
COPY packages/api-types/package*.json ./packages/api-types/
COPY packages/backend/package*.json ./packages/backend/

# Install all dependencies for monorepo
RUN npm ci

# Copy source code
COPY packages/api-types ./packages/api-types
COPY packages/backend ./packages/backend

# Build backend first (for types), then api-types (which re-exports backend types)
RUN npm run build --workspace=backend
RUN npm run build --workspace=@rootine/api-types

# Production stage
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Copy only the built backend and its dependencies
COPY --from=builder /app/packages/backend/dist ./dist
COPY --from=builder /app/packages/backend/package*.json ./

# Install only production dependencies for backend
RUN npm install --omit=dev && npm cache clean --force

EXPOSE 7001

CMD ["npm", "start"]


