# --- Build stage ---
FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- Production stage ---
FROM node:22-slim AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production \
	MCP_HOST=0.0.0.0
EXPOSE 3002

CMD ["node", "dist/index.js"]
