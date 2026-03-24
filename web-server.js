const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');
const msgpack = require('msgpack-lite');
const Database = require('better-sqlite3');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const crypto = require('crypto');
require('dotenv').config();

// Initialize persistent database
const db = new Database('/data/tron.db');

// Create tables on first run
db.exec(`
  CREATE TABLE IF NOT EXISTS paid_hosts (
    zoom_user_id TEXT PRIMARY KEY,
    paid_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS oauth_tokens (
    zoom_user_id TEXT PRIMARY KEY,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Efficient comparison functions - avoid expensive JSON.stringify
function arrayEquals(a, b) {
    if (!a || !b) return a === b;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (Array.isArray(a[i]) && Array.isArray(b[i])) {
            if (!arrayEquals(a[i], b[i])) return false;
        } else if (a[i] !== b[i]) return false;
    }
    return true;
}

function objectEquals(a, b) {
    if (a === b) return true;
    if (!a || !b) return a === b;
    if (typeof a !== 'object' || typeof b !== 'object') return a === b;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let key of keysA) {
        if (!keysB.includes(key)) return false;
        if (Array.isArray(a[key]) && Array.isArray(b[key])) {
            if (!arrayEquals(a[key], b[key])) return false;
        } else if (typeof a[key] === 'object' && typeof b[key] === 'object') {
            if (!objectEquals(a[key], b[key])) return false;
        } else if (a[key] !== b[key]) return false;
    }
    return true;
}

const PORT = process.env.PORT || 3000;
const WS_PORT = 5555;

const MAP_SIZES = {
    2: [120, 80],
    3: [165, 110],
    4: [180, 120],
    5: [195, 130],
    6: [210, 140],
    7: [225, 150],
    8: [240, 160],
    9: [255, 170],
    10: [270, 180],
    11: [300, 200],
    12: [300, 200]
};

const MAX_TRAIL_LENGTH = 30;
const TRAIL_FADE_TIME = 4000;
const TRAIL_RESTART_DELAY = 1500;

const PLAYER_COLORS = [
    [0, 255, 255],
    [255, 100, 0],
    [255, 0, 255],
    [0, 255, 0],
    [255, 255, 0],
    [255, 0, 0],
    [128, 0, 255],
    [0, 200, 255],
    [255, 50, 150],
    [100, 255, 50],
    [255, 255, 255]
];

class LightCycle {
    constructor(playerId, name, color, gridWidth, gridHeight, initialLives = 5) {
        this.playerId = playerId;
        this.name = name;
        this.color = color;
        this.gridWidth = gridWidth;
        this.gridHeight = gridHeight;
        this.resetPosition();
        this.score = 0;
        this.deaths = 0;
        this.lives = initialLives;
        this.maxLives = initialLives;
        this.alive = true;
        this.disconnectedTrails = [];
        this.speedBoost = false;
        this.speedBoostEndTime = 0;
        this.trailDisabled = false;
        this.trailRestartTime = 0;
        this.deathTimestamp = null;
        this.fading = false;
        this.frameCounter = 0;
        this.disc = null;
        this.discCooldown = 0;
        this.discHeld = false;
        this.respawnTimer = null; // Track respawn timer for cleanup
    }

    resetPosition() {
        const paddingX = Math.max(5, Math.floor(this.gridWidth * 0.1));
        const paddingY = Math.max(5, Math.floor(this.gridHeight * 0.1));
        this.x = Math.floor(Math.random() * (this.gridWidth - paddingX * 2)) + paddingX;
        this.y = Math.floor(Math.random() * (this.gridHeight - paddingY * 2)) + paddingY;
        const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
        this.direction = directions[Math.floor(Math.random() * directions.length)];
        this.trail = [[this.x, this.y]];
        this.disconnectedTrails = [];
        this.disc = null;
        this.discCooldown = 0;
        this.discHeld = false;
    }
    
    holdDisc() {
        if (this.disc || this.discCooldown > Date.now()) return;
        
        this.discHeld = true;
        
        let offsetX = 0, offsetY = 0;
        if (this.direction === 'UP') {
            offsetX = 3;
            offsetY = 0;
        } else if (this.direction === 'DOWN') {
            offsetX = -3;
            offsetY = 0;
        } else if (this.direction === 'LEFT') {
            offsetX = 0;
            offsetY = -3;
        } else if (this.direction === 'RIGHT') {
            offsetX = 0;
            offsetY = 3;
        }
        
        this.disc = {
            x: this.x + offsetX,
            y: this.y + offsetY,
            offsetX: offsetX,
            offsetY: offsetY,
            held: true,
            phase: 'held',
            angle: 0,
            angularVelocity: -0.2,
            radius: 0,
            maxRadius: 12,
            straightDistance: 0,
            maxStraightDistance: 15
        };
    }
    
    releaseDisc() {
        if (!this.disc || !this.disc.held) return;
        
        this.discHeld = false;
        
        let vx = 0, vy = 0;
        if (this.direction === 'UP') {
            vy = -2;
        } else if (this.direction === 'DOWN') {
            vy = 2;
        } else if (this.direction === 'LEFT') {
            vx = -2;
        } else if (this.direction === 'RIGHT') {
            vx = 2;
        }
        
        this.disc.held = false;
        this.disc.phase = 'straight';
        this.disc.vx = vx;
        this.disc.vy = vy;
    }
    
    updateDisc() {
        if (!this.disc) return;
        
        if (this.disc.phase === 'held') {
            let offsetX = 0, offsetY = 0;
            if (this.direction === 'UP') {
                offsetX = 3;
                offsetY = 0;
            } else if (this.direction === 'DOWN') {
                offsetX = -3;
                offsetY = 0;
            } else if (this.direction === 'LEFT') {
                offsetX = 0;
                offsetY = -3;
            } else if (this.direction === 'RIGHT') {
                offsetX = 0;
                offsetY = 3;
            }
            
            this.disc.x = this.x + offsetX;
            this.disc.y = this.y + offsetY;
            return;
        }
        
        if (this.disc.phase === 'straight') {
            this.disc.x += this.disc.vx;
            this.disc.y += this.disc.vy;
            this.disc.straightDistance += Math.abs(this.disc.vx) + Math.abs(this.disc.vy);
            
            if (this.disc.straightDistance >= this.disc.maxStraightDistance) {
                this.disc.phase = 'loop';
                this.disc.loopStartX = this.disc.x;
                this.disc.loopStartY = this.disc.y;
            }
        } else if (this.disc.phase === 'loop') {
            this.disc.angle += this.disc.angularVelocity;
            this.disc.radius = Math.min(this.disc.radius + 0.8, this.disc.maxRadius);
            
            if (this.disc.radius >= this.disc.maxRadius) {
                this.disc.phase = 'return';
            }
            
            this.disc.x = this.disc.loopStartX + Math.cos(this.disc.angle) * this.disc.radius;
            this.disc.y = this.disc.loopStartY + Math.sin(this.disc.angle) * this.disc.radius;
        } else if (this.disc.phase === 'return') {
            const toPlayerX = this.x - this.disc.x;
            const toPlayerY = this.y - this.disc.y;
            const dist = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY);
            
            if (dist < 2) {
                this.disc = null;
                this.discCooldown = Date.now() + 5000;
                return;
            }
            
            const speed = 3;
            this.disc.x += (toPlayerX / dist) * speed;
            this.disc.y += (toPlayerY / dist) * speed;
        }
        
        if (this.disc.x < 0) this.disc.x = this.gridWidth - 1;
        else if (this.disc.x >= this.gridWidth) this.disc.x = 0;
        if (this.disc.y < 0) this.disc.y = this.gridHeight - 1;
        else if (this.disc.y >= this.gridHeight) this.disc.y = 0;
    }
    
    checkDiscCollision(otherCycles) {
        if (!this.disc) return null;
        
        for (const other of otherCycles) {
            if (other.playerId === this.playerId) continue;
            if (!other.alive) continue;
            
            const dx = this.disc.x - other.x;
            const dy = this.disc.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 3) {
                return other;
            }
        }
        return null;
    }

    changeDirection(newDirection) {
        const opposites = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
        if (newDirection !== opposites[this.direction]) {
            this.direction = newDirection;
        }
    }

    move() {
        if (!this.alive) return;
        
        if (this.speedBoost && Date.now() > this.speedBoostEndTime) {
            this.speedBoost = false;
        }
        
        if (this.trailDisabled && Date.now() > this.trailRestartTime) {
            this.trailDisabled = false;
        }
        
        this.frameCounter++;
        
        let moveCount = 1;
        if (this.speedBoost) {
            moveCount = 2;
        } else if (this.trailDisabled) {
            if (this.frameCounter % 2 === 0) {
                moveCount = 2;
            } else {
                moveCount = 1;
            }
        }
        
        for (let i = 0; i < moveCount; i++) {
            if (this.direction === 'UP') this.y--;
            else if (this.direction === 'DOWN') this.y++;
            else if (this.direction === 'LEFT') this.x--;
            else if (this.direction === 'RIGHT') this.x++;
            
            if (this.x < 0) this.x = this.gridWidth - 1;
            else if (this.x >= this.gridWidth) this.x = 0;
            if (this.y < 0) this.y = this.gridHeight - 1;
            else if (this.y >= this.gridHeight) this.y = 0;

            if (!this.trailDisabled) {
                this.trail.push([this.x, this.y]);
                
                if (this.trail.length > MAX_TRAIL_LENGTH) {
                    this.trail.shift();
                }
            } else {
                this.trail = [[this.x, this.y]];
            }
        }
    }
    
    disconnectTrail() {
        if (this.trail.length > 1) {
            this.disconnectedTrails.push({
                trail: [...this.trail],
                timestamp: Date.now()
            });
            this.trail = [[this.x, this.y]];
            this.trailDisabled = true;
            this.trailRestartTime = Date.now() + TRAIL_RESTART_DELAY;
        }
    }
    
    cleanupOldTrails() {
        const now = Date.now();
        this.disconnectedTrails = this.disconnectedTrails.filter(
            t => (now - t.timestamp) < TRAIL_FADE_TIME
        );
    }
    
    activateSpeedBoost() {
        this.speedBoost = true;
        this.speedBoostEndTime = Date.now() + 3000;
    }
    
    bounceOffWall() {
        // Diagonal deflection: rotate 90 degrees clockwise
        const deflections = { UP: 'RIGHT', RIGHT: 'DOWN', DOWN: 'LEFT', LEFT: 'UP' };
        this.direction = deflections[this.direction];
    }

    checkWallCollision() {
        return false;
    }

    checkTrailCollision(allTrails, allDisconnectedTrails) {
        const checkRadius = 3;
        
        for (const trail of allTrails) {
            for (let i = 0; i < trail.length - 1; i++) {
                const [tx, ty] = trail[i];
                if (Math.abs(tx - this.x) <= checkRadius && Math.abs(ty - this.y) <= checkRadius) {
                    if (tx === this.x && ty === this.y) {
                        return true;
                    }
                }
            }
        }
        
        for (const disconnectedSet of allDisconnectedTrails) {
            for (const trailObj of disconnectedSet) {
                for (const [tx, ty] of trailObj.trail) {
                    if (Math.abs(tx - this.x) <= checkRadius && Math.abs(ty - this.y) <= checkRadius) {
                        if (tx === this.x && ty === this.y) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }

    respawn(allTrails) {
        const paddingX = Math.max(5, Math.floor(this.gridWidth * 0.1));
        const paddingY = Math.max(5, Math.floor(this.gridHeight * 0.1));
        
        for (let attempt = 0; attempt < 100; attempt++) {
            const testX = Math.floor(Math.random() * (this.gridWidth - paddingX * 2)) + paddingX;
            const testY = Math.floor(Math.random() * (this.gridHeight - paddingY * 2)) + paddingY;
            let safe = true;

            for (const trail of allTrails) {
                for (const [tx, ty] of trail) {
                    if (Math.abs(testX - tx) < 10 && Math.abs(testY - ty) < 10) {
                        safe = false;
                        break;
                    }
                }
                if (!safe) break;
            }

            if (safe) {
                this.x = testX;
                this.y = testY;
                const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
                this.direction = directions[Math.floor(Math.random() * directions.length)];
                this.trail = [[this.x, this.y]];
                this.disconnectedTrails = [];
                this.alive = true;
                return true;
            }
        }
        return false;
    }
}

class GameState {
    constructor(numPlayers, gameMode, timeLimit, maxLives = 5) {
        this.numPlayers = numPlayers;
        this.gameMode = gameMode;
        this.timeLimit = timeLimit;
        this.maxLives = maxLives;
        const [width, height] = MAP_SIZES[numPlayers] || MAP_SIZES[2];
        this.gridWidth = width;
        this.gridHeight = height;
        this.cycles = {};
        this.gameStarted = false;
        this.gameOver = false;
        this.frameCount = 0; // For lazy cleanup batching
        this.startTime = null;
        this.winner = null;
        this.powerUp = null;
        this.walls = [];
        this.maxWalls = 3 + (numPlayers * 2);
        
        // Spatial partitioning for collision optimization
        this.spatialGridSize = 20; // Grid cell size
        this.spatialGrid = new Map(); // Stores objects by grid position
    }

    addPlayer(playerId, name) {
        if (Object.keys(this.cycles).length >= this.numPlayers) return false;
        const colorIndex = Object.keys(this.cycles).length;
        const color = PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
        this.cycles[playerId] = new LightCycle(playerId, name, color, this.gridWidth, this.gridHeight, this.maxLives);
        return true;
    }

    removePlayer(playerId) {
        delete this.cycles[playerId];
    }

    startGame() {
        const actualPlayerCount = Object.keys(this.cycles).length;
        const [width, height] = MAP_SIZES[actualPlayerCount] || MAP_SIZES[2];
        this.gridWidth = width;
        this.gridHeight = height;
        
        for (const cycle of Object.values(this.cycles)) {
            cycle.gridWidth = width;
            cycle.gridHeight = height;
            cycle.resetPosition();
        }
        
        this.gameStarted = true;
        this.startTime = Date.now();
        console.log(`[SERVER] Game starting with ${actualPlayerCount} players, map size: ${width}x${height}`);
    }

    update() {
        if (!this.gameStarted || this.gameOver) return;
        
        this.frameCount++;
        
        this.checkAndShrinkMap();
        this.spawnPowerUp();
        this.spawnWalls();
        
        // Update spatial grid for efficient collision detection
        this.updateSpatialGrid();
        
        // Lazy cleanup - only every 30 frames (1 second at 30 FPS)
        if (this.frameCount % 30 === 0) {
            this.cleanupWalls();
            this.cleanupTrails(); // New batched trail cleanup
        }

        for (const cycle of Object.values(this.cycles)) {
            if (cycle.alive) {
                cycle.move();
                cycle.cleanupOldTrails();
                cycle.updateDisc();
                if (this.gameMode === 'time') {
                    cycle.score += 1;
                }
            }
        }

        const allTrails = Object.values(this.cycles).map(c => c.trail);
        const allDisconnectedTrails = Object.values(this.cycles).map(c => c.disconnectedTrails);
        const allCycles = Object.values(this.cycles);

        for (const cycle of allCycles) {
            if (!cycle.alive) continue;
            
            this.checkPowerUpCollision(cycle);
            
            // Use optimized spatial collision detection
            const collision = this.checkSpatialCollision(cycle);
            if (collision === 'wall') {
                cycle.bounceOffWall();
            } else if (collision === 'trail') {
                this.handleCollision(cycle, allTrails);
            }
            
            const hitByDisc = cycle.checkDiscCollision(allCycles);
            if (hitByDisc) {
                this.handleCollision(hitByDisc, allTrails);
            }
        }

        if (this.gameMode === 'time') {
            const elapsed = (Date.now() - this.startTime) / 1000;
            if (elapsed >= this.timeLimit) this.endGame();
        } else if (this.gameMode === 'lives') {
            const alivePlayers = Object.values(this.cycles).filter(c => c.lives > 0);
            if (alivePlayers.length <= 1 && !this.gameOver) this.endGame(); // Fix: only call once
        }
    }
    
    checkAndShrinkMap() {
        const activePlayers = Object.values(this.cycles).filter(c => c.lives > 0).length;
        const [targetWidth, targetHeight] = MAP_SIZES[activePlayers] || MAP_SIZES[2];
        
        if (targetWidth < this.gridWidth || targetHeight < this.gridHeight) {
            this.gridWidth = targetWidth;
            this.gridHeight = targetHeight;
            
            for (const cycle of Object.values(this.cycles)) {
                cycle.gridWidth = targetWidth;
                cycle.gridHeight = targetHeight;
                
                if (cycle.x >= targetWidth) cycle.x = targetWidth - 1;
                if (cycle.y >= targetHeight) cycle.y = targetHeight - 1;
                
                cycle.trail = cycle.trail.filter(([x, y]) => x < targetWidth && y < targetHeight);
                
                cycle.disconnectedTrails = cycle.disconnectedTrails.map(trailObj => ({
                    ...trailObj,
                    trail: trailObj.trail.filter(([x, y]) => x < targetWidth && y < targetHeight)
                })).filter(trailObj => trailObj.trail.length > 0);
            }
            
            if (this.powerUp && (this.powerUp.x >= targetWidth || this.powerUp.y >= targetHeight)) {
                this.powerUp = null;
            }
            
            this.walls = this.walls.filter(wall => {
                return wall.x < targetWidth - 10 && wall.y < targetHeight - 10;
            });
            
            // Rebuild spatial grid with new boundaries
            this.updateSpatialGrid();
            
            console.log(`[SERVER] Map shrunk to ${targetWidth}x${targetHeight} for ${activePlayers} active players`);
        }
    }

    handleCollision(cycle, allTrails) {
        cycle.alive = false;
        cycle.deaths++;
        cycle.deathTimestamp = Date.now();
        cycle.fading = true;
        
        // Clear any existing respawn timer to prevent accumulation
        if (cycle.respawnTimer) {
            clearTimeout(cycle.respawnTimer);
            cycle.respawnTimer = null;
        }
        
        if (this.gameMode === 'lives') {
            cycle.lives--;
            if (cycle.lives > 0) {
                cycle.respawnTimer = setTimeout(() => {
                    if (cycle.fading) {
                        cycle.fading = false;
                        cycle.deathTimestamp = null;
                        // Use fresh trail data instead of stale 3-second-old data
                        const freshTrails = Object.values(this.cycles).map(c => c.trail);
                        cycle.respawn(freshTrails);
                    }
                    cycle.respawnTimer = null;
                }, 3000);
            }
        } else {
            cycle.respawnTimer = setTimeout(() => {
                if (cycle.fading) {
                    cycle.fading = false;
                    cycle.deathTimestamp = null;
                    // Use fresh trail data instead of stale 3-second-old data
                    const freshTrails = Object.values(this.cycles).map(c => c.trail);
                    cycle.respawn(freshTrails);
                }
                cycle.respawnTimer = null;
            }, 3000);
        }
    }

    spawnPowerUp() {
        if (!this.powerUp) {
            const activePlayers = Object.values(this.cycles).filter(c => c.alive).length;
            // Scale power-up spawn rate with player count
            // Base rate: 0.003 for 2 players, increases with more players
            const baseRate = 0.003;
            const scaledRate = baseRate * (1 + (activePlayers - 2) * 0.15);
            
            if (Math.random() < scaledRate) {
                this.powerUp = {
                    x: Math.floor(Math.random() * (this.gridWidth - 10)) + 5,
                    y: Math.floor(Math.random() * (this.gridHeight - 10)) + 5,
                    width: 1,
                    height: 3
                };
            }
        }
    }
    
    generateWallShape() {
        const shapes = [
            { name: 'hallway_vertical', cells: [[0,0],[0,1],[0,2],[0,5],[0,6],[0,7]] },
            { name: 'hallway_horizontal', cells: [[0,0],[1,0],[2,0],[5,0],[6,0],[7,0]] },
            { name: 'block_2x8', cells: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2],[0,3],[1,3],[0,4],[1,4],[0,5],[1,5],[0,6],[1,6],[0,7],[1,7]] },
            { name: 'block_4x4', cells: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0,3],[1,3],[2,3],[3,3]] },
            { name: 't_shape', cells: [[0,0],[1,0],[2,0],[3,0],[1,1],[1,2],[1,3]] },
            { name: 'doorway_vertical', cells: [[0,0],[1,0],[0,1],[1,1],[0,5],[1,5],[0,6],[1,6]] },
            { name: 'block_2x4', cells: [[0,0],[1,0],[0,1],[1,1],[0,2],[1,2],[0,3],[1,3]] }
        ];
        
        return shapes[Math.floor(Math.random() * shapes.length)];
    }
    
    spawnWalls() {
        const activePlayers = Object.values(this.cycles).filter(c => c.alive).length;
        
        // Specific wall count tiers for different player counts
        let scaledMaxWalls;
        if (activePlayers <= 2) {
            scaledMaxWalls = 8;
        } else if (activePlayers <= 4) {
            scaledMaxWalls = 12;
        } else if (activePlayers <= 6) {
            scaledMaxWalls = 17;
        } else if (activePlayers <= 8) {
            scaledMaxWalls = 20;
        } else if (activePlayers <= 10) {
            scaledMaxWalls = 25;
        } else {
            scaledMaxWalls = 30; // 11-12 players
        }
        
        // Scale spawn rate slightly with player count
        const baseSpawnRate = 0.01;
        const scaledSpawnRate = baseSpawnRate * (1 + (activePlayers - 2) * 0.05);
        
        if (this.walls.length < scaledMaxWalls && Math.random() < scaledSpawnRate) {
            const shape = this.generateWallShape();
            const baseX = Math.floor(Math.random() * (this.gridWidth - 15)) + 5;
            const baseY = Math.floor(Math.random() * (this.gridHeight - 15)) + 5;
            
            this.walls.push({
                x: baseX,
                y: baseY,
                shape: shape.name,
                cells: shape.cells,
                timestamp: Date.now()
            });
        }
    }
    
    cleanupWalls() {
        const now = Date.now();
        this.walls = this.walls.filter(w => (now - w.timestamp) < 20000);
    }
    
    cleanupTrails() {
        // Batch cleanup of old disconnected trails across all cycles
        const now = Date.now();
        for (const cycle of Object.values(this.cycles)) {
            cycle.disconnectedTrails = cycle.disconnectedTrails.filter(
                trailObj => (now - trailObj.timestamp) < 4000
            );
        }
    }
    
    // Spatial partitioning helpers
    getSpatialKey(x, y) {
        const gridX = Math.floor(x / this.spatialGridSize);
        const gridY = Math.floor(y / this.spatialGridSize);
        return `${gridX},${gridY}`;
    }
    
    getNearbyGridKeys(x, y, radius = 1) {
        const keys = [];
        const centerGridX = Math.floor(x / this.spatialGridSize);
        const centerGridY = Math.floor(y / this.spatialGridSize);
        
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                keys.push(`${centerGridX + dx},${centerGridY + dy}`);
            }
        }
        return keys;
    }
    
    updateSpatialGrid() {
        // Clear and rebuild spatial grid every frame
        this.spatialGrid.clear();
        
        // Add trail segments to spatial grid
        for (const cycle of Object.values(this.cycles)) {
            if (!cycle.alive) continue;
            
            // Add active trail segments
            for (const [x, y] of cycle.trail) {
                const key = this.getSpatialKey(x, y);
                if (!this.spatialGrid.has(key)) {
                    this.spatialGrid.set(key, []);
                }
                this.spatialGrid.get(key).push({ type: 'trail', x, y, playerId: cycle.playerId });
            }
            
            // Add disconnected trail segments
            for (const trailObj of cycle.disconnectedTrails) {
                for (const [x, y] of trailObj.trail) {
                    const key = this.getSpatialKey(x, y);
                    if (!this.spatialGrid.has(key)) {
                        this.spatialGrid.set(key, []);
                    }
                    this.spatialGrid.get(key).push({ type: 'disconnected_trail', x, y, playerId: cycle.playerId });
                }
            }
        }
        
        // Add walls to spatial grid
        for (const wall of this.walls) {
            for (const [dx, dy] of wall.cells) {
                const x = wall.x + dx;
                const y = wall.y + dy;
                const key = this.getSpatialKey(x, y);
                if (!this.spatialGrid.has(key)) {
                    this.spatialGrid.set(key, []);
                }
                this.spatialGrid.get(key).push({ type: 'wall', x, y });
            }
        }
    }
    
    checkSpatialCollision(cycle) {
        // Only check collisions in nearby grid cells - MUCH faster!
        const nearbyKeys = this.getNearbyGridKeys(cycle.x, cycle.y, 1);
        
        for (const key of nearbyKeys) {
            const objects = this.spatialGrid.get(key);
            if (!objects) continue;
            
            for (const obj of objects) {
                if (obj.x === cycle.x && obj.y === cycle.y) {
                    if (obj.type === 'wall') {
                        return 'wall';
                    }
                    if (obj.type === 'trail' || obj.type === 'disconnected_trail') {
                        return 'trail';
                    }
                }
            }
        }
        return null;
    }
    
    checkPowerUpCollision(cycle) {
        if (!this.powerUp) return;
        
        const hitboxPadding = 1;
        for (let dx = -hitboxPadding; dx < this.powerUp.width + hitboxPadding; dx++) {
            for (let dy = -hitboxPadding; dy < this.powerUp.height + hitboxPadding; dy++) {
                if (cycle.x === this.powerUp.x + dx && cycle.y === this.powerUp.y + dy) {
                    cycle.activateSpeedBoost();
                    this.powerUp = null;
                    return;
                }
            }
        }
    }
    
    checkWallCollision(cycle) {
        for (const wall of this.walls) {
            for (const [dx, dy] of wall.cells) {
                if (cycle.x === wall.x + dx && cycle.y === wall.y + dy) {
                    return true;
                }
            }
        }
        return false;
    }

    endGame() {
        this.gameOver = true;
        const cyclesArray = Object.values(this.cycles);
        
        if (cyclesArray.length === 0) {
            this.winner = null;
            return;
        }
        
        if (this.gameMode === 'time') {
            this.winner = cyclesArray.reduce((min, c) => c.deaths < min.deaths ? c : min);
        } else {
            const alive = cyclesArray.filter(c => c.lives > 0);
            this.winner = alive.length > 0 ? alive[0] : cyclesArray.reduce((max, c) => c.lives > max.lives ? c : max);
        }
    }

    getTimeRemaining() {
        if (!this.gameStarted || this.gameMode !== 'time') return 0;
        const elapsed = (Date.now() - this.startTime) / 1000;
        return Math.max(0, this.timeLimit - elapsed);
    }

    toJSON() {
        return {
            numPlayers: this.numPlayers,
            gameMode: this.gameMode,
            timeLimit: this.timeLimit,
            gridWidth: this.gridWidth,
            gridHeight: this.gridHeight,
            cycles: Object.fromEntries(
                Object.entries(this.cycles).map(([id, c]) => [id, {
                    playerId: c.playerId,
                    name: c.name,
                    color: c.color,
                    x: c.x,
                    y: c.y,
                    direction: c.direction,
                    trail: c.trail,
                    disconnectedTrails: c.disconnectedTrails,
                    score: c.score,
                    deaths: c.deaths,
                    lives: c.lives,
                    alive: c.alive,
                    speedBoost: c.speedBoost,
                    deathTimestamp: c.deathTimestamp,
                    fading: c.fading,
                    disc: c.disc,
                    discCooldown: c.discCooldown
                }])
            ),
            gameStarted: this.gameStarted,
            gameOver: this.gameOver,
            timeRemaining: this.getTimeRemaining(),
            powerUp: this.powerUp,
            walls: this.walls,
            winner: this.winner ? {
                playerId: this.winner.playerId,
                name: this.winner.name,
                color: this.winner.color,
                score: this.winner.score
            } : null
        };
    }
}

// Zoom OAuth Configuration
const ZOOM_CONFIG = {
    clientId: process.env.ZOOM_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
    clientSecret: process.env.ZOOM_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE',
    redirectUri: 'https://tron-game-zoom.fly.dev/auth/zoom/callback',
    authUrl: 'https://zoom.us/oauth/authorize',
    tokenUrl: 'https://zoom.us/oauth/token'
};

// OAuth endpoints
function handleOAuthRoutes(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    console.log('OAuth handler called for:', url.pathname);
    
    // Start OAuth flow
    if (url.pathname === '/auth/zoom') {
        console.log('OAuth request received');
        console.log('Client ID:', ZOOM_CONFIG.clientId);
        
        if (ZOOM_CONFIG.clientId === 'YOUR_CLIENT_ID_HERE') {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>OAuth not configured - Client ID not set</h1>');
            return true;
        }
        
        const authUrl = `${ZOOM_CONFIG.authUrl}?response_type=code&client_id=${ZOOM_CONFIG.clientId}&redirect_uri=${ZOOM_CONFIG.redirectUri}`;
        console.log('Redirecting to:', authUrl);
        res.writeHead(302, { 'Location': authUrl });
        res.end();
        return true;
    }
    
    // OAuth callback
    if (url.pathname === '/auth/zoom/callback') {
        console.log('OAuth callback received');
        console.log('Full URL:', req.url);
        
        const code = url.searchParams.get('code');
        console.log('Authorization code:', code);
        
        if (!code) {
            console.log('No authorization code received');
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Authorization failed - no code provided</h1>');
            return true;
        }
        
        // Exchange code for tokens
        const tokenData = new URLSearchParams();
        tokenData.append('code', code);
        tokenData.append('redirect_uri', ZOOM_CONFIG.redirectUri);
        tokenData.append('grant_type', 'authorization_code');
        
        const tokenRequest = require('https').request({
            hostname: 'zoom.us',
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${ZOOM_CONFIG.clientId}:${ZOOM_CONFIG.clientSecret}`).toString('base64')}`
            }
        }, (tokenRes) => {
            let data = '';
            tokenRes.on('data', chunk => data += chunk);
            tokenRes.on('end', () => {
                try {
                    const tokens = JSON.parse(data);
                    
                    // Get user info
                    console.log('Making user info request to Zoom API...');
                    console.log('Access token (first 10 chars):', tokens.access_token ? tokens.access_token.substring(0, 10) + '...' : 'undefined');
                    
                    const userInfoReq = require('https').request({
                        hostname: 'api.zoom.us',
                        path: '/v2/users/me',
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${tokens.access_token}`
                        }
                    }, (userRes) => {
                        console.log('User info response status:', userRes.statusCode);
                        console.log('User info response headers:', userRes.headers);
                        
                        let userData = '';
                        userRes.on('data', chunk => userData += chunk);
                        userRes.on('end', () => {
                            console.log('User info response body:', userData);
                            
                            if (userRes.statusCode !== 200) {
                                console.error('Zoom API returned non-200 status:', userRes.statusCode);
                                res.writeHead(userRes.statusCode, { 'Content-Type': 'text/html' });
                                res.end(`<h1>Zoom API Error: ${userRes.statusCode}</h1><p>Response: ${userData}</p>`);
                                return;
                            }
                            
                            try {
                                const user = JSON.parse(userData);
                                
                                // DEBUG: Log user info to find your Zoom user ID
                                console.log('=== USER INFO ===');
                                console.log('User ID:', user.id);
                                console.log('User email:', user.email);
                                console.log('User name:', user.first_name, user.last_name);
                                console.log('=================');
                                
                                // Store tokens in database
                                const stmt = db.prepare(`
                                    INSERT OR REPLACE INTO oauth_tokens 
                                    (zoom_user_id, access_token, refresh_token, expires_at) 
                                    VALUES (?, ?, ?, ?)
                                `);
                                stmt.run(user.id, tokens.access_token, tokens.refresh_token, Date.now() + (tokens.expires_in * 1000));
                                
                                // Check if user has paid
                                const paidStmt = db.prepare('SELECT 1 FROM paid_hosts WHERE zoom_user_id = ?');
                                const hasPaid = paidStmt.get(user.id) !== undefined;
                                
                                // DEBUG: Always log user info and access status
                                console.log('=== USER INFO ===');
                                console.log('User ID:', user.id);
                                console.log('User email:', user.email);
                                console.log('User name:', user.first_name, user.last_name);
                                console.log('Has paid:', hasPaid);
                                console.log('Environment:', process.env.NODE_ENV || 'production');
                                console.log('=================');
                                
                                // Redirect to game with auth status
                                const paidStatus = hasPaid ? 'true' : 'false';
                                const redirectUrl = `/?auth=success&paid=${paidStatus}&user_id=${user.id}&email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.first_name + ' ' + user.last_name)}`;
                                res.writeHead(302, { 'Location': redirectUrl });
                                res.end();
                                
                            } catch (error) {
                                console.error('Error parsing user data:', error);
                                console.error('User data received:', userData);
                                res.writeHead(500, { 'Content-Type': 'text/html' });
                                res.end('<h1>Error getting user info</h1><p>Failed to parse user data from Zoom API</p>');
                            }
                        });
                    });
                    
                    userInfoReq.on('error', (error) => {
                        console.error('Error making user info request:', error);
                        res.writeHead(500, { 'Content-Type': 'text/html' });
                        res.end('<h1>Error fetching user information from Zoom</h1>');
                    });
                    
                    userInfoReq.end();
                    
                } catch (error) {
                    console.error('Error parsing tokens:', error);
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('<h1>Error processing tokens</h1>');
                }
            });
        });
        
        tokenRequest.write(tokenData.toString());
        tokenRequest.end();
        return true;
    }
    
    // Check auth status
    if (url.pathname === '/auth/status') {
        // This would check session cookies or tokens
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: false, paid: false }));
        return true;
    }
    
    // Create payment session
    if (url.pathname === '/create-payment-session') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/html' });
            res.end('<h1>Method not allowed</h1>');
            return true;
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { zoomUserId, userEmail } = JSON.parse(body);
                
                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    mode: 'payment',
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: {
                                name: 'TRON Game - Lifetime Access',
                                description: 'Unlimited lifetime access to TRON Light Cycles multiplayer game',
                                images: ['https://tron-game-zoom.fly.dev/bike.png']
                            },
                            unit_amount: 999, // $9.99
                        },
                        quantity: 1,
                    }],
                    success_url: `https://tron-game-zoom.fly.dev/payment-success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `https://tron-game-zoom.fly.dev/payment-cancelled`,
                    customer_email: userEmail,
                    metadata: {
                        zoom_user_id: zoomUserId
                    }
                });
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ sessionId: session.id, url: session.url }));
                
            } catch (error) {
                console.error('Error creating payment session:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to create payment session' }));
            }
        });
        return true;
    }
    
    // Payment success callback
    if (url.pathname === '/payment-success') {
        const sessionId = url.searchParams.get('session_id');
        
        if (sessionId) {
            (async () => {
                try {
                    // Verify the session was paid
                    const session = await stripe.checkout.sessions.retrieve(sessionId);
                    
                    if (session.payment_status === 'paid' && session.metadata.zoom_user_id) {
                        // Add user to paid_hosts table
                        const stmt = db.prepare('INSERT OR REPLACE INTO paid_hosts (zoom_user_id, paid_at) VALUES (?, CURRENT_TIMESTAMP)');
                        stmt.run(session.metadata.zoom_user_id);
                        
                        console.log(`User ${session.metadata.zoom_user_id} successfully paid for access`);
                        
                        // Redirect to game with paid status
                        res.writeHead(302, { 'Location': `/?auth=success&paid=true` });
                        res.end();
                        return;
                    }
                } catch (error) {
                    console.error('Error verifying payment:', error);
                }
                
                // If payment verification fails, show error page
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('<h1>Payment verification failed</h1>');
            })();
            return true;
        }
        
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Missing payment session ID</h1>');
        return true;
    }
    
    // Payment cancelled
    if (url.pathname === '/payment-cancelled') {
        res.writeHead(302, { 'Location': '/?payment=cancelled' });
        res.end();
        return true;
    }
    
    // Stripe webhook handler
    if (url.pathname === '/webhook') {
        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'text/html' });
            res.end('<h1>Method not allowed</h1>');
            return true;
        }
        
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const sig = req.headers['stripe-signature'];
            const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
            
            if (!webhookSecret) {
                console.error('STRIPE_WEBHOOK_SECRET not configured');
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>Webhook secret not configured</h1>');
                return;
            }
            
            try {
                // Verify webhook signature
                const event = JSON.parse(body);
                console.log('Received Stripe webhook:', event.type);
                
                // Handle checkout.session.completed event
                if (event.type === 'checkout.session.completed') {
                    const session = event.data.object;
                    
                    // Extract Zoom user ID from metadata
                    const zoomUserId = session.metadata?.zoom_user_id;
                    
                    if (zoomUserId) {
                        // Add user to paid_hosts table
                        const stmt = db.prepare('INSERT OR REPLACE INTO paid_hosts (zoom_user_id, paid_at) VALUES (?, CURRENT_TIMESTAMP)');
                        stmt.run(zoomUserId);
                        
                        console.log(`Payment completed! Added Zoom user ${zoomUserId} to paid_hosts table`);
                    } else {
                        console.warn('Payment completed but no Zoom user ID in metadata');
                    }
                }
                
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end('Webhook received');
                
            } catch (error) {
                console.error('Webhook error:', error);
                res.writeHead(400, { 'Content-Type': 'text/html' });
                res.end('<h1>Webhook error</h1>');
            }
        });
        return true;
    }
    
    return false;
}

const httpServer = http.createServer((req, res) => {
    console.log('Request received for:', req.url);
    
    // Handle OAuth routes first
    if (handleOAuthRoutes(req, res)) {
        return;
    }
    
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let filePath = parsedUrl.pathname === '/' ? '/index.html' : decodeURIComponent(parsedUrl.pathname);
    filePath = path.join(__dirname, filePath);

    const extname = path.extname(filePath);
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.mp3': 'audio/mpeg'
    };

    const contentType = contentTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('404 Not Found');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

let gameState = null;
let clients = {};
let lobbyReady = {};
let numPlayers = 2;
let gameMode = 'time';
let timeLimit = 300;
let maxLives = 5;
let gameInterval = null;
let previousState = null;
let useBinaryProtocol = true;

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            console.error('[SERVER] Invalid JSON received:', error.message);
            return;
        }

        if (data.type === 'join') {
            const sanitizedName = String(data.name || 'Player').substring(0, 15).replace(/[<>]/g, '');
            
            if (!gameState) {
                gameState = new GameState(numPlayers, gameMode, timeLimit, maxLives);
                console.log(`[SERVER] Created new game state for ${numPlayers} players, ${maxLives} lives`);
            }
            
            const playerId = `player_${Object.keys(gameState.cycles).length}`;

            if (gameState.addPlayer(playerId, sanitizedName)) {
                clients[playerId] = ws;
                ws.playerId = playerId;
                lobbyReady[playerId] = false;

                const isHost = playerId === 'player_0';
                
                ws.send(JSON.stringify({
                    type: 'join_success',
                    playerId: playerId,
                    isHost: isHost,
                    numPlayers: numPlayers,
                    gameMode: gameMode,
                    timeLimit: timeLimit,
                    maxLives: maxLives
                }));

                console.log(`[SERVER] ${sanitizedName} joined as ${playerId} (${Object.keys(clients).length}/${numPlayers})`);
                console.log(`[SERVER] Total players in game state: ${Object.keys(gameState.cycles).length}`);
                broadcastLobbyUpdate();
            } else {
                ws.send(JSON.stringify({ type: 'join_failed', reason: 'Game full' }));
                ws.close();
            }
        } else if (data.type === 'ready') {
            lobbyReady[ws.playerId] = true;
            console.log(`${ws.playerId} is ready`);
            broadcastLobbyUpdate();

            if (Object.values(lobbyReady).every(r => r) && Object.keys(lobbyReady).length === numPlayers) {
                console.log('All players ready! Starting game...');
                startGame();
            }
        } else if (data.type === 'input') {
            if (gameState && gameState.gameStarted && ws.playerId in gameState.cycles) {
                const validDirections = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
                if (validDirections.includes(data.direction)) {
                    gameState.cycles[ws.playerId].changeDirection(data.direction);
                }
            }
        } else if (data.type === 'disconnect_trail') {
            if (gameState && gameState.gameStarted && ws.playerId in gameState.cycles) {
                gameState.cycles[ws.playerId].disconnectTrail();
            }
        } else if (data.type === 'hold_disc') {
            if (gameState && gameState.gameStarted && ws.playerId in gameState.cycles) {
                gameState.cycles[ws.playerId].holdDisc();
            }
        } else if (data.type === 'release_disc') {
            if (gameState && gameState.gameStarted && ws.playerId in gameState.cycles) {
                gameState.cycles[ws.playerId].releaseDisc();
            }
        } else if (data.type === 'config') {
            if (ws.playerId && ws.playerId !== 'player_0') {
                console.log(`[SERVER] Config rejected - ${ws.playerId} is not host`);
                return;
            }
            
            if (!gameState || Object.keys(gameState.cycles).length === 0) {
                const validNumPlayers = Math.max(2, Math.min(12, parseInt(data.numPlayers) || numPlayers));
                const validGameMode = ['time', 'lives'].includes(data.gameMode) ? data.gameMode : gameMode;
                const validTimeLimit = Math.max(60, Math.min(600, parseInt(data.timeLimit) || timeLimit));
                const validMaxLives = Math.max(1, Math.min(10, parseInt(data.maxLives) || maxLives));
                
                numPlayers = validNumPlayers;
                gameMode = validGameMode;
                timeLimit = validTimeLimit;
                maxLives = validMaxLives;
                
                if (gameState) {
                    gameState = null;
                }
                
                console.log(`[SERVER] Config received: ${numPlayers} players, ${gameMode} mode, ${maxLives} lives`);
            } else {
                console.log(`[SERVER] Config ignored - game has ${Object.keys(gameState.cycles).length} players already`);
            }
        }
    });

    ws.on('close', () => {
        if (ws.playerId) {
            const wasHost = ws.playerId === 'player_0';
            
            delete clients[ws.playerId];
            delete lobbyReady[ws.playerId];
            
            if (wasHost) {
                console.log(`[SERVER] Host disconnected - resetting game state`);
                if (gameInterval) {
                    clearInterval(gameInterval);
                    gameInterval = null;
                }
                gameState = null;
                clients = {};
                lobbyReady = {};
                Object.values(wss.clients).forEach(client => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({ type: 'host_disconnected' }));
                        client.close();
                    }
                });
            } else {
                console.log(`${ws.playerId} disconnected`);
                if (gameState && !gameState.gameStarted) {
                    gameState.removePlayer(ws.playerId);
                }
                broadcastLobbyUpdate();
            }
        }
    });
});

function broadcastLobbyUpdate() {
    const lobbyData = {
        type: 'lobby_update',
        players: Object.keys(clients).length,
        max_players: numPlayers,
        ready_count: Object.values(lobbyReady).filter(r => r).length,
        game_mode: gameMode
    };
    broadcast(lobbyData);
}

function startGame() {
    if (gameState) {
        gameState.startGame();
        gameInterval = setInterval(() => {
            if (!gameState) {
                clearInterval(gameInterval);
                return;
            }
            gameState.update();
            broadcast({
                type: 'game_update',
                state: gameState.toJSON()
            });

            if (gameState.gameOver) {
                console.log(`Game over! Winner: ${gameState.winner ? gameState.winner.name : 'None'}`);
                clearInterval(gameInterval);
                gameInterval = null;
                gameState = null;
            }
        }, 1000 / 15);
    }
}

function computeDelta(current, previous) {
    if (!previous) return current;
    
    const delta = { type: current.type };
    
    if (current.type === 'game_update' && previous.type === 'game_update') {
        delta.state = {};
        const currState = current.state;
        const prevState = previous.state;
        
        if (currState.gameStarted !== prevState.gameStarted) delta.state.gameStarted = currState.gameStarted;
        if (currState.gameOver !== prevState.gameOver) delta.state.gameOver = currState.gameOver;
        if (currState.timeRemaining !== prevState.timeRemaining) delta.state.timeRemaining = currState.timeRemaining;
        if (currState.gridWidth !== prevState.gridWidth) delta.state.gridWidth = currState.gridWidth;
        if (currState.gridHeight !== prevState.gridHeight) delta.state.gridHeight = currState.gridHeight;
        
        if (!delta.state.gridWidth) delta.state.gridWidth = currState.gridWidth;
        if (!delta.state.gridHeight) delta.state.gridHeight = currState.gridHeight;
        
        if (!objectEquals(currState.powerUp, prevState.powerUp)) {
            delta.state.powerUp = currState.powerUp;
        }
        
        if (!objectEquals(currState.walls, prevState.walls)) {
            delta.state.walls = currState.walls;
        }
        
        if (!objectEquals(currState.winner, prevState.winner)) {
            delta.state.winner = currState.winner;
        }
        
        delta.state.cycles = {};
        for (const [id, cycle] of Object.entries(currState.cycles)) {
            const prevCycle = prevState.cycles[id];
            if (!prevCycle) {
                delta.state.cycles[id] = cycle;
            } else {
                const cycleDelta = {
                    playerId: id,
                    name: cycle.name,
                    color: cycle.color,
                    lives: cycle.lives,
                    deaths: cycle.deaths,
                    score: cycle.score
                };
                
                if (cycle.x !== prevCycle.x) cycleDelta.x = cycle.x;
                if (cycle.y !== prevCycle.y) cycleDelta.y = cycle.y;
                if (cycle.direction !== prevCycle.direction) cycleDelta.direction = cycle.direction;
                if (cycle.alive !== prevCycle.alive) cycleDelta.alive = cycle.alive;
                if (cycle.speedBoost !== prevCycle.speedBoost) cycleDelta.speedBoost = cycle.speedBoost;
                if (cycle.fading !== prevCycle.fading) cycleDelta.fading = cycle.fading;
                if (cycle.deathTimestamp !== prevCycle.deathTimestamp) cycleDelta.deathTimestamp = cycle.deathTimestamp;
                
                if (!arrayEquals(cycle.trail, prevCycle.trail)) {
                    cycleDelta.trail = cycle.trail;
                }
                if (!arrayEquals(cycle.disconnectedTrails, prevCycle.disconnectedTrails)) {
                    cycleDelta.disconnectedTrails = cycle.disconnectedTrails;
                }
                
                if (!objectEquals(cycle.disc, prevCycle.disc)) {
                    cycleDelta.disc = cycle.disc;
                }
                if (cycle.discCooldown !== prevCycle.discCooldown) {
                    cycleDelta.discCooldown = cycle.discCooldown;
                }
                
                delta.state.cycles[id] = cycleDelta;
            }
        }
        
        if (Object.keys(delta.state).length === 0 || Object.keys(delta.state.cycles || {}).length === 0) {
            return null;
        }
    }
    
    return delta;
}

function broadcast(data) {
    let messageToSend = data;
    
    if (data.type === 'game_update') {
        const delta = computeDelta(data, previousState);
        if (!delta) return;
        messageToSend = delta;
        previousState = JSON.parse(JSON.stringify(data));
    }
    
    let message;
    if (useBinaryProtocol && data.type === 'game_update') {
        message = msgpack.encode(messageToSend);
    } else {
        message = JSON.stringify(messageToSend);
    }
    
    for (const ws of Object.values(clients)) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    }
}

httpServer.listen(PORT, () => {
    console.log(`HTTP Server running on http://localhost:${PORT}`);
    console.log(`WebSocket Server running on ws://localhost:${PORT}/ws`);
    console.log(`Share this URL with friends: http://YOUR_IP:${PORT}`);
});
