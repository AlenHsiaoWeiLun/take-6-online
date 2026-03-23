FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV FAI_PYTHON_BIN=python3
ENV FAI_AGENT_ROOT=./2026-FAI-Final-Release-main
ENV FAI_AGENT_MODULE=src.players.TA.random_player
ENV FAI_AGENT_CLASS=RandomPlayer
ENV FAI_AGENT_ARGS={}
ENV FAI_AGENT_TIMEOUT_MS=1500

CMD ["npm", "start"]
