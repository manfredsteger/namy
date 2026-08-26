# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files and install dependencies
# IMPORTANT: Use COPY package.json (NOT package*.json). We deliberately ignore package-lock.json
# here because npm on Alpine misses @rollup/rollup-linux-arm64-musl if lockfile is from macOS (npm/cli#4828)
COPY package.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Vite application and the server
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine AS runner
WORKDIR /app

# Copy package files and install production dependencies only
# IMPORTANT: Never revert this to package*.json (see comment in builder stage)
COPY package.json ./
RUN npm install --omit=dev

# Copy the built assets from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

# The environment requires port 3000
ENV PORT=3000
ENV NODE_ENV=production
EXPOSE 3000

# Start the server
CMD ["node", "server/dist/index.js"]
