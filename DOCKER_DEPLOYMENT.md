# Docker Deployment Guide - Snake Game

## ⚠️ IMPORTANT: Platform Compatibility

**CRITICAL FOR RENDER.COM AND CLOUD DEPLOYMENTS:**

The Docker image **MUST** be built for `linux/amd64` platform to work on Render.com and most cloud providers.

**Correct Build Command:**
```bash
docker buildx build --platform linux/amd64 -t trevor2maxwell/fun:latest --push .
```

**Error if wrong platform:**
```
The provided image URL points to an image with an invalid platform.
Images must be built with the platform linux/amd64.
```

**Current Image:** Built with `linux/amd64` ✅

---

## Available Docker Images

**Docker Hub Repository:** `trevor2maxwell/fun`

**Available Tags:**
- `latest` - Stable production release (linux/amd64)
- `next` - Latest development build with newest features

---

## Quick Start

### Deploy Latest Stable Version
```bash
docker pull trevor2maxwell/fun:latest
docker run -d -p 3000:3000 --name snake-game trevor2maxwell/fun:latest
```

### Deploy Next Development Version
```bash
docker pull trevor2maxwell/fun:next
docker run -d -p 3000:3000 --name snake-game-next trevor2maxwell/fun:next
```

---

## Deployment Commands

### Pull Images
```bash
# Pull latest stable
docker pull trevor2maxwell/fun:latest

# Pull next development
docker pull trevor2maxwell/fun:next
```

### Run Container
```bash
# Run latest on port 3000
docker run -d \
  -p 3000:3000 \
  --name snake-game \
  --restart unless-stopped \
  trevor2maxwell/fun:latest

# Run next on different port (3001)
docker run -d \
  -p 3001:3000 \
  --name snake-game-next \
  --restart unless-stopped \
  trevor2maxwell/fun:next
```

### Container Management
```bash
# View running containers
docker ps

# View logs
docker logs snake-game
docker logs -f snake-game  # Follow logs

# Stop container
docker stop snake-game

# Start container
docker start snake-game

# Restart container
docker restart snake-game

# Remove container
docker rm -f snake-game
```

---

## Building and Pushing New Images

### Build Local Image

**⚠️ IMPORTANT: Always specify platform for cloud deployments**

```bash
# Build for latest (Render.com compatible)
docker buildx build --platform linux/amd64 -t trevor2maxwell/fun:latest --load .

# Build for next (Render.com compatible)
docker buildx build --platform linux/amd64 -t trevor2maxwell/fun:next --load .
```

### Push to Docker Hub
```bash
# Login to Docker Hub
docker login

# Push latest
docker push trevor2maxwell/fun:latest

# Push next
docker push trevor2maxwell/fun:next
```

### Multi-Platform Build (ARM64 + AMD64)
```bash
# Create builder
docker buildx create --use

# Build and push multi-platform latest
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t trevor2maxwell/fun:latest \
  --push .

# Build and push multi-platform next
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t trevor2maxwell/fun:next \
  --push .
```

---

## Docker Compose Deployment

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  snake-game-latest:
    image: trevor2maxwell/fun:latest
    container_name: snake-game-latest
    ports:
      - "3000:3000"
    restart: unless-stopped
    
  snake-game-next:
    image: trevor2maxwell/fun:next
    container_name: snake-game-next
    ports:
      - "3001:3000"
    restart: unless-stopped
```

**Deploy with Docker Compose:**
```bash
# Start both versions
docker-compose up -d

# Stop both versions
docker-compose down

# View logs
docker-compose logs -f
```

---

## Cloud Deployment

### Deploy to Render.com

**⚠️ CRITICAL: Image must be built with `--platform linux/amd64`**

1. Connect your Docker Hub repository
2. Create new Web Service
3. Select Docker deployment
4. Image URL: `trevor2maxwell/fun:latest`
5. Port: `3000`

**Note:** If you get "invalid platform" error, rebuild image with:
```bash
docker buildx build --platform linux/amd64 -t trevor2maxwell/fun:latest --push .
```

### Deploy to Railway.app
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Deploy to Fly.io
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login and launch
fly auth login
fly launch --image trevor2maxwell/fun:latest
```

---

## Environment Variables (Optional)

If you need to configure the server:

```bash
docker run -d \
  -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  --name snake-game \
  trevor2maxwell/fun:latest
```

---

## Health Check

```bash
# Check if server is running
curl http://localhost:3000

# Check container health
docker inspect --format='{{.State.Health.Status}}' snake-game
```

---

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs snake-game

# Check if port is in use
lsof -i :3000

# Remove and recreate
docker rm -f snake-game
docker run -d -p 3000:3000 --name snake-game trevor2maxwell/fun:latest
```

### Update to latest version
```bash
# Pull new image
docker pull trevor2maxwell/fun:latest

# Stop and remove old container
docker stop snake-game
docker rm snake-game

# Run new container
docker run -d -p 3000:3000 --name snake-game trevor2maxwell/fun:latest
```

---

## Version Information

**Current Fixes in Latest Build:**
- ✅ Bug #3: Lives Mode Timer Accumulation - RESOLVED
- ✅ Spatial partitioning for collision detection
- ✅ Lazy cleanup batching
- ✅ Support for up to 12 players
- ✅ Dynamic map scaling

**Access the game:**
- Latest: http://localhost:3000
- Next: http://localhost:3001

---

## Notes

- Server runs on port 3000 inside container
- Map to any external port using `-p <external>:3000`
- Both `latest` and `next` can run simultaneously on different ports
- Use `latest` for production, `next` for testing new features
