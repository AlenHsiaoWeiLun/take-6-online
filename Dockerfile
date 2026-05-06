FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV FAI_PYTHON_BIN=python3
ENV FAI_AGENT_ROOT=./2026-FAI-Final-Release-main
ENV FAI_AGENT_MODULE=src.players.TA.best_player1
ENV FAI_AGENT_CLASS=BestPlayer1
ENV FAI_AGENT_ARGS={}
ENV FAI_AGENT_TIMEOUT_MS=5000

CMD ["npm", "start"]
