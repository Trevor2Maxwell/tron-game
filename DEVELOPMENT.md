# Zoom App Development Reference Guide

This document contains lessons learned and troubleshooting steps for Zoom App development to speed up future projects.

## 🚨 Critical OAuth Fixes Applied

### URL Parsing Issue
**Problem**: `req.url` includes query parameters, causing 404 on OAuth callback
```javascript
// ❌ BROKEN - req.url = "/?auth=success&paid=false"
let filePath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url);

// ✅ FIXED - Parse URL to get pathname only  
const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
let filePath = parsedUrl.pathname === '/' ? '/index.html' : decodeURIComponent(parsedUrl.pathname);
```

### Dynamic DEV MODE
**Problem**: Hard-coded environment variables for development mode
```javascript
// ✅ FLEXIBLE - URL parameter OR environment variable
const isDevMode = url.searchParams.get('dev') === 'true' || process.env.NODE_ENV !== 'production';

// Usage: https://your-app.com/auth/zoom?dev=true
// eg: https://tron-game-zoom.fly.dev/auth/zoom?dev=true
```

### OAuth Flow Debugging
**Problem**: 404 errors on OAuth callback without debugging
```javascript
// ✅ ADD DEBUGGING
console.log('OAuth handler called for:', url.pathname);
console.log('Full URL:', req.url);
console.log('Authorization code:', code);
```

## Table of Contents
- [Local Development Setup](#local-development-setup)
- [OAuth Flow & Session Management](#oauth-flow--session-management)
- [Common Errors & Solutions](#common-errors--solutions)
- [Zoom Marketplace Configuration](#zoom-marketplace-configuration)
- [Code Structure Notes](#code-structure-notes)
- [Testing Checklist](#testing-checklist)

---

## Local Development Setup

### 1. Ngrok Tunnel Setup
```bash
# Start ngrok on your app's port (default: 3000)
ngrok http 3000
```

**Important:**
- Copy the HTTPS URL (e.g., `https://unbrewed-maryjo-nonseasonable.ngrok-free.app`)
- Ngrok URLs change each restart unless you have a paid plan with reserved domains
- **Update all references when ngrok URL changes**

### 2. Environment Variables (.env)
```
ZM_CLIENT_ID=your_zoom_client_id
ZM_CLIENT_SECRET=your_zoom_client_secret
ZM_REDIRECT_URL=https://your-ngrok-url.ngrok-free.app/auth
SESSION_SECRET=random_string_for_sessions
```

**Critical:** `ZM_REDIRECT_URL` must match exactly what's configured in Zoom Marketplace (including protocol and path).

### 3. Starting the Development Server
```bash
# Option 1: Development mode (with hot reload)
npm run dev

# Option 2: Production mode
npm start

# Option 3: Direct node execution
node app.js
```

---

## OAuth Flow & Session Management

### OAuth Flow Overview
1. User visits `/install` route
2. App generates `state` and `verifier` (PKCE)
3. Stores in session, redirects to Zoom
4. User authorizes on Zoom
5. Zoom redirects to `/auth?code=xxx&state=xxx`
6. App validates state, exchanges code for token
7. Fetches deeplink, redirects to Zoom client

### Session Configuration for Development
When using ngrok (non-HTTPS local proxy), session cookie settings must be adjusted:

```javascript
// server/session.js
export default session({
    name: 'zoom-app-session',
    secret: zoomApp.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,        // MUST be false for ngrok HTTP
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'lax',      // 'lax' works with ngrok redirects
    },
});
```

**Production:** Change `secure: true` and `sameSite: 'strict'`

### Common Session Issues

#### Issue: Session not persisting between /install and /auth
**Symptoms:** "code verifier code must be a valid string" error

**Causes & Fixes:**
1. **Missing import** - Check that `zoomApp` is imported in `server/routes/index.js`:
   ```javascript
   import { zoomApp } from '../../config.js';  // NOT '../config.js'
   ```
   
2. **Incorrect path** - From `server/routes/index.js`, config is at `../../config.js` (root level)

3. **Session not saving** - Add explicit `req.session.save()`:
   ```javascript
   req.session.state = state;
   req.session.verifier = verifier;
   req.session.save((err) => {
       if (err) console.error('Session save error:', err);
       res.redirect(url.href);
   });
   ```

4. **Cookie settings wrong** - See session configuration above

#### Issue: ReferenceError: zoomApp is not defined
**Location:** `server/routes/index.js`

**Fix:** Add import at top of file:
```javascript
import { zoomApp } from '../../config.js';
```

---

## Common Errors & Solutions

### ERR_NGROK_3200
**Message:** "Too many connections"

**Solution:** Restart ngrok with new URL, update all references.

### ERR_NGROK_8012
**Message:** "Traffic made it to ngrok agent, but connection to upstream refused"

**Causes:**
- Local server not running on port 3000
- Port already in use

**Fixes:**
```bash
# Kill process on port 3000 (Windows PowerShell)
Get-NetTCPConnection -LocalPort 3000 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# Then restart server
node app.js
```

### Error 4700 - Invalid redirect
**Message:** "Invalid redirect: https://..."

**Cause:** Redirect URL doesn't match Marketplace configuration

**Fix:** Update OAuth Redirect URL whitelist in Zoom Marketplace → App Credentials

### 500 - "code verifier code must be a valid string"
**Cause:** Session verifier is null/undefined

**Check:**
1. Is session persisting? (See session issues above)
2. Is `state` parameter being validated? Check console logs
3. Was session lost between /install and /auth?

---

## Zoom Marketplace Configuration

### Required Settings

#### App Credentials
- **OAuth Redirect URL(s):** Must include your ngrok URL + `/auth`
  - Example: `https://xxxx.ngrok-free.app/auth`
  - Use wildcard for development: `https://*.ngrok-free.app/auth`

#### OAuth Information
- **Scopes:** Define what your app can access
  - `zoomapp:deeplink` - Required for deeplinks
  - Other scopes as needed (user:read, meeting:read, etc.)

#### Features
- Enable required features
- Configure domain allowlist for iframe loading

### Account-Level vs User-Level Apps

| Type | Who Installs | Where It Appears |
|------|-------------|------------------|
| Account-Level | Account Admin | All users on account |
| User-Level | Each user individually | User's personal Apps |

**Note:** Account-level apps don't show in individual user's Apps section unless admin installs for entire account.

---

## Installable Apps & Monetization

### Current App vs Installable App

**Current Setup (OAuth-only):**
- User clicks OAuth link → app opens temporarily
- App doesn't persist in user's Apps list
- Must click OAuth link each time

**Installable App:**
- User clicks "Add" in Zoom Marketplace
- App appears permanently in Zoom client Apps section
- Can be launched directly from Zoom without OAuth link
- Supports monetization/subscriptions

### Converting to Installable App

#### 1. Marketplace Configuration Changes

**Required Settings:**
- **App Type:** Must be published to Zoom Marketplace (not just "Draft")
- **Distribution:** Set to "Installable" instead of "Account" only
- **Feature Tab:** Enable "Add to Zoom" button
- **Submission:** Complete app review process

**Steps in Zoom Marketplace:**
1. Go to your app → **Manage** → **App Submission**
2. Fill out all required fields (Description, Screenshots, Privacy Policy)
3. Submit for review (takes 1-2 weeks)
4. Once approved, app appears in Marketplace for users to "Add"

#### 2. Code Changes Required

**Backend Changes:**

Add webhook handling for installation events:

```javascript
// server/routes/webhooks.js - New file
import express from 'express';
import { handleError } from '../helpers/routing.js';

const router = express.Router();

// Zoom App Installation webhook
router.post('/install', async (req, res) => {
    const { event, payload } = req.body;
    
    if (event === 'app_installed') {
        // Store user's installation info in database
        // payload contains: user_id, account_id, access_token
        console.log('App installed by user:', payload.user_id);
        
        // Store tokens for future API calls
        await saveUserTokens(payload);
    }
    
    res.status(200).send('OK');
});

// App uninstalled webhook
router.post('/uninstall', async (req, res) => {
    const { event, payload } = req.body;
    
    if (event === 'app_uninstalled') {
        // Clean up user data
        await removeUserTokens(payload.user_id);
    }
    
    res.status(200).send('OK');
});

export default router;
```

**Update app.js to include webhooks:**
```javascript
// Add before error handler
import webhookRoutes from './server/routes/webhooks.js';
app.use('/webhook', webhookRoutes);
```

**Database Requirements:**
- Store user tokens (access_token, refresh_token, expires_at)
- Track which users have installed your app
- Store app context data for deeplink launches

```javascript
// Example database schema
const userAppSchema = {
    zoom_user_id: String,
    zoom_account_id: String,
    access_token: String,
    refresh_token: String,
    token_expires_at: Date,
    installed_at: Date,
    last_used_at: Date
};
```

#### 3. Handling App Launches (Different from OAuth)

When app is installed, it can be launched directly from Zoom client:

```javascript
// server/routes/index.js - Update home route
router.get('/', async (req, res, next) => {
    try {
        const header = req.header(contextHeader);
        const context = header && getAppContext(header);

        if (!context) {
            return res.render('index', { isZoom: false, title: 'Hello Browser' });
        }

        // For installed apps, verify user has valid stored token
        const userTokens = await getUserTokens(context.uid);
        
        if (!userTokens || isTokenExpired(userTokens)) {
            // User needs to re-authorize
            return res.redirect('/install');
        }

        // Token valid, render app
        return res.render('index', {
            isZoom: true,
            title: 'Hello Zoom',
            accessToken: userTokens.access_token  // Pass to frontend if needed
        });
    } catch (e) {
        next(handleError(e));
    }
});
```

### Monetization Setup

#### Zoom App Monetization (New Feature)

**Requirements:**
1. App must be published on Zoom Marketplace
2. Complete monetization application
3. Set up Stripe Connect account
4. Define pricing tiers in Marketplace

**Steps:**
1. **Marketplace → Monetization Tab**
   - Enable "Paid App" toggle
   - Connect Stripe account
   - Set pricing: Monthly/Annual subscription or One-time purchase

2. **Pricing Models:**
   - **Per User:** Each user pays individually
   - **Per Account:** Account admin pays for all users
   - **Freemium:** Free tier + paid upgrades

3. **Code Changes for Paid Features:**

```javascript
// Check user's subscription status
async function checkSubscription(userId) {
    const subscription = await getUserSubscription(userId);
    
    if (!subscription || subscription.status !== 'active') {
        throw new Error('Subscription required');
    }
    
    return subscription.tier;  // 'basic', 'pro', 'enterprise'
}

// Protect paid routes
router.get('/premium-feature', async (req, res) => {
    const context = getAppContext(req.header(contextHeader));
    
    try {
        const tier = await checkSubscription(context.uid);
        
        if (tier === 'basic') {
            return res.status(403).json({ 
                error: 'Upgrade required',
                upgrade_url: '/subscribe'
            });
        }
        
        // Serve premium content
        res.json({ feature: 'premium content' });
    } catch (e) {
        res.status(402).json({ error: 'Payment required' });
    }
});
```

4. **Webhook for Payment Events:**

```javascript
// Add to webhooks.js
router.post('/billing', async (req, res) => {
    const { event, payload } = req.body;
    
    switch(event) {
        case 'subscription_created':
            await activateSubscription(payload);
            break;
        case 'subscription_cancelled':
            await deactivateSubscription(payload);
            break;
        case 'payment_failed':
            await notifyPaymentFailed(payload);
            break;
    }
    
    res.status(200).send('OK');
});
```

### Testing Installable Apps

**Local Testing (Pre-Publication):**
1. **Test Users:** Add test users in Marketplace → Test Users
2. **Install URL:** Use direct install link (not OAuth flow)
3. **Private Testing:** Keep app in "Draft" mode, invite specific users

**Production Checklist:**
- [ ] App passes Zoom security review
- [ ] Webhook endpoints verified and responding
- [ ] Database storing user tokens correctly
- [ ] Token refresh logic working
- [ ] Graceful handling of uninstall/reinstall
- [ ] Monetization webhooks tested (if paid)

### Key Differences Summary

| Aspect | OAuth-Only | Installable + Monetized |
|--------|-----------|-------------------------|
| Discovery | Direct link | Marketplace search |
| Persistence | Temporary session | Stored tokens |
| Launch Method | OAuth link | Click in Zoom Apps |
| User Data | Not stored | Database required |
| Revenue | None | Stripe integration |
| Maintenance | Low | Webhooks, token refresh |

---

## Code Structure Notes

### File Locations & Imports

From `server/routes/*.js`:
- **Root config:** `../../config.js`
- **Helpers:** `../helpers/*.js`
- **Session middleware:** `../session.js`

From `server/helpers/*.js`:
- **Root config:** `../../config.js`

### Key Routes

| Route | Purpose |
|-------|---------|
| `/` | Home page, handles deep link launches |
| `/install` | Initiates OAuth, generates PKCE |
| `/auth` | OAuth callback, exchanges code for token |
| `/test-session` | Debug: tests session persistence |

### Required Environment Variables

```javascript
// config.js dependencies
deps = [
    'ZM_CLIENT_ID',      // From Zoom Marketplace
    'ZM_CLIENT_SECRET',  // From Zoom Marketplace
    'ZM_REDIRECT_URL',   // Must match Marketplace
    'SESSION_SECRET',    // Random string you generate
];
```

---

## Testing Checklist

### Initial Setup
- [ ] `.env` file created with all required variables
- [ ] Ngrok tunnel running
- [ ] Ngrok URL updated in `.env` (ZM_REDIRECT_URL)
- [ ] Ngrok URL added to Zoom Marketplace OAuth whitelist
- [ ] Local server running on port 3000

### OAuth Flow Testing
- [ ] Visit `/test-session` - refresh to verify session increments
- [ ] Visit `/install` - should redirect to Zoom authorization
- [ ] Authorize on Zoom - should redirect to `/auth`
- [ ] No 500 errors during callback
- [ ] Deeplink received and Zoom client opens

### Debugging Commands

**Check session persistence:**
```
GET https://your-ngrok-url/test-session
GET https://your-ngrok-url/test-session (should increment)
```

**View server logs:**
```bash
# Windows
set "DEBUG=zoomapps*" & node app.js

# Mac/Linux
DEBUG="zoomapps*" node app.js
```

---

## Quick Reference: File Changes for This App

### Fixed: Session Import Path
**File:** `server/routes/index.js`
```javascript
// WRONG - causes module not found
import { zoomApp } from '../config.js';

// CORRECT
import { zoomApp } from '../../config.js';
```

### Fixed: Session Cookie Settings
**File:** `server/session.js`
```javascript
cookie: {
    secure: false,    // Required for ngrok
    sameSite: 'lax',  // Required for redirect flow
}
```

### Added: Session Persistence Logging
**File:** `server/routes/index.js` - Install route
```javascript
console.log('Install - generated state:', state);
console.log('Install - generated verifier:', verifier);
req.session.save((err) => {
    console.log('Install - session saved');
    res.redirect(url.href);
});
```

### Added: Auth Debugging
**File:** `server/routes/auth.js`
```javascript
console.log('Auth callback - session state:', req.session.state);
console.log('Auth callback - session verifier:', req.session.verifier);
console.log('Auth callback - full session:', req.session);
```

---

## Troubleshooting Decision Tree

1. **Ngrok error?**
   - 3200 → Restart ngrok, update URL everywhere
   - 8012 → Start local server, kill port 3000 conflicts

2. **500 error on /auth?**
   - Check server console for specific error
   - "code verifier" → Session issue (see above)
   - "invalid state" → Session expired or mismatch

3. **OAuth completes but app doesn't open in Zoom?**
   - Check deeplink URL in browser console
   - Verify Zoom client is installed
   - Try manually pasting deeplink URL

4. **App opens but doesn't persist in Zoom Apps?**
   - Check if Account-level vs User-level app
   - User-level: Must click "Add" in Marketplace, not just OAuth
   - Try restarting Zoom client

---

## Resources

- [Zoom Apps SDK Documentation](https://developers.zoom.us/docs/zoom-apps/)
- [Zoom OAuth Guide](https://developers.zoom.us/docs/integrations/oauth/)
- [PKCE Specification](https://oauth.net/2/pkce/)
- [Ngrok Documentation](https://ngrok.com/docs)

---

## Version History

| Date | Changes |
|------|---------|
| 2024-03-10 | Initial document based on session troubleshooting |
