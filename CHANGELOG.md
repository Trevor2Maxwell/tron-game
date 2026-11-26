# Changelog - TRON Light Cycles Game

## Version 2.2.0 - March 23, 2026

### 🔒 MAJOR SECURITY CHANGE: Server-Side Session Migration

**Breaking Change for Security Enhancement**
- **Issue**: Client-side cookies exposed user data in URLs and browser storage
- **Risk**: User authentication tokens and personal data accessible via browser history, logs, and referer headers
- **Solution**: Migrated to server-side session management with secure session IDs

### 🛡️ Security Improvements

#### **Server-Side Session Management**
- **Removed**: Client-side cookies with user data
- **Added**: Secure server-side sessions with random 32-byte session IDs
- **Benefit**: User data no longer exposed in URLs, browser storage, or logs
- **Database**: `user_sessions` table stores session data with expiration
- **Session Flow**: 
  1. User authenticates via Zoom OAuth
  2. Server creates secure session with 24-hour expiration
  3. Client receives only session ID (no user data)
  4. All user lookups happen server-side

#### **URL Security Enhancement**
- **Before**: `/?auth=success&paid=true&user_id=xxx&email=xxx`
- **After**: `/?auth=success&paid=true&session=xxx` (session ID only)
- **Impact**: Prevents user data leakage through browser history, server logs, referer headers
- **Compliance**: Better privacy and security practices

### 💳 Payment System Updates

#### **Stripe API Modernization**
- **Fixed**: Deprecated Stripe API fields causing payment session failures
- **Removed**: `description` field from line_items (deprecated)
- **Added**: `allow_promotion_codes: true` for promo code functionality
- **Enhanced**: Payment verification with server-side session validation

#### **Payment Flow Security**
- **Issue**: Payment verification failed due to missing user metadata
- **Fix**: Secure session-based payment verification
- **Process**: 
  1. Payment session created with server-side session validation
  2. Success callback verifies payment server-side
  3. User granted access without exposing data in URLs

### 🎨 UI/UX Improvements

#### **Marketing Simplification**
- **Removed**: Complex marketing features section
- **Cleaned**: Welcome screen for better user experience
- **Removed**: Unused CSS and JavaScript references
- **Result**: Cleaner, faster loading interface

### 📊 Database Schema Changes

#### **New Tables**
```sql
-- User sessions (replaces client-side cookies)
CREATE TABLE user_sessions (
    session_id TEXT PRIMARY KEY,
    zoom_user_id TEXT NOT NULL,
    user_email TEXT,
    user_name TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);
```

#### **Session Security Features**
- 24-hour automatic expiration
- Cryptographically secure session IDs
- Server-side validation only
- No user data in client responses

### 🔧 Migration Impact

#### **Systems Affected**
- ✅ Authentication flow (completely secure)
- ✅ Payment processing (server-side verification)
- ✅ User state management (no client data exposure)
- ⚠️ Session expiration handling (needs testing)
- ⚠️ Cross-tab synchronization (needs testing)

#### **Breaking Changes**
- Client-side cookie dependencies removed
- All user data now server-side only
- URLs no longer contain user information

### 🚨 Security Benefits

1. **No User Data in URLs** - Prevents data leakage
2. **Server-Side Validation** - All authentication happens server-side
3. **Session Expiration** - Automatic cleanup reduces attack surface
4. **Secure Session IDs** - Cryptographically random, unpredictable
5. **Reduced Client Exposure** - Browser stores only session IDs

---

## Version 2.1.0 - February 27, 2026

### ⚠️ CRITICAL: Platform Compatibility Fix

**Docker Image Platform Requirement**
- **Issue**: Initial Docker image was not built for `linux/amd64` platform
- **Error on Render.com**: "The provided image URL points to an image with an invalid platform. Images must be built with the platform linux/amd64."
- **Fix**: Rebuilt image with `docker buildx build --platform linux/amd64`
- **Current Image**: `trevor2maxwell/fun:latest` - Built with `linux/amd64` ✅
- **Digest**: `sha256:fa77bd1946ede4f962c81c9bd2769c6bf4e6122c7d96a47e706fbb5b30f7e9b1`

**IMPORTANT**: Always use `--platform linux/amd64` flag when building for cloud deployment:
```bash
docker buildx build --platform linux/amd64 -t trevor2maxwell/fun:latest --push .
```

### 🐛 Bug Fixes

#### **Bug #3: Lives Mode Timer Accumulation - RESOLVED** ✅
- **Issue**: Lives mode was laggy and had faster movement compared to time mode
- **Cause**: `setTimeout` timers accumulated on every player death without cleanup, causing performance degradation and timing disruption
- **Fix**: 
  - Added `respawnTimer` property to `LightCycle` class for timer tracking
  - Implemented `clearTimeout` before creating new respawn timers
  - Updated respawn logic to use fresh trail data instead of stale 3-second-old data
- **Impact**: Lives mode now has identical performance and feel to time mode
- **Files Modified**: `web-server.js` (lines 92, 545-582)

### 🚀 Performance Optimizations

#### **Spatial Partitioning Collision Detection**
- Implemented spatial grid system with 20-unit cell size
- Only checks collisions in nearby grid cells instead of all objects
- Significantly reduces collision detection overhead
- **Files Modified**: `web-server.js` (lines 415-416, 457-458, 678-740)

#### **Lazy Cleanup Batching**
- Cleanup operations now run every 30 frames (1 second at 15 FPS) instead of every frame
- Reduces per-frame overhead for wall and trail cleanup
- **Files Modified**: `web-server.js` (lines 460-464)

### 📈 Scaling Improvements

#### **Increased Player Capacity**
- Maximum players increased from 11 to 12
- Dynamic map scaling adjusted for larger player counts
- Map sizes now range from 150x100 (2 players) to 400x300 (12 players)
- Power-up and wall spawning scales with player count
- **Files Modified**: `web-server.js` (lines 40-49, 615-621)

### 🐳 Docker Deployment

#### **Pre-built Docker Images**
- Docker images available at `trevor2maxwell/fun:latest` and `trevor2maxwell/fun:next`
- Multi-platform support (AMD64 + ARM64)
- Quick deployment: `docker pull trevor2maxwell/fun:latest && docker run -d -p 3000:3000 trevor2maxwell/fun:latest`
- **New Files**: `DOCKER_DEPLOYMENT.md` - Comprehensive deployment guide

### 📚 Documentation Updates

#### **Bug Tracking System**
- **New File**: `BUG_LOG.md` - Comprehensive bug tracking with 9 documented bugs
- Categorized by severity: CRITICAL (1), MEDIUM (6), LOW (1)
- Includes code locations, impact analysis, and suggested fixes
- Tracks resolved bugs with ✅ markers

#### **Updated Documentation**
- `WEB-README.md` updated with:
  - Latest features (12-player support, optimizations)
  - Docker deployment instructions
  - Recent updates section
  - Identity disc controls
  - Bug fix information
- `DOCKER_DEPLOYMENT.md` created with:
  - Quick start commands
  - Container management
  - Multi-platform builds
  - Cloud deployment guides
  - Troubleshooting section

### 🎮 Game Features

#### **Existing Features Documented**
- Identity Disc throwing (SPACE key)
- Power-ups (speed boosts)
- Dynamic map shrinking based on active players
- Two game modes: TIME (score-based) and LIVES (elimination)
- Trail fading and disconnected trail mechanics

### 🔧 Technical Details

#### **Server Configuration**
- Tick Rate: 15 FPS (confirmed as user preference)
- Message Protocol: msgpack-lite for binary serialization
- Delta compression for network efficiency
- WebSocket on port 5555, HTTP on port 3000

#### **Optimization Techniques**
- Spatial grid collision detection
- Lazy cleanup batching
- Delta state compression
- Binary message serialization

---

## Known Issues (See BUG_LOG.md for details)

### High Priority
1. **Server Crash Vulnerability** - Unhandled JSON parsing (CRITICAL)
2. **Grid Boundary Update Inconsistency** - Spatial grid not rebuilt after map shrinking

### Medium Priority
3. **Client Cleanup Race Condition** - Duplicate close messages
4. **Coordinate Generation Failure** - Fails on maps smaller than 40x40
5. **Inconsistent Player Filtering** - Mixes `c.lives > 0` and `c.alive` checks
6. **Respawn Failure Fallback Missing** - Players stuck dead after 100 failed attempts
7. **Inefficient Deep Cloning** - Performance hit from `JSON.parse(JSON.stringify())`

### Low Priority
8. **Incorrect Disc Distance Calculation** - Uses Manhattan instead of Euclidean distance

---

## Deployment Information

### Docker Hub
- **Repository**: `trevor2maxwell/fun`
- **Tags**: `latest` (stable), `next` (development)
- **Latest Digest**: `sha256:4d09959944c71c83497224c6cc1ccaad630380824da1e4ca7edd1e9f8f4c8687`

### Quick Deploy
```bash
docker pull trevor2maxwell/fun:latest
docker run -d -p 3000:3000 --name snake-game trevor2maxwell/fun:latest
```

Access at: http://localhost:3000

---

## Files Modified in This Release

### Core Game Files
- `web-server.js` - Bug fixes, optimizations, scaling improvements
- `index.html` - No changes (client-side stable)

### Documentation
- `WEB-README.md` - Updated with latest features and Docker info
- `BUG_LOG.md` - Created comprehensive bug tracking system
- `DOCKER_DEPLOYMENT.md` - Created Docker deployment guide
- `CHANGELOG.md` - This file

### Configuration
- `Dockerfile` - Existing (Node.js 18 Alpine)
- `.dockerignore` - Existing (excludes Python files and dev artifacts)
- `package.json` - No changes

---

## Migration Notes

### For Existing Deployments
1. Pull latest Docker image: `docker pull trevor2maxwell/fun:latest`
2. Stop old container: `docker stop snake-game && docker rm snake-game`
3. Run new container: `docker run -d -p 3000:3000 --name snake-game trevor2maxwell/fun:latest`

### Breaking Changes
- None - fully backward compatible

### Recommended Actions
- Update to latest Docker image to get Bug #3 fix
- Review `BUG_LOG.md` for remaining known issues
- Consider implementing fixes for high-priority bugs

---

## Performance Benchmarks

### Before Optimizations
- Collision detection: O(n²) complexity
- Cleanup: Every frame overhead
- Lives mode: Laggy with timer accumulation

### After Optimizations
- Collision detection: O(n) with spatial partitioning
- Cleanup: Batched every 30 frames
- Lives mode: Identical performance to time mode

### Recommended Player Counts
- Optimal: 2-8 players
- Maximum: 12 players
- Best performance: Wired ethernet connection

---

## Credits

**Bug Fixes**: Lives mode timer accumulation resolved  
**Optimizations**: Spatial partitioning, lazy cleanup  
**Deployment**: Docker containerization  
**Documentation**: Comprehensive guides and bug tracking

---

## Next Steps

See `BUG_LOG.md` for prioritized list of remaining bugs to fix.

**High Priority:**
1. Add try-catch for JSON parsing (prevents server crashes)
2. Rebuild spatial grid after map shrinking

**Future Enhancements:**
- Consider implementing remaining medium-priority bug fixes
- Explore additional performance optimizations
- Add automated testing for bug regression prevention
