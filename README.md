# TRON Light Cycles - Multiplayer Game

A TRON-themed multiplayer light cycle game where you drive a bike leaving a light stream trail. Hit any trail and you respawn!

## Features

- **Multiplayer**: Support for 2-11 players
- **Two Game Modes**:
  - **TIME**: Play for a set time limit, highest score wins
  - **LIVES**: Limited lives, last player standing wins
- **TRON Theme**: Classic grid aesthetic with glowing light trails
- **Network Play**: Play with friends on local network OR over the internet
- **Dynamic Map Sizes**: Map size automatically adjusts based on number of players

## Installation

1. **Install Python 3.x** (if not already installed)
   - Download from [python.org](https://www.python.org/downloads/)

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## How to Play

### For Local Network (Same WiFi/LAN)

#### Host (You):
1. Find your local IP address:
   - **Mac/Linux**: Open Terminal and run `ifconfig | grep "inet "` (look for 192.168.x.x)
   - **Windows**: Open Command Prompt and run `ipconfig` (look for IPv4 Address)

2. Start the server:
   ```bash
   python server.py
   ```

3. Start your client:
   ```bash
   python client.py
   ```
   - Enter your name
   - Server IP: Use `127.0.0.1` (localhost)
   - Configure number of players and game mode
   - Press ENTER to connect

#### Friends (Players):
1. Start the client:
   ```bash
   python client.py
   ```
   - Enter your name
   - Server IP: Enter the host's IP address (e.g., `192.168.1.5`)
   - Press ENTER to connect

### For Internet Play (Different Houses)

#### Host (You):
1. **Port Forward** on your router:
   - Forward port `5555` (TCP) to your computer's local IP
   - Instructions vary by router - search "[your router model] port forwarding"

2. Find your **public IP address**:
   - Visit [whatismyip.com](https://www.whatismyip.com/)
   - Share this IP with your friends

3. Start the server:
   ```bash
   python server.py
   ```

4. Start your client and connect to `127.0.0.1`

#### Friends (Players):
1. Start the client:
   ```bash
   python client.py
   ```
   - Enter your name
   - Server IP: Enter the host's **public IP address**
   - Press ENTER to connect

**Note**: Some ISPs use CGNAT which prevents port forwarding. If this doesn't work, consider using:
- Hamachi/ZeroTier (creates virtual LAN)
- ngrok (tunneling service)
- Cloud hosting (AWS, DigitalOcean, etc.)

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
- Make sure the server is running first
- Check firewall settings (allow Python through firewall)
- Verify the IP address is correct

### Friends can't connect (local network):
- Ensure all players are on the same WiFi/LAN
- Check router firewall settings
- Try disabling firewall temporarily to test

### Friends can't connect (internet):
- Verify port forwarding is configured correctly
- Check if ISP uses CGNAT (prevents port forwarding)
- Try alternative solutions like Hamachi or ngrok

### Game is laggy:
- Reduce number of players
- Ensure stable network connection
- Close other network-heavy applications

## Technical Details

- **Language**: Python 3.x
- **Graphics**: Pygame
- **Networking**: TCP Sockets
- **Server Port**: 5555
- **Tick Rate**: 15 FPS

## Tips for Best Experience

- Use wired ethernet connection for hosting
- Keep player count reasonable (2-6 for best performance)
- Make sure all players have stable internet
- Host on a computer with good CPU/RAM

Enjoy the game! 🏍️💨
