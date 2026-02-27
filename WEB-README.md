# TRON Light Cycles - Web Version 🌐

A browser-based TRON-themed multiplayer light cycle game. Friends can play by simply visiting a URL - no downloads required!

## Features

- **Browser-Based**: Play directly in any modern web browser
- **No Installation for Players**: Friends just visit your URL
- **Multiplayer**: Support for 2-12 players
- **Two Game Modes**: TIME (score-based) or LIVES (elimination)
- **TRON Theme**: Classic grid aesthetic with glowing light trails
- **Responsive Design**: Works on desktop and tablet
- **Optimized Performance**: Spatial partitioning collision detection, lazy cleanup batching
- **Power-Ups**: Speed boosts and special abilities
- **Identity Disc**: Throw discs at opponents
- **Dynamic Map Scaling**: Map size adjusts based on active players

## Quick Start

### 1. Install Node.js
Download and install from [nodejs.org](https://nodejs.org/) (if not already installed)

### 2. Install Dependencies
```bash
cd "/Users/tmaxwell/Personal-Project-Directory/Snake Game"
npm install
```

### 3. Start the Server
```bash
npm start
```

You'll see:
```
HTTP Server running on http://localhost:3000
WebSocket Server running on ws://localhost:5555
Share this URL with friends: http://YOUR_IP:3000
```

### 4. Play the Game

**On Your Computer:**
- Open browser and go to `http://localhost:3000`

**Friends on Same Network (WiFi/LAN):**
- Find your local IP address:
  - **Mac/Linux**: `ifconfig | grep "inet "` (look for 192.168.x.x)
  - **Windows**: `ipconfig` (look for IPv4 Address)
- Share URL: `http://YOUR_LOCAL_IP:3000` (e.g., `http://192.168.1.5:3000`)
- Friends visit that URL in their browser

**Friends on Internet (Different Houses):**
- See "Internet Play Setup" below

## Game Controls

- **W** - Move Up
- **A** - Move Left
- **S** - Move Down
- **D** - Move Right
- **SPACE** - Throw Identity Disc (when available)

## Internet Play Setup

To let friends in different houses play:

### Option 1: Port Forwarding (Recommended for Home Networks)

1. **Find Your Public IP**:
   - Visit [whatismyip.com](https://www.whatismyip.com/)

2. **Port Forward on Your Router**:
   - Forward port `3000` (HTTP) to your computer's local IP
   - Forward port `5555` (WebSocket) to your computer's local IP
   - Instructions vary by router - search "[your router model] port forwarding"

3. **Share Your URL**:
   - Give friends: `http://YOUR_PUBLIC_IP:3000`

4. **Firewall**:
   - Allow Node.js through your firewall

**Note**: Some ISPs use CGNAT which prevents port forwarding. If this doesn't work, try Option 2 or 3.

### Option 2: ngrok (Easiest for Testing)

1. **Install ngrok**: [ngrok.com/download](https://ngrok.com/download)

2. **Start Your Server**:
   ```bash
   npm start
   ```

3. **In Another Terminal, Run ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Share the ngrok URL**:
   - ngrok will give you a URL like `https://abc123.ngrok.io`
   - Share this with friends!

**Note**: Free ngrok URLs change each time. Paid plans get permanent URLs.

### Option 3: Docker Deployment (Recommended)

**⚠️ IMPORTANT FOR RENDER.COM:** Image must be built with `--platform linux/amd64`

**Quick Deploy with Docker:**
```bash
docker pull trevor2maxwell/fun:latest
docker run -d -p 3000:3000 --name snake-game trevor2maxwell/fun:latest
```

**Building for Cloud Deployment:**
```bash
docker buildx build --platform linux/amd64 -t trevor2maxwell/fun:latest --push .
```

See `DOCKER_DEPLOYMENT.md` for complete Docker instructions.

### Option 4: Cloud Hosting (Best for Permanent Server)

Deploy to a cloud provider:

**DigitalOcean/AWS/Google Cloud:**
1. Create a small VM instance ($5-10/month)
2. Upload your game files
3. Run `npm install && npm start`
4. Use the VM's public IP

**Heroku/Railway/Render (Free Tier Available):**
1. Create account
2. Deploy your code (or use Docker image: `trevor2maxwell/fun:latest`)
3. They provide a permanent URL

## Troubleshooting

### "Cannot GET /" Error
- Make sure `index.html` is in the same folder as `web-server.js`
- Restart the server

### Friends Can't Connect (Local Network)
- Check firewall settings
- Ensure all on same WiFi network
- Verify IP address is correct

### Friends Can't Connect (Internet)
- Verify port forwarding is correct (ports 3000 AND 5555)
- Check if ISP uses CGNAT (prevents port forwarding)
- Try ngrok as alternative

### WebSocket Connection Failed
- Port 5555 must be accessible
- Check firewall allows WebSocket connections
- For HTTPS sites, you need WSS (secure WebSocket)

### Game is Laggy
- Reduce number of players
- Check internet connection speed
- Close other bandwidth-heavy applications
- Consider cloud hosting for better performance

## File Structure

```
Snake Game/
├── web-server.js           # Node.js server (HTTP + WebSocket)
├── index.html              # Game client (HTML/CSS/JS)
├── package.json            # Node.js dependencies
├── Dockerfile              # Docker container configuration
├── .dockerignore           # Docker build exclusions
├── WEB-README.md           # This file
├── DOCKER_DEPLOYMENT.md    # Docker deployment guide
└── BUG_LOG.md              # Known bugs and fixes
```

## How It Works

1. **HTTP Server** (Port 3000): Serves the HTML game page
2. **WebSocket Server** (Port 5555): Handles real-time game communication
3. **Browser Client**: Players connect via browser, no downloads needed

## Advantages Over Desktop Version

✅ **No Installation**: Players just visit a URL  
✅ **Cross-Platform**: Works on Windows, Mac, Linux, tablets  
✅ **Easy Updates**: Update server, everyone gets new version  
✅ **Shareable**: Send a link, friends can play immediately  

## Desktop Version Still Available

The original Pygame desktop version is still available:
- `server.py` - Python server
- `client.py` - Python client
- See `README.md` for desktop instructions

## Technical Details

- **Backend**: Node.js with WebSocket (ws library)
- **Frontend**: HTML5 Canvas, vanilla JavaScript
- **Protocol**: WebSocket for real-time communication
- **Ports**: 3000 (HTTP), 5555 (WebSocket)
- **Tick Rate**: 15 FPS
- **Message Protocol**: msgpack-lite for binary serialization
- **Optimization**: Spatial grid collision detection, delta compression

## Recent Updates

### Latest Version (February 2026)
- ✅ **Bug Fix**: Lives mode timer accumulation resolved (no more lag)
- ✅ **Performance**: Spatial partitioning for efficient collision detection
- ✅ **Optimization**: Lazy cleanup batching reduces overhead
- ✅ **Scaling**: Increased max players from 11 to 12
- ✅ **Docker**: Pre-built images available at `trevor2maxwell/fun:latest`

See `BUG_LOG.md` for detailed bug tracking and fixes.

## Tips for Best Experience

- Use Chrome, Firefox, or Safari (latest versions)
- Wired ethernet connection for hosting
- Keep player count reasonable (2-8 for best performance)
- For internet play, use Docker deployment or cloud hosting for stability
- Lives mode and Time mode now have identical performance

Enjoy the game! 🏍️💨
