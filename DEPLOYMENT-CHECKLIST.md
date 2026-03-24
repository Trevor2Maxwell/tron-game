# TRON Game Deployment Instructions

## 🚨 CRITICAL DEPLOYMENT CHECKS

### Before ANY Deployment - MUST CHECK:
1. **README files exist** - Always check for existing deployment instructions
2. **File integrity** - Verify HTML structure isn't corrupted
3. **Asset paths** - Confirm GIF/images exist and load correctly
4. **OAuth flow** - Test authentication end-to-end
5. **Responsive design** - Test on mobile/tablet/desktop
6. **Icon library** - Verify Iconoir CSS loads properly

### Pre-Deployment Checklist:
- [ ] Read all README files first
- [ ] Check file structure isn't corrupted
- [ ] Verify GIF exists at correct path
- [ ] Test OAuth flow manually
- [ ] Check responsive breakpoints
- [ ] Verify no emojis (use Iconoir only)
- [ ] Test authentication flow end-to-end

## What I Missed (Lessons Learned):

### 1. HTML Structure Corruption
**Problem**: Multiple edits corrupted the HTML structure
**Fix**: Always validate HTML after edits, use backup files
**Check**: `grep -n "div>" index.html | head -10` to verify structure

### 2. GIF Not Loading
**Problem**: GIF path incorrect or file missing
**Fix**: Verify file exists and path is correct
**Check**: `ls -la "Tron sample.gif"` and test in browser

### 3. OAuth Flow Broken
**Problem**: Authentication redirect not working
**Fix**: Test complete OAuth flow before deploy
**Check**: Manual test: `/auth/zoom?dev=true`

### 4. Missing Responsive Design
**Problem**: Layout doesn't scale properly
**Fix**: Test on multiple screen sizes
**Check**: Browser dev tools responsive testing

### 5. Icon Library Issues
**Problem**: Iconoir CSS not loading
**Fix**: Verify CDN link is correct
**Check**: Network tab for CSS loading

## Current Clean Implementation:

### Welcome Screen Features:
- ✅ Single column layout
- ✅ Auto-looping GIF
- ✅ One login button
- ✅ Responsive scaling
- ✅ Professional icons (no emojis)
- ✅ Clean authentication flow

### File Structure:
```
index.html - Clean, single-purpose welcome screen
├── Welcome Screen (default)
│   ├── Title: "TRON LIGHT CYCLES"
│   ├── GIF: Auto-looping preview
│   └── Button: "LOGIN WITH ZOOM"
└── Game Screen (after auth)
    ├── Player setup
    ├── Game configuration
    └── Multiplayer gameplay
```

### OAuth Flow:
1. User clicks "LOGIN WITH ZOOM"
2. Redirects to Zoom OAuth
3. Returns with auth status
4. Shows payment/paid status
5. Grants access to game screen

## Deployment Commands:

```bash
# Deploy to Fly.io
flyctl deploy

# Check deployment
flyctl status
flyctl logs

# Test URLs
# Normal: https://tron-game-zoom.fly.dev/
# DEV MODE: https://tron-game-zoom.fly.dev/auth/zoom?dev=true
```

## Post-Deployment Verification:

### Must Test After Every Deploy:
1. **Welcome screen loads** - Check GIF plays
2. **Login button works** - Redirects to Zoom
3. **OAuth flow complete** - Returns with status
4. **Payment gate works** - Blocks unpaid users
5. **Game screen loads** - After successful auth
6. **Responsive design** - Mobile/tablet/desktop
7. **Icons display** - No emoji fallbacks

### Debugging Commands:
```bash
# Check server logs for OAuth issues
flyctl logs

# Verify file structure
grep -n "screen" index.html

# Test GIF loading
curl -I https://tron-game-zoom.fly.dev/Tron%20sample.gif
```

## Global Rules for Future Changes:

### 1. Always Read README First
- Check for existing deployment instructions
- Look for known issues or fixes
- Verify current implementation

### 2. Validate HTML After Edits
- Use HTML validator
- Check for unclosed tags
- Verify structure integrity

### 3. Test Assets Before Deploy
- Verify all images/GIFs load
- Check file paths and permissions
- Test responsive behavior

### 4. Complete OAuth Testing
- Test normal flow
- Test DEV MODE flow
- Verify payment gate
- Check error handling

### 5. Mobile-First Design
- Test on smallest screens first
- Verify touch interactions
- Check readability

### 6. Professional Standards
- No emojis (use Iconoir)
- Clean, minimal design
- Proper error messages
- Consistent styling

## Emergency Recovery:

If deployment fails:
1. Check file integrity: `grep -n "div>" index.html`
2. Verify assets: `ls -la *.gif *.png`
3. Test OAuth manually
4. Check server logs: `flyctl logs`
5. Rollback if needed: `flyctl deploy --image previous-image`

## Contact & Support:

For deployment issues:
1. Check this README first
2. Review server logs
3. Test OAuth flow manually
4. Verify file structure
5. Check responsive design

Remember: **Always validate before deploy!**
