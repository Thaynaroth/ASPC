FROM node:22-alpine AS build
WORKDIR /app

COPY frontend/package.json ./
RUN npm install

COPY frontend/ ./

FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/vite.config.ts ./vite.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY frontend/src/ ./src/
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
