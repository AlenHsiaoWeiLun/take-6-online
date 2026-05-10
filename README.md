# Take 6 Online (6 nimmt!)

A high-quality, multiplayer Take 6 web application built with React, Node.js, and Socket.IO.

## Features
- **Real-time Multiplayer**: Authoritative server handling game state.
- **Bot Support**: Add bots to fill seats or play solo.
- **Perspective Rotation**: You are always at the bottom of the table.
- **Smooth Animations**: Framer Motion powered card movements and row takes.
- **Custom Visuals**: No standard emojis; all icons and bullheads are custom SVGs.
- **Sound Effects**: Immersive audio for game actions.
- **Reconnect Support**: Session-based reconnection.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Framer Motion, Socket.IO Client.
- **Backend**: Node.js, Express, Socket.IO, tsx.
- **Shared**: Common game logic and types shared between client and server.

## Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. If you want the bot backend, install the Python dependencies as well:
   ```bash
   pip install numpy gym==0.26.2
   pip install --index-url https://download.pytorch.org/whl/cpu torch
   ```
3. Start the development server (runs both frontend and backend):
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000` in multiple browser tabs to test multiplayer.

## Deployment
1. Copy `.env.example` to `.env` and fill in your Firebase config plus any agent overrides.
2. In Firebase Authentication, enable Google sign-in and add your production domain to Authorized domains.
3. Build the client:
   ```bash
   npm run build
   ```
4. Start the production server:
   ```bash
   npm start
   ```

The production server reads `PORT` from the environment and serves the built `dist/` bundle.

## Render Deploy
This repo includes [`render.yaml`](/Users/alenhsiao/Downloads/take-6-online/render.yaml) and a [`Dockerfile`](/Users/alenhsiao/Downloads/take-6-online/Dockerfile) so Render can run the full stack in one service: Vite build output, Express, Socket.IO, and the Python bot worker.

Deploy flow:
1. Push this repo to GitHub.
2. In Render, choose `New +` -> `Blueprint`.
3. Select this repository and let Render read `render.yaml`.
4. Deploy the `take6-online` web service.
5. After Render gives you a URL, add that domain in Firebase Authentication -> Authorized domains.

Because the frontend and backend are served by the same Render service, you do not need `VITE_SERVER_URL` for the Render deployment.

The default Render configuration uses the lightweight `RandomPlayer` bot so Docker builds stay small and reliable on the free tier. The RL adapter remains available for local development or custom deployments with extra Python dependencies.

## Bot Backend
Bots call a Python worker that loads a configurable agent class and passes it the current `hand/history`.

Default agent env:
```bash
FAI_AGENT_ROOT=./2026-FAI-Final-Release-main
FAI_AGENT_MODULE=src.players.TA.random_player
FAI_AGENT_CLASS=RandomPlayer
FAI_AGENT_ARGS={}
```

If you want to switch to the vendored RL adapter:
```bash
FAI_AGENT_ROOT=.
FAI_AGENT_MODULE=server.agents.rl6_nimmt_adapter
FAI_AGENT_CLASS=RL6NimmtAgentAdapter
FAI_AGENT_ARGS={"repo_root":"./vendor/rl-6-nimmt","agent_name":"mcts","agent_kwargs":{"mc_per_card":3,"mc_max":30}}
```

This adapter vendors [`johannbrehmer/rl-6-nimmt`](https://github.com/johannbrehmer/rl-6-nimmt) and maps this app's live board state into that repo's Gym-style observation format. It requires extra Python dependencies such as `numpy`, `gym`, and `torch`, so it is not enabled by default in the Render blueprint.

## How to Play
1. Join a seat at the table.
2. Add bots if you don't have enough players (4 players required).
3. Click "START GAME".
4. Each round, select one card from your hand.
5. Once everyone selects, cards are revealed and placed on the rows according to the rules.
6. Avoid taking cards! The player with the fewest bullheads at the end of 10 rounds wins.

## Project Structure
- `/src/shared`: Pure game logic, constants, and TypeScript types.
- `/server`: Socket.IO server and game state management.
- `/src/components`: React UI components (Cards, Table, Seats, etc.).
- `/src/store`: React Context for game state and socket communication.
- `/src/services`: Sound and other utility services.
