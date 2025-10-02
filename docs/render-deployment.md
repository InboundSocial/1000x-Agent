# Deploying to Render

Guide for deploying the 1000x Agent backend to Render.

---

## Option 1: Using Environment Variables (Recommended for Prototyping)

### Step 1: Create Web Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name:** `1000x-agent-backend`
   - **Environment:** `Node`
   - **Region:** Choose closest to your Supabase region
   - **Branch:** `main`
   - **Build Command:** `npm install`
   - **Start Command:** `node agent-backend/server.js`

### Step 2: Add Environment Variables

In the **Environment** tab, add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-role-key
NODE_ENV=production
PORT=3000
VAPI_WEBHOOK_TOKEN=your-generated-webhook-token
```

### Step 3: Deploy

- Click **"Create Web Service"**
- Wait for deployment (2-3 minutes)
- Note your URL: `https://your-app.onrender.com`

### Step 4: Update Backend Code

Update the MCP server URL in `agent-backend/server.js` (line 490):

```javascript
server: {
  url: "https://your-app.onrender.com/mcp",  // ← Update this
  headers: {
    "x-phone-number": phoneNumberCalled,
    "Content-Type": "application/json"
  }
}
```

Commit and push - Render will auto-deploy.

---

## Option 2: Using Doppler (Recommended for Production)

### Step 1: Set Up Doppler Project

```bash
# Create production config in Doppler dashboard or CLI
doppler setup --project 1000x-agent --config prod
```

### Step 2: Add Secrets to Doppler

```bash
doppler secrets set SUPABASE_URL=https://your-project.supabase.co --config prod
doppler secrets set SUPABASE_KEY=your-service-key --config prod
doppler secrets set NODE_ENV=production --config prod
doppler secrets set PORT=3000 --config prod
doppler secrets set VAPI_WEBHOOK_TOKEN=your-token --config prod
```

### Step 3: Generate Doppler Service Token

```bash
# In Doppler dashboard:
# 1. Go to Project Settings → Service Tokens
# 2. Create token for "prod" config
# 3. Copy the token (dp.st.prod.xxxxx)
```

### Step 4: Configure Render with Doppler

In Render environment variables, add **only**:

```
DOPPLER_TOKEN=dp.st.prod.your-token-here
```

### Step 5: Update Start Command

Change start command to:

```bash
npx doppler run -- node agent-backend/server.js
```

### Step 6: Deploy

Click **"Manual Deploy"** → **"Deploy latest commit"**

---

## Keeping Server Warm (Avoid Cold Starts)

### Problem
Free Render instances sleep after 15 minutes of inactivity, causing 30+ second cold starts.

### Solutions

**Option A: Upgrade to Paid Plan ($7/month)**
- Instances never sleep
- Guaranteed fast response times
- Recommended for production

**Option B: Keep-Alive Ping (Free Tier)**

Add this to your code or use a service like [UptimeRobot](https://uptimerobot.com):

```bash
# External service pings every 10 minutes:
# https://your-app.onrender.com/health
```

**Option C: Use Render Cron Job**

Create a separate Render Cron Job that pings your service every 10 minutes.

---

## Environment Variable Best Practices

### For Prototyping (Current Phase)
✅ Use Render Environment Variables
- Faster to set up
- Easy to modify in dashboard
- Good for testing

### For Production (After Validation)
✅ Use Doppler
- Centralized secret management
- Audit logs
- Easy rotation
- Team access control
- Works across multiple environments

---

## Health Checks

Render automatically monitors `/health` endpoint. If it returns non-200 status, Render will restart the service.

Your backend already has this:
```javascript
app.get("/health", (_req, res) => res.send("ok"));
```

---

## Viewing Logs

1. Go to Render Dashboard → Your Service
2. Click **"Logs"** tab
3. See real-time logs of requests and errors

Look for:
```
[VAPI Webhook] Received event: assistant-request
[Assistant Request] Cache hit for +15551234567
[Assistant Request] Returning config for: Client Name
```

---

## Updating Environment Variables

### With Render Environment Variables
1. Dashboard → Environment tab
2. Edit variable
3. Click **"Save Changes"**
4. Render auto-redeploys (takes ~2 min)

### With Doppler
```bash
# Update in Doppler (no Render redeploy needed!)
doppler secrets set VAPI_WEBHOOK_TOKEN=new-token --config prod

# Restart Render service to pick up new values
# (Or wait ~5 min for Doppler sync)
```

---

## Troubleshooting

### "Service Unavailable" Errors

**Problem:** Service is sleeping (free tier)

**Solution:** 
- Upgrade to paid plan, or
- Set up keep-alive ping

### "Missing SUPABASE_URL" Errors

**Problem:** Environment variables not set

**Solution:**
1. Check Environment tab has all required vars
2. Redeploy service
3. Check logs for startup errors

### "Invalid token" Errors

**Problem:** VAPI token mismatch

**Solution:**
1. Verify `VAPI_WEBHOOK_TOKEN` matches VAPI dashboard
2. Check for extra spaces or quotes
3. Generate new token if needed

---

## Performance Monitoring

Monitor these metrics in Render dashboard:
- **Response Time:** Should be <500ms for /vapi/webhooks
- **Memory Usage:** Should be <200MB
- **CPU Usage:** Should be <50% average

If response times spike:
- Check Supabase region alignment
- Verify database indexes exist
- Review cache hit rates in logs

---

## Security Checklist

- [ ] VAPI_WEBHOOK_TOKEN is set and matches VAPI dashboard
- [ ] Using HTTPS (automatic with Render)
- [ ] Supabase service role key (not anon key) is used
- [ ] Environment variables are not committed to git
- [ ] Logs don't contain secrets or tokens

---

## Next Steps After Deployment

1. ✅ Update VAPI organization Server URL to Render URL
2. ✅ Test with real phone call
3. ✅ Monitor logs for errors
4. ✅ Set up Doppler if moving to production
5. ✅ Upgrade to paid plan before going live with customers
