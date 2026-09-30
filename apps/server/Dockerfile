# Game server image for Railway. Build context is the repo root:
#   docker build -f apps/server/Dockerfile .
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY . .
RUN npm ci --ignore-scripts && npm run build -w @take6/server && npm prune --omit=dev --ignore-scripts

FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/server/package.json ./apps/server/package.json
COPY --from=build /app/apps/server/prisma ./apps/server/prisma
COPY --from=build /app/apps/server/dist ./apps/server/dist
WORKDIR /app/apps/server
EXPOSE 3001
CMD ["node", "dist/index.js"]
