# Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html ./
RUN npm install
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

# Build server
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package.json server/tsconfig.json ./
RUN npm install
COPY server/src ./src
RUN npx tsc
RUN cp src/db/schema.sql dist/db/schema.sql

# Runtime
FROM node:22-alpine
WORKDIR /app

COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules ./node_modules
COPY --from=server-builder /app/server/package.json ./
COPY --from=frontend-builder /app/frontend/dist ./public

ARG PORT=3000
EXPOSE ${PORT}

ENV PORT=${PORT}

CMD ["node", "dist/index.js"]
