#!/usr/bin/env bash
set -euo pipefail

NET="aspc-net"
POSTGRES_IMAGE="postgres:16-alpine"
POSTGRES_CONTAINER="aspc-postgres"
BACKEND_IMAGE="aspc-backend"
BACKEND_CONTAINER="aspc-backend"
FRONTEND_IMAGE="aspc-frontend"
FRONTEND_CONTAINER="aspc-frontend"
POSTGRES_VOLUME="aspc_postgres_data"

cleanup() {
  echo "Stopping containers..."
  docker stop $FRONTEND_CONTAINER $BACKEND_CONTAINER $POSTGRES_CONTAINER 2>/dev/null || true
  docker rm $FRONTEND_CONTAINER $BACKEND_CONTAINER $POSTGRES_CONTAINER 2>/dev/null || true
}

trap cleanup EXIT

# ---- Network ----
docker network inspect $NET &>/dev/null || docker network create $NET

# ---- Volume ----
docker volume inspect $POSTGRES_VOLUME &>/dev/null || docker volume create $POSTGRES_VOLUME

# ---- Build images ----
echo "==> Building backend image..."
docker build -f backend/Dockerfile -t $BACKEND_IMAGE --target run .

echo "==> Building frontend image..."
docker build -f frontend/Dockerfile -t $FRONTEND_IMAGE --target dev .

# ---- PostgreSQL ----
echo "==> Starting PostgreSQL..."
docker run -d \
  --name $POSTGRES_CONTAINER \
  --network $NET \
  -v $POSTGRES_VOLUME:/var/lib/postgresql/data \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aspc_dev \
  -p 5432:5432 \
  --health-cmd "pg_isready -U postgres" \
  --health-interval 3s \
  --health-timeout 3s \
  --health-retries 10 \
  $POSTGRES_IMAGE

echo "==> Waiting for PostgreSQL to be healthy..."
until docker inspect --format='{{.State.Health.Status}}' $POSTGRES_CONTAINER 2>/dev/null | grep -q healthy; do
  sleep 2
done
echo "PostgreSQL is healthy."

# ---- Backend ----
echo "==> Starting Backend..."
docker run -d \
  --name $BACKEND_CONTAINER \
  --network $NET \
  -e DATABASE_URL="postgresql://postgres:postgres@$POSTGRES_CONTAINER:5432/aspc_dev" \
  -e JWT_SECRET="change-me-in-production" \
  -e FRONTEND_URL="http://localhost:5173" \
  -e PORT=3001 \
  -e NODE_ENV=production \
  -e HOST=0.0.0.0 \
  -p 3001:3001 \
  $BACKEND_IMAGE

# ---- Frontend ----
echo "==> Starting Frontend..."
docker run -d \
  --name $FRONTEND_CONTAINER \
  --network $NET \
  -v "$PWD/frontend/src:/app/src" \
  -p 5173:5173 \
  $FRONTEND_IMAGE

echo ""
echo "======================================"
echo "  All services are running!"
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:3001"
echo "  Postgres:  localhost:5432"
echo "======================================"
echo ""
echo "Press Ctrl+C to stop all containers."

# Keep running until Ctrl+C
while true; do sleep 10; done
