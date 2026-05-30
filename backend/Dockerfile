FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci

COPY prisma/ ./prisma/
COPY backend/ ./backend/

RUN npx prisma generate --schema=prisma/schema.prisma
RUN npm run build -w backend

FROM node:22-alpine AS run
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001

COPY --from=build --chown=appuser:nodejs /app/backend/dist ./dist
COPY --from=build --chown=appuser:nodejs /app/backend/package.json ./package.json
COPY --from=build --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=build --chown=appuser:nodejs /app/node_modules ./node_modules

USER appuser
EXPOSE 3001
ENV NODE_ENV=production
CMD ["node", "dist/server.js"]
