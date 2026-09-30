#!/usr/bin/env bash
# Deploys the game server to InsForge Compute (Fly.io under the hood, scale-to-zero by default).
#
#   ENV_FILE=apps/server/.env.production scripts/deploy-server-insforge.sh
#
# Needs: flyctl on PATH, `npx @insforge/cli login`, and a directory linked to the project
# (INSFORGE_PROJECT_DIR, default: repo root — `npx @insforge/cli link --project-id <id>`).
# The env file holds production secrets (DATABASE_URL, INSFORGE_URL, WEB_ORIGINS…) and is never committed.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
LINKED=${INSFORGE_PROJECT_DIR:-$ROOT}
ENV_FILE=$(cd "$(dirname "${ENV_FILE:-$ROOT/apps/server/.env.production}")" && pwd)/$(basename "${ENV_FILE:-.env.production}")
SERVICE=${SERVICE:-bullheads-server}
REGION=${REGION:-sin}

[ -f "$ENV_FILE" ] || { echo "Missing env file: $ENV_FILE" >&2; exit 1; }
[ -f "$LINKED/.insforge/project.json" ] || { echo "$LINKED is not linked to an InsForge project" >&2; exit 1; }

# Build context = the committed tree, with the server Dockerfile at its root.
CTX=$(mktemp -d)
trap 'rm -rf "$CTX"' EXIT
git -C "$ROOT" archive HEAD | tar -x -C "$CTX"
cp "$ROOT/apps/server/Dockerfile" "$CTX/Dockerfile"
cp "$ROOT/apps/server/Dockerfile.dockerignore" "$CTX/.dockerignore"

echo "→ applying database migrations"
(cd "$ROOT/apps/server" && set -a && . "$ENV_FILE" && set +a && npx prisma migrate deploy)

echo "→ deploying $SERVICE ($REGION)"
cd "$LINKED"
npx -y @insforge/cli compute deploy "$CTX" --name "$SERVICE" --port 3001 --region "$REGION" --memory 512 --env-file "$ENV_FILE"
