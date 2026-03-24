FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN pip3 install --no-cache-dir numpy gym==0.26.2 \
  && pip3 install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch

RUN npm run build

ENV NODE_ENV=production
ENV FAI_PYTHON_BIN=python3
ENV FAI_AGENT_ROOT=.
ENV FAI_AGENT_MODULE=server.agents.rl6_nimmt_adapter
ENV FAI_AGENT_CLASS=RL6NimmtAgentAdapter
ENV FAI_AGENT_ARGS={"repo_root":"./vendor/rl-6-nimmt","agent_name":"mcts","agent_kwargs":{"mc_per_card":3,"mc_max":30}}
ENV FAI_AGENT_TIMEOUT_MS=5000

CMD ["npm", "start"]
