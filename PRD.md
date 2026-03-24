# TRON Zoom Game - Product Requirements Document

## Goal
Simple multiplayer TRON game for Zoom calls - $1.99 one-time purchase

## Key Features
- **Multiplayer with Zoom call participants** - this is the main feature
- **Host pays only** - only meeting host needs to buy the game
- **Easy to start** - one click to launch game in call
- **2-11 players** - current game supports up to 11 players
- **Two game modes:** TIME (score-based) and LIVES (last player standing)
- **TRON theme** - glowing trails, classic look
- **Dynamic map sizes** - adjusts based on player count

## How It Works

### User Flow
1. Host buys game for $1.99 in Zoom Marketplace
2. Host starts game during Zoom call
3. Other call members join automatically (free)
4. Everyone plays together in the same game

### Technical Flow
1. Game launches in Zoom iframe
2. Connects to game server (fly.io)
3. All players in same Zoom call join same game room
4. Real-time gameplay via WebSocket

## Server & Hosting Options

### Option 1: Peer-to-Peer (WebRTC) - ZERO COST ⭐ RECOMMENDED
**How it works:** Players connect directly to each other, no central server needed
- **Pros:** **$0 ongoing costs**, low latency, encrypted connections
- **Cons:** Limited to 2-4 players reliably, requires signaling server
- **Cost:** FREE (just need tiny signaling server)
- **Zoom integration:** Game runs in Zoom iframe, P2P connections between players

### Option 2: Serverless (Cloud Functions) - LOW COST
**How it works:** Game logic runs on-demand, not 24/7 server
- **Pros:** Pay only when games are played, scales automatically
- **Cons:** Some latency, complexity
- **Cost:** $0-10/month (based on usage)
- **Zoom integration:** Game runs in Zoom iframe, backend on cloud functions

### Option 3: External Server (fly.io) - HIGH COST
**How it works:** Your current setup - dedicated server 24/7
- **Pros:** Full control, proven to work
- **Cons:** $120-240/year ongoing costs
- **Cost:** ~$10-20/month
- **Current status:** Already configured as `tron-game`

## How Peer-to-Peer Works with Zoom

### Architecture Overview
```
Zoom App (iframe) → WebRTC DataChannel → Direct Player-to-Player
                      ↓
                 Tiny Signaling Server (only for connection setup)
```

### What This Means:
1. **Game runs in Zoom iframe** - your app loads in Zoom
2. **Players connect P2P** - WebRTC DataChannel for game data
3. **Tiny signaling server** - only helps players find each other
4. **No game server needed** - no 24/7 costs

### Technical Implementation
- **WebRTC DataChannel:** Encrypted P2P data transfer (like your current WebSocket)
- **Signaling server:** Tiny server just for connection setup (can be free tier)
- **Zoom integration:** Get meeting participants, start game, handle payments

## Technical Reality Check

**✅ GOOD NEWS:** Zoom Apps DO support WebSocket connections to external servers!
- You can connect your game server via `wss://` protocol
- Need to add `wss://your-server.com` to content security policy
- Real-time multiplayer is fully possible

**⚠️ LIMITATIONS:**
- Each Zoom App can only have one WebSocket connection at a time
- But this is fine for your game (one connection per game instance)
- External server approach gives you full control

## Recommendation: Use Peer-to-Peer (WebRTC)

**Why Peer-to-Peer is best choice:**
- ✅ **$0 ongoing costs**
- ✅ **Low latency**, encrypted connections
- ✅ **No game server needed** - no 24/7 costs
- ✅ **Proven technology** - WebRTC is widely used

**Cost Analysis:**
- If you sell 50 copies at $2.99 = ~$105-$127 net revenue
- Hosting cost $0 (Peer-to-Peer) = **$105-$127 profit**
- **Break even:** ~20 sales instead of 40-60

**Alternative:** Start with Peer-to-Peer, migrate to self-hosted later if costs become an issue.

## Payment Model

### One-Time Purchase: $2.99 (Not $1.99)

**Why $2.99 over $1.99:**
- **Zoom's cut:** ~15-30% marketplace fee
- **Net per sale:** ~$2.09-$2.54 (not $1.39-$1.69)
- **Psychological price:** $2.99 feels like premium but not expensive
- **Competition:** Free alternatives exist - need to feel valuable

**Why NOT subscription:**
- Casual party game - doesn't justify recurring charges
- Host churn would be immediate
- One-time removes friction, encourages word-of-mouth
- Zoom hosts already pay $13-22/month - $2.99 is impulse-buy range

**Target profit per sale:**
- **$2.09-$2.54 net** (after Zoom fees)
- **50 sales = $105-$127 profit** (vs $79 at $1.99)
- **200 sales = $418-$508 profit** (vs $199 at $1.99)

### Host-Only Payment Model
**Simple approach - only meeting host pays:**

1. **Purchase Flow**
   - Host finds "TRON Game" in Zoom Marketplace
   - Clicks "Buy for $2.99" 
   - Zoom handles payment (Stripe integration)
   - Host gets permanent license

2. **Game Access Rules**
   - Host: Can start unlimited games (paid)
   - Players: Join any host's game free
   - Validation: Check if host paid before game starts

3. **Technical Implementation**
   - Store paid host list in database
   - Check host payment status on game start
   - Zoom sends payment confirmation webhook
   - Simple boolean: `host_has_paid = true/false`

### Why This Model Works
- **Easy to understand:** One person pays, everyone plays
- **No friction:** Players don't need to pull out credit cards
- **Viral:** Hosts bring new players to game
- **Fair:** Host gets value, players get free fun

## Technical Requirements

### Zoom Call Integration (The Magic!)
**How players in same call automatically join same game:**

1. **Game Room by Meeting ID**
   - Each Zoom call has unique meeting ID
   - Game creates room using meeting ID
   - All players in call get same room code

2. **Participant Detection**
   - Zoom tells us who's in the call
   - Only call members can join that game room
   - New call members can join mid-game

3. **Automatic Joining**
   - Player clicks "Start Game" 
   - App gets their Zoom meeting ID
   - Auto-joins correct game room
   - No typing room codes!

### Zoom Integration Technical Steps
- Get meeting ID from Zoom context
- Get list of meeting participants  
- Validate players are in the same call
- Handle participants joining/leaving mid-game

### Game Features (Based on Current Game)
- **Movement:** WASD keys for each player
- **Rules:** Hit trail = respawn, last alive wins (LIVES mode) or highest score wins (TIME mode)
- **Visual:** TRON grid, glowing light trails
- **Performance:** 15 FPS (current), TCP Sockets
- **Player count:** 2-11 players with dynamic map sizing
- **Game modes:** TIME (set time limit) and LIVES (limited respawns)

### Security
- Validate Zoom meeting participants
- Prevent non-call members from joining
- Rate limit connections
- Sanitize player names

## Development Plan

### Phase 1: Core Integration (2 weeks)
- Add Zoom OAuth to existing game
- Create installable app setup
- Basic meeting participant detection
- Deploy to fly.io

### Phase 2: Payment & Polish (1 week)
- Configure $1.99 pricing
- Host-only validation
- Marketplace submission materials
- Security hardening

### Phase 3: Launch (1 week)
- Submit to Zoom Marketplace
- Testing with real Zoom calls
- Bug fixes
- Launch!

## Success Metrics
- Number of installs
- Games played per host
- Player retention
- Server costs vs revenue

