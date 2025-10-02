# VAPI Setup Guide

Complete guide to configure VAPI with the 1000x Agent backend using **transient assistants**.

---

## 📋 Overview

The 1000x Agent uses a **transient assistant architecture** with VAPI:
- Each client gets a unique phone number purchased in VAPI
- No persistent assistants are created in VAPI
- When a call arrives, VAPI requests assistant config from your backend
- Backend returns a temporary, client-specific assistant configuration
- The assistant exists only for that call

**Benefits:** Simplified management, instant updates across all clients, reduced VAPI resource usage.

---

## 🎯 Prerequisites

Before starting:
- ✅ Backend deployed and running (see [SETUP.md](./SETUP.md))
- ✅ Backend publicly accessible with HTTPS URL (e.g., via Render, Railway, ngrok)
- ✅ VAPI account created at [vapi.ai](https://vapi.ai)
- ✅ At least one client in Supabase `clients` table

---

## 📞 Step 1: Purchase Phone Number in VAPI

### 1. Log into VAPI Dashboard

Go to [dashboard.vapi.ai](https://dashboard.vapi.ai)

### 2. Navigate to Phone Numbers

- Click **"Phone Numbers"** in the left sidebar
- Click **"Buy Phone Number"**

### 3. Purchase Number

- Select country (e.g., United States)
- Choose area code or search for specific number
- Click **"Purchase"**
- Save the phone number (e.g., `+15551234567`)

### 4. Add Number to Supabase

```sql
-- Insert new client with VAPI phone number
INSERT INTO clients (client_name, twilio_number, ghl_token, location_id, timezone)
VALUES (
  'Your Client Business Name',
  '+15551234567',  -- The number you just purchased in VAPI
  'your-ghl-api-token',
  'your-ghl-location-id',
  'America/New_York'
)
RETURNING id;
```

Or update existing client:

```sql
UPDATE clients
SET twilio_number = '+15551234567'
WHERE id = 'your-client-uuid';
```

---

## 🤖 Step 2: Configure Assistant Request Webhook

This tells VAPI to ask your backend for assistant configuration on each call.

### 1. In VAPI Dashboard

- Go to **Phone Numbers**
- Click on the number you just purchased
- Scroll to **"Assistant"** section

### 2. Select "Server URL" Mode

- Instead of selecting a pre-created assistant, choose **"Server URL"**
- This enables the transient assistant feature

### 3. Configure Server URL

**Server URL:**
```
https://your-backend-url.com/vapi/webhooks
```

Replace `your-backend-url.com` with your actual backend URL (e.g., `agent-backend-7v2w.onrender.com`)

**Method:** `POST`

**What this does:**
- When a call arrives, VAPI sends a `POST` request with `assistant-request` event
- Your backend looks up the client by phone number
- Returns a dynamic assistant configuration
- VAPI uses that config for the call

### 4. Save Configuration

Click **"Save"** to apply the changes.

---

## 🔒 Step 3: Set Up Authentication

### 1. Generate a Webhook Token

```bash
# Generate a secure random token
openssl rand -hex 32
```

Copy the generated token (e.g., `a1b2c3d4e5f6...`)

### 2. Add to Your Environment

**For local development (.env file):**
```bash
# Add this line to your .env file
VAPI_WEBHOOK_TOKEN=your-generated-token-here
```

**For Render deployment:**
1. Go to Render Dashboard → Your Service → Environment
2. Add environment variable:
   - **Key:** `VAPI_WEBHOOK_TOKEN`
   - **Value:** `your-generated-token-here`
3. Save (triggers automatic redeploy)

**For Doppler (production):**
```bash
doppler secrets set VAPI_WEBHOOK_TOKEN=your-generated-token-here
```

### 3. Configure Authentication in VAPI

1. Go to VAPI Dashboard → **Organization Settings**
2. Find **Server URL** section
3. Set:
   - **URL:** `https://your-backend.com/vapi/webhooks`
   - **Authentication Type:** `Bearer Token`
   - **Token:** Paste your generated token
4. Save

**What this does:**
- VAPI will include `Authorization: Bearer your-token` header in all webhook requests
- Your backend verifies the token before processing
- Prevents unauthorized access to your webhook endpoint

---

## 🔧 Step 4: Configure MCP Server (Tool Integration)

The MCP server allows the assistant to use tools like calendar booking and contact management.

### Understanding MCP with Transient Assistants

With transient assistants, the MCP configuration is **returned dynamically** from your backend, not configured in VAPI dashboard. The backend includes MCP server details in the assistant config it returns.

### Backend MCP Configuration (Already Done)

Your backend already configures MCP in the `handleAssistantRequest()` function:

```javascript
{
  name: `1000x Agent - ${client.client_name}`,
  model: { ... },
  voice: { ... },
  server: {
    url: "https://your-backend.com/mcp",  // ← MCP endpoint
    headers: {
      "x-phone-number": phoneNumberCalled,  // ← Client routing
      "Content-Type": "application/json"
    }
  }
}
```

### Update Backend MCP URL

Make sure your backend has the correct public URL:

**File:** `agent-backend/server.js` (around line 489-494)

```javascript
server: {
  url: "https://YOUR-BACKEND-URL.com/mcp",  // ← Update this
  headers: {
    "x-phone-number": phoneNumberCalled,
    "Content-Type": "application/json"
  }
}
```

Replace `YOUR-BACKEND-URL.com` with your actual backend domain.

---

## 🗄️ Step 5: Set Up Database Index (Critical for Performance)

Run this SQL in your Supabase SQL Editor:

```sql
-- Add index for fast phone number lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_twilio_number 
ON clients (twilio_number);

-- Verify it was created
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'clients' 
AND indexname = 'idx_clients_twilio_number';
```

**Why this matters:**
- Without index: Database scans entire table on every call (slow, ~100-500ms)
- With index: Instant lookup (~5-20ms)
- Critical for maintaining low latency (<300ms total)

---

## 🧪 Step 6: Test the Integration

### Test 1: Call the Number

1. Call the VAPI phone number from your mobile phone
2. You should hear: `"Thank you for calling [Client Name]! How can I help you today?"`

### Test 2: Check Backend Logs

You should see:

```
[VAPI Webhook] Received event: assistant-request
[Assistant Request] Number called: +15551234567, From: +19995551234
[Assistant Request] Returning config for: Your Client Business Name
```

### Test 3: Test Tool Usage

During the call, try:
- "I'd like to book an appointment"
- "What times are available tomorrow?"
- "My name is John Smith and my phone is 555-1234"

The assistant should use the calendar tools via MCP.

---

## 🔄 Step 7: Add More Clients

To add another client, simply:

### 1. Purchase Another Number in VAPI

Repeat **Step 1** to buy a new number.

### 2. Configure Server URL

Set the **same** Server URL on the new number:
```
https://your-backend-url.com/vapi/webhooks
```

### 3. Add Client to Database

```sql
INSERT INTO clients (client_name, twilio_number, ghl_token, location_id, timezone)
VALUES (
  'Second Client Business',
  '+15559876543',  -- New number
  'second-client-ghl-token',
  'second-client-location-id',
  'America/Los_Angeles'
);
```

**That's it!** The backend automatically routes calls based on the number called.

---

## 🛠️ How It Works Behind the Scenes

### Call Flow

```
1. Customer calls +15551234567
   ↓
2. VAPI receives call
   ↓
3. VAPI sends POST to https://your-backend.com/vapi/webhooks
   Event: { type: "assistant-request", call: { phoneNumber: "+15551234567" } }
   ↓
4. Backend queries Supabase:
   SELECT * FROM clients WHERE twilio_number = '+15551234567'
   ↓
5. Backend builds assistant config:
   - Name: "1000x Agent - Client Business Name"
   - System prompt with client details
   - MCP server: https://your-backend.com/mcp
   - Voice settings
   ↓
6. Backend returns config to VAPI
   ↓
7. VAPI uses config to handle the call
   ↓
8. During call, assistant calls tools via MCP endpoint
   ↓
9. MCP endpoint uses x-phone-number header to route to correct GHL
   ↓
10. Call ends, VAPI sends end-of-call webhook
```

### Event Types

Your backend handles these VAPI webhook events:

| Event Type | When | Handled By | Purpose |
|------------|------|------------|---------|
| `assistant-request` | Call starts | `handleAssistantRequest()` | Return assistant config |
| `call.started` | Call connected | `handleCallStarted()` | Create session, GHL contact |
| `call.ended` | Call ends | `handleCallEnded()` | Save transcript, recording |
| `status-update` | During call | `handleStatusUpdate()` | Track progress |

---

## 🆘 Troubleshooting

### "The number you called is not available"

**Problem:** VAPI number not configured with Server URL.

**Solution:**
1. Go to VAPI Dashboard → Phone Numbers
2. Click on your number
3. Set **Server URL** to `https://your-backend.com/vapi/webhooks`
4. Save

---

### Generic "Hello! How can I help you today?" message

**Problem:** Backend couldn't find client for phone number.

**Solution:**
1. Check backend logs for error message
2. Verify `twilio_number` in Supabase matches VAPI number exactly (including +1)
3. Run query:
   ```sql
   SELECT * FROM clients WHERE twilio_number = '+15551234567';
   ```
4. If no results, add the client to database

---

### MCP tools not working

**Problem:** MCP server URL incorrect or unreachable.

**Solution:**
1. Check `server.url` in `handleAssistantRequest()` function
2. Verify backend is publicly accessible
3. Test MCP endpoint directly:
   ```bash
   curl -X POST https://your-backend.com/mcp \
     -H "x-phone-number: +15551234567" \
     -H "Content-Type: application/json" \
     -d '{"method":"tools/list","params":{}}'
   ```
4. Should return list of available tools

---

### Assistant not using client details

**Problem:** Database not updated or backend not reading client data.

**Solution:**
1. Check that client has `client_name`, `timezone`, etc. populated in Supabase
2. Review backend logs for `[Assistant Request] Returning config for: [Name]`
3. Verify the name matches what's in database

---

## 🔒 Security Considerations

### 1. Use HTTPS Only

VAPI requires HTTPS for webhooks. Use:
- Render (automatic HTTPS)
- Railway (automatic HTTPS)
- ngrok (for local testing: `ngrok http 3000`)

### 2. Validate Webhook Signatures (Optional)

For production, validate VAPI webhook signatures:

```javascript
// TODO: Add VAPI signature validation
app.post("/vapi/webhooks", async (req, res) => {
  const signature = req.headers['x-vapi-signature'];
  // Verify signature before processing
});
```

### 3. Rate Limiting

Add rate limiting to webhook endpoint to prevent abuse.

---

## 📊 Monitoring & Analytics

### Track Assistant Requests

Check backend logs for:
```
[Assistant Request] Number called: +15551234567
[Assistant Request] Returning config for: Client Name
```

### Monitor Call Volume

Query `voice_sessions` table:

```sql
-- Calls per client today
SELECT 
  c.client_name,
  COUNT(*) as call_count
FROM voice_sessions vs
JOIN clients c ON vs.client_id = c.id
WHERE vs.started_at::date = CURRENT_DATE
GROUP BY c.client_name;
```

---

## ✅ VAPI Setup Checklist

- [ ] VAPI account created
- [ ] Phone number purchased in VAPI
- [ ] Number added to Supabase `clients` table
- [ ] Backend deployed with public HTTPS URL
- [ ] Server URL configured in VAPI phone number settings
- [ ] MCP server URL updated in backend code
- [ ] Test call placed successfully
- [ ] Client-specific greeting heard
- [ ] MCP tools working (calendar, contacts)
- [ ] Additional clients added (if needed)

---

## 🔗 Resources

- [VAPI Documentation](https://docs.vapi.ai)
- [VAPI Assistant Request Docs](https://docs.vapi.ai/assistants/dynamic-assistants)
- [GoHighLevel MCP Integration](https://highlevel.stoplight.io/)
- [Backend Setup Guide](./SETUP.md)

---

**Ready to go?** Make your first test call and verify the transient assistant responds with your client's business name!
