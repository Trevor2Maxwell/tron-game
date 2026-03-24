# TRON Light Cycles - Multiplayer Game

A TRON-themed multiplayer light cycle game where you drive a bike leaving a light stream trail. Hit any trail and you respawn!

## 🚨 Important - Before Making Changes

**ALWAYS check documentation first**:
- See [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) for deployment requirements
- Review [DEVELOPMENT.md](DEVELOPMENT.md) for development guidelines
- Check existing files before making changes

## Features

- **Multiplayer**: Support for 2-11 players
- **Two Game Modes**:
  - **TIME**: Play for a set time limit, highest score wins
  - **LIVES**: Limited lives, last player standing wins
- **TRON Theme**: Classic grid aesthetic with glowing light trails
- **Network Play**: Play with friends on local network OR over the internet
- **Dynamic Map Sizes**: Map size automatically adjusts based on number of players

## Installation

1. **Install Node.js 18+** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)

2. **Install dependencies**:
   ```bash
   npm install
   ```

## How to Play

### Web Browser (Recommended)

#### Host (You):
1. Start the server:
   ```bash
   npm start
   ```

2. Open your browser and go to:
   ```
   http://localhost:3000
   ```

3. Configure the game settings and start playing!

#### Friends (Players):
1. Open their browser and go to:
   ```
   http://YOUR_IP_ADDRESS:3000
   ```
   (Replace YOUR_IP_ADDRESS with your host's IP)

### For Local Network (Same WiFi/LAN)

#### Find your local IP address:
- **Mac/Linux**: Open Terminal and run `ifconfig | grep "inet "` (look for 192.168.x.x)
- **Windows**: Open Command Prompt and run `ipconfig` (look for IPv4 Address)

### For Internet Play (Different Houses)

#### Host (You):
1. **Port Forward** on your router:
   - Forward port `3000` (TCP) to your computer's local IP
   - Instructions vary by router - search "[your router model] port forwarding"

2. Find your **public IP address**:
   - Visit [whatismyip.com](https://whatismyip.com/)
   - Share this IP with your friends

3. Start the server:
   ```bash
   npm start
   ```

#### Friends (Players):
1. Open their browser and go to:
   ```
   http://YOUR_PUBLIC_IP:3000
   ```

**Note**: Some ISPs use CGNAT which prevents port forwarding. If this doesn't work, consider using:
- ngrok (tunneling service)
- Cloud hosting (Fly.io, Render, etc.)

### Python Client (Legacy - Deprecated)

The Python client/server is deprecated and not recommended for new deployments. Use the web browser client for the best experience and compatibility with Zoom integration.

**To use legacy Python client (not recommended):**
```bash
# Install Python dependencies (deprecated)
pip install -r requirements.txt

# Start Python server (deprecated)
python server.py

# Start Python client (deprecated)
python client.py
```

## Game Controls

### Menu Screen:
- **Type** to enter name and server IP
- **TAB**: Switch between input fields
- **UP/DOWN**: Adjust number of players (2-11)
- **M**: Toggle game mode (TIME/LIVES)
- **T**: Adjust time limit (TIME mode only)
- **ENTER**: Connect to server

### Lobby:
- **SPACE**: Ready up (game starts when all players ready)

### In-Game:
- **W**: Move Up
- **A**: Move Left
- **S**: Move Down
- **D**: Move Right

### Game Over:
- **ESC**: Return to menu

## Game Rules

1. **Movement**: Control your light cycle with WASD keys
2. **Light Trails**: Your cycle leaves a permanent trail behind it
3. **Collision**: Hit any trail (yours or others) → you respawn
4. **Scoring (TIME mode)**: Survive and avoid collisions to maximize score
5. **Lives (LIVES mode)**: Limited respawns, last player alive wins
6. **Map Size**: Automatically scales based on number of players

## Troubleshooting

### "Connection refused" error:
- Make sure the Node.js server is running first (`npm start`)
- Check firewall settings (allow Node.js/Port 3000 through firewall)
- Verify the IP address is correct

### Friends can't connect (local network):
- Ensure all players are on the same WiFi/LAN
- Check router firewall settings (allow port 3000)
- Try disabling firewall temporarily to test

### Friends can't connect (internet):
- Verify port forwarding is configured correctly for port 3000
- Check if ISP uses CGNAT (prevents port forwarding)
- Try alternative solutions like ngrok or cloud hosting

### Game is laggy:
- Reduce number of players
- Ensure stable network connection
- Close other network-heavy applications

## Technical Details

- **Backend**: Node.js 18+
- **Frontend**: HTML5 Canvas + JavaScript
- **Networking**: WebSockets (real-time bidirectional)
- **Server Port**: 3000 (HTTP + WebSocket)
- **Tick Rate**: 15 FPS
- **Deployment**: Docker containerized

## Tips for Best Experience

- Use wired ethernet connection for hosting
- Keep player count reasonable (2-6 for best performance)
- Make sure all players have stable internet
- Host on a computer with good CPU/RAM

Enjoy the game! 🏍️💨
