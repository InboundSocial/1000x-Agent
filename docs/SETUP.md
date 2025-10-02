# Setup Guide

Complete guide to set up the 1000x Agent backend from scratch.

---

## 📋 Prerequisites

- **Docker Desktop** running (for devcontainer)
- **VS Code or Cursor** with Dev Containers extension
- **Doppler account** - [Sign up free](https://doppler.com)
- **Supabase project** - [Sign up free](https://supabase.com)
- **GoHighLevel account** with API access

---

## 🚀 Step 1: Clone and Open in Container

### From GitHub Template
```bash
# Option A: GitHub UI
# Click "Use this template" → "Create a new repository"

# Option B: GitHub CLI
gh repo create YOUR_ORG/YOUR_REPO --template InboundSocial/1000x-Agent --public
gh repo clone YOUR_ORG/YOUR_REPO
cd YOUR_REPO
```

### Open in Container
```bash
# Open in VS Code or Cursor
code .   # or: cursor .

# When prompted, click "Reopen in Container"
# This installs Node 22, Doppler CLI, and other tools automatically
```

**Wait for container to build** (first time takes 2-3 minutes)

---

## 🔐 Step 2: Set Up Doppler

Doppler securely manages your environment variables (API keys, database URLs, etc.)

### Option A: Interactive Login (Recommended)

```bash
# Inside the container terminal
./scripts/doppler-login.sh
```

This will:
1. Open your browser to authenticate
2. Link the project to `1000x-agent/dev`
3. Verify secrets access

### Option B: Service Token (CI/CD)

If browser auth doesn't work (headless environments):

1. Go to [Doppler Dashboard](https://dashboard.doppler.com)
2. Create project `1000x-agent` with config `dev`
3. Generate a service token
4. Export it:

```bash
export DOPPLER_TOKEN=dp.st.dev.YOUR_TOKEN
export DOPPLER_PROJECT=1000x-agent
export DOPPLER_CONFIG=dev
```

### Add Required Secrets

```bash
# Supabase credentials
doppler secrets set SUPABASE_URL=https://your-project.supabase.co
doppler secrets set SUPABASE_KEY=your_supabase_service_key

# Runtime config
doppler secrets set NODE_ENV=development
doppler secrets set PORT=3000

# Verify
doppler secrets
```

---

## 📊 Step 3: Set Up Supabase Database

### 1. Create Project
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Create new project (note your password!)

### 2. Get Credentials

```bash
# In Supabase Dashboard → Settings → API
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJ...  # Service role key (not anon key!)
```

### 3. Create Database Table

Go to SQL Editor and run:

```sql
-- Create clients table for storing GHL credentials and phone numbers
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  twilio_number TEXT UNIQUE NOT NULL,  -- The phone number for this client
  ghl_token TEXT NOT NULL,
  location_id TEXT NOT NULL,
  timezone TEXT DEFAULT 'America/New_York',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grant access (if using RLS)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Example: Insert your first client
INSERT INTO clients (client_name, twilio_number, ghl_token, location_id, timezone)
VALUES (
  'Sample Business LLC',
  '+15551234567',  -- Phone number purchased for this client
  'your-gohighlevel-api-token',
  'your-ghl-location-id',
  'America/New_York'
)
RETURNING id;  -- Save this ID for testing
```

**Note on Transient Assistants:**
This system uses a **transient assistant architecture**. Instead of creating persistent VAPI assistants for each client, when a call arrives to a client's number, the backend:
1. Looks up the client by `twilio_number`
2. Programmatically creates a temporary assistant with client-specific configuration
3. Returns this config to VAPI for that call only

This approach simplifies management and allows dynamic updates to all clients simultaneously.

### 4. Update Doppler with Supabase Credentials

```bash
doppler secrets set SUPABASE_URL=https://your-project.supabase.co
doppler secrets set SUPABASE_KEY=eyJhbG...your-service-key
```

---

## 🏢 Step 4: Get GoHighLevel Credentials

Your backend connects to GoHighLevel CRM on behalf of your clients.

### Per-Client Credentials Needed:
1. **GHL API Token** - OAuth token for API access
2. **Location ID** - The GHL location/sub-account ID

### Where to Find Them:

**API Token:**
1. Log into GoHighLevel
2. Go to Settings → Integrations → API Key
3. Create or copy your API key

**Location ID:**
1. In GHL, check the URL: `https://app.gohighlevel.com/location/{LOCATION_ID}/...`
2. Or use the API: `GET https://services.leadconnectorhq.com/locations/`

### Store in Supabase:

```sql
-- Update your client with GHL credentials
UPDATE clients
SET 
  ghl_token = 'your-ghl-api-token',
  location_id = 'your-location-id'
WHERE id = 'your-client-uuid';
```

---

## ▶️ Step 5: Run the Backend

```bash
# Install dependencies
npm install

# Start the backend (with Doppler secrets)
npm run dev:backend
```

You should see:
```
agent-backend running on http://localhost:3000
Health check: http://localhost:3000/health
```

---

## 🧪 Step 6: Test the Integration

### Test 1: Health Check
```bash
curl http://localhost:3000/health
# Expected: "ok"
```

### Test 2: Verify Supabase Connection

```bash
# Create a test script
cat << 'EOF' > test-db.js
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const { data, error } = await supabase.from("clients").select("*");
console.log(error ? `Error: ${error.message}` : `Found ${data.length} clients`);
EOF

# Run it
doppler run -- node test-db.js
# Expected: "Found 1 clients" (or however many you have)

# Clean up
rm test-db.js
```

### Test 3: Create Contact in GoHighLevel

```bash
# Replace client_id with your UUID from Supabase
curl -X POST http://localhost:3000/tools/find_or_create_contact \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-uuid-here",
    "email": "testcontact@example.com",
    "phone": "+15551234567",
    "name": "Test Contact"
  }'
```

**Expected Response:**
```json
{
  "contactId": "ghl-contact-id",
  "existed": false,
  "contact": {
    "id": "ghl-contact-id",
    "email": "testcontact@example.com",
    "type": "lead",
    ...
  }
}
```

✅ **Success!** Your contact was created in GoHighLevel.

---

## 🔄 Using on Multiple Computers

Once you've completed setup, moving to another machine is simple:

### On New Machine:
```bash
# 1. Pull the code
git clone https://github.com/YOUR_ORG/1000x-Agent.git
cd 1000x-Agent

# 2. Open in container
code .  # Choose "Reopen in Container"

# 3. Login to Doppler (one-time)
./scripts/doppler-login.sh

# 4. Run
npm install
npm run dev:backend
```

**That's it!** All your secrets are in Doppler, so no need to copy tokens.

---

## 🆘 Troubleshooting

### "Invalid Auth token" Error

**Problem:** Doppler token expired or not set.

**Solution:**
```bash
./scripts/doppler-login.sh
```

Or export a fresh service token:
```bash
export DOPPLER_TOKEN=dp.st.dev.YOUR_NEW_TOKEN
export DOPPLER_PROJECT=1000x-agent
export DOPPLER_CONFIG=dev
```

---

### "Missing SUPABASE_URL or SUPABASE_KEY"

**Problem:** Secrets not in Doppler.

**Solution:**
```bash
# Check what's there
doppler secrets

# Add missing ones
doppler secrets set SUPABASE_URL=https://your-project.supabase.co
doppler secrets set SUPABASE_KEY=your-key
```

---

### Port 3000 Already in Use

**Problem:** Another process is using port 3000.

**Solution A:** Kill existing process
```bash
pkill -f "node agent-backend/server.js"
npm run dev:backend
```

**Solution B:** Use different port
```bash
doppler run -- PORT=3001 node agent-backend/server.js
```

---

### "relation clients does not exist"

**Problem:** Supabase table not created.

**Solution:** Run the SQL from Step 3 in Supabase SQL Editor.

---

### GoHighLevel API Errors

**Problem:** `{"message":["email must be an email"]}`

**Solution:** Always include `email` in contact creation requests. GHL requires email.

**Problem:** `401 Unauthorized` or `403 Forbidden`

**Solution:** Check your GHL token is valid:
1. Go to GoHighLevel Settings → API
2. Regenerate token if needed
3. Update in Supabase:
```sql
UPDATE clients SET ghl_token = 'new-token' WHERE id = 'client-uuid';
```

---

## 🔐 Security Best Practices

### 1. Rotate Tokens Regularly

```bash
# In Doppler Dashboard:
# 1. Create new service token
# 2. Delete old one
# 3. Update your local env or shell profile
```

### 2. Use Service Tokens Only in CI/CD

- **Development:** Use personal auth (`doppler login`)
- **Production/CI:** Use service tokens with minimal permissions

### 3. Never Commit Secrets

Already protected:
- ✅ `.env` in `.gitignore`
- ✅ `.doppler.yaml` in `.gitignore`
- ✅ Secrets only in Doppler cloud

---

## 🌐 Deploying to Production

### Option 1: Render

1. Create new Web Service
2. Add environment variables:
   ```
   DOPPLER_TOKEN=dp.st.prod.YOUR_PROD_TOKEN
   DOPPLER_PROJECT=1000x-agent
   DOPPLER_CONFIG=prod
   ```
3. Build command: `npm install`
4. Start command: `npm run dev:backend`

### Option 2: Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Option 3: Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Deploy
fly launch
fly secrets set DOPPLER_TOKEN=dp.st.prod.YOUR_TOKEN
fly deploy
```

---

## 📝 Adding More Tool Endpoints

To add new endpoints (appointments, SMS, etc.):

### 1. Add Route in `agent-backend/server.js`

```javascript
app.post("/tools/send_sms", async (req, res) => {
  try {
    const { client_id, phone, message } = req.body;
    
    // Get client credentials from Supabase
    const { data: client } = await supabase
      .from("clients")
      .select("ghl_token")
      .eq("id", client_id)
      .single();
    
    // Call GHL SMS API
    // ... implementation
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

### 2. Test the Endpoint

```bash
curl -X POST http://localhost:3000/tools/send_sms \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "uuid",
    "phone": "+15551234567",
    "message": "Hello from backend!"
  }'
```

### 3. Configure in VAPI

Add the new function to your VAPI assistant config.

---

## 🔗 Useful Links

- [Doppler Documentation](https://docs.doppler.com)
- [Supabase Documentation](https://supabase.com/docs)
- [GoHighLevel API Reference](https://highlevel.stoplight.io/)
- [VAPI Documentation](https://docs.vapi.ai)

---

## ✅ Setup Checklist

- [ ] Container built and running
- [ ] Doppler authenticated (`./scripts/doppler-login.sh`)
- [ ] Doppler secrets set (SUPABASE_URL, SUPABASE_KEY)
- [ ] Supabase project created
- [ ] `clients` table created in Supabase
- [ ] GoHighLevel credentials added to Supabase
- [ ] Dependencies installed (`npm install`)
- [ ] Backend running (`npm run dev:backend`)
- [ ] Health check passing (`curl http://localhost:3000/health`)
- [ ] Contact creation tested successfully

---

**All set?** Head back to [README.md](./README.md) for daily usage commands.

**Questions?** Check the Troubleshooting section above or open an issue on GitHub.

