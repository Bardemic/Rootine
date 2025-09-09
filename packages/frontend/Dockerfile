# Dockerfile for frontend - should be run from monorepo root
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Enable corepack to ensure modern npm
RUN corepack enable && corepack prepare npm@10.8.2 --activate

# Copy monorepo package files
COPY package*.json ./
COPY packages/api-types/package*.json ./packages/api-types/
COPY packages/backend/package*.json ./packages/backend/
COPY packages/frontend/package*.json ./packages/frontend/

# Install all dependencies for monorepo
RUN npm install

# Copy source code
COPY packages/api-types ./packages/api-types
COPY packages/backend ./packages/backend
COPY packages/frontend ./packages/frontend

# Build backend (for types), then api-types, then frontend
RUN npm run build --workspace=backend
RUN npm run build --workspace=@rootine/api-types
RUN npm run build --workspace=frontend

# Production stage
FROM node:20-bookworm-slim AS production

WORKDIR /app

# Install serve to serve the built files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/packages/frontend/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]


