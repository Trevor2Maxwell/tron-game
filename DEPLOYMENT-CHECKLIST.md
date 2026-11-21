# TRON Game Deployment Instructions

## Light Cycle Battle Marketplace submission

The requested price is US$1.99 one time for the game host. Nerd Metrics hosts the game on Fly.io. Invited guests should join the host's lobby for free. Confirm how Zoom will accept the one-time purchase before enabling a checkout path.

### Prepared in this workspace

- Added Zoom's required HTML response headers and restricted HTTP file serving to the intended public pages and game assets.
- Fixed lobby creation so the first player's selected capacity, mode, and round settings apply when the room is created.
- Revalidate a saved session when the app reopens and remove OAuth codes and Zoom profile details from the targeted sign-in logs.
- Drafted the player [quick start](quickstart.html), [support page](support.html), and [application architecture](output/pdf/light-cycle-battle-architecture.pdf).
- Set the draft listing's industry to **Other** and refreshed the short description.
- Verified a live Stripe catalog entry and one-time US$1.99 price for Light Cycle Battle. The game does not yet use this price.

### Zoom submission checklist

- [ ] **App Gallery**. Capture the Play Together prompt, shared lobby, and live match in the Zoom desktop client. Export at 1200 × 780 pixels.
- [x] **Industry Category**. Selected **Other** from Zoom's industry options. Games and Social Activities remain the Marketplace categories.
- [ ] **Privacy Policy URL**. Update the existing draft to describe the release build, data retention, and the way users exercise their data rights. Verify the removal behavior before making deletion promises.
- [ ] **Terms of Use URL**. Update the existing draft to describe the final license and billing terms.
- [ ] **Support URL**. Publish the support draft using `trevor@nerdmetrics.ca`. Add support hours and a first-response target approved by Nerd Metrics.
- [ ] **Documentation URL**. Publish the quick start after checking it against the final build.
- [ ] **Privacy acknowledgment**. Confirm that the published privacy page explains users' data rights and how to exercise them.
- [ ] **Application Overview**. Verify the release architecture against the diagram, then upload it and complete Zoom's technology and development fields.
- [ ] **Security Overview**. Document the actual Zoom data, storage protection, retention, verified webhooks, and incident handling. Supply evidence for any control marked as implemented.

### Production and payment prerequisites

- [ ] Ask Zoom whether its native Marketplace supports a US$1.99 one-time host license for this app, or whether reviewers allow a direct hosted Stripe Checkout and where it may be linked. The standard Zoom pricing page documents monthly and annual paid plans. For the native route, complete payout onboarding and configure the free and paid plans after Zoom confirms the billing option.
- [ ] Configure the Production Zoom OAuth client on Fly.io and verify the Home URL, redirect URL, runtime secret, domain allow list, and HTTPS response headers. The versioned Fly.io config currently contains the Development Zoom client ID.
- [ ] Implement verified Zoom launch context, the host entitlement check, server-enforced hosting privileges, and a guest path into the correct lobby. Enable Collaborate Mode, Play Together, and Guest Mode in the live Production configuration after they pass testing.
- [ ] Wire the approved checkout path into hosting access. Use verified Zoom entitlements for native Zoom purchases. Use a verified Stripe payment event and a server-side host entitlement if Zoom approves direct Stripe Checkout.
- [ ] Use a company-owned domain for the listing's resource URLs and complete Zoom's domain verification. Confirm the release name and commercial-use rights for the graphics, music, and other assets featured in the app.
- [ ] Verify the uninstall notification and its effect on stored Zoom data. Review remaining logs for sensitive data and remove public test-mode access from production.

### Question for Zoom Marketplace review

> Nerd Metrics is preparing Light Cycle Battle, a Zoom meeting game. We want to charge the person who hosts a game US$1.99 once, with invited colleagues joining free. Can we configure a one-time purchase through Zoom Marketplace? If the standard pricing editor only supports subscriptions, may we link to a hosted Stripe Checkout for the one-time host license, and where should that link appear for your review?

[Zoom Developer Support](https://developers.zoom.us/support/) · [Zoom pricing plans](https://developers.zoom.us/docs/distribute/monetization/pricing-plans/)

### Reviewer test plan draft

1. Give the test host access through a Zoom test license or an approved direct checkout test account. Install Light Cycle Battle using the Production test flow. In a Zoom desktop meeting, open **Apps → My Apps → Light Cycle Battle**, close it, then open it again. Confirm the host can start a lobby on both launches.
2. Set the lobby to three players. Select **Play Together**. Have two people without paid licenses accept the invitation. Include a participant who has never installed the app. Confirm all three appear in the same lobby and can ready up without asking guests to buy the game.
3. Play one timed round and one elimination round. Check controls, scoring, and the winner screen. Open the app in a second meeting and confirm it has its own lobby.
4. Verify that a user without the paid host license can join an invitation and cannot create a paid lobby. Withdraw the test entitlement and verify the hosting permission updates. Verify app removal and the handling of stored Zoom data.
5. Include a reviewer-accessible copy of this plan and any test-account instructions in the submission Release Notes. Give reviewers a test payment path, then submit the app for external users.

[Zoom Publish](https://developers.zoom.us/docs/build-flow/publish/) · [Review and listing requirements](https://developers.zoom.us/docs/distribute/app-submission/common-rejection-issues/) · [Zoom entitlements](https://developers.zoom.us/docs/distribute/monetization/get-entitlements/)

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
