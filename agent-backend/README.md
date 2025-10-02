# Agent Backend

Lightweight backend for contractor AI agents. Provides tool endpoints (e.g., find/create contacts, book appointments, send SMS) that connect VAPI assistants to GoHighLevel and Twilio.

## 🏗️ Architecture

- **Express** server with REST API endpoints
- **Supabase** for client credential storage
- **GoHighLevel (GHL)** integration for CRM operations
- **Doppler** for secrets management (migrated from Render)

## 🔐 Required Secrets (in Doppler)

The backend needs these environment variables:

### Already in Doppler ✅

```bash
SUPABASE_URL=https://fqptsjvfvhippzwsxdza.supabase.co
SUPABASE_KEY=your_supabase_service_key
PORT=3000  # or 3001 if running alongside main app
```

### Database Schema (Supabase)

The backend expects a `clients` table with:

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY,
  ghl_token TEXT NOT NULL,      -- GoHighLevel API token
  location_id TEXT NOT NULL,     -- GHL location ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Running the Backend

### Development (with Doppler)

```bash
# Install dependencies (from root)
npm install

# Run just the backend
npm run dev:backend

# Run both frontend + backend
npm run dev:both
```

### Standalone (without root dependencies)

```bash
cd agent-backend
npm install
doppler run -- node server.js
```

## 📡 API Endpoints

### Health Check

```bash
GET /
# Response: "agent-backend is running"

GET /health
# Response: "ok"
```

### Find or Create Contact

```bash
POST /tools/find_or_create_contact
Content-Type: application/json

{
  "client_id": "uuid-of-client-in-supabase",
  "phone": "+1234567890",      # optional
  "email": "user@example.com", # optional
  "name": "John Doe"           # optional
}

# Response:
{
  "contactId": "ghl-contact-id",
  "existed": true,              # false if newly created
  "contact": { ... }            # GHL contact object
}
```

## 🔄 Migration from Render

### What Changed

- ✅ Moved env vars from Render to Doppler
- ✅ Integrated into monorepo with shared dependencies
- ✅ Added `npm run dev:backend` script
- ✅ Supabase credentials now shared across all services

### Old Render Setup (deprecated)

```bash
# These were set in Render dashboard:
SUPABASE_URL=...
SUPABASE_KEY=...
PORT=3000
```

### New Doppler Setup

```bash
# One-time: Add secrets to Doppler
doppler secrets set SUPABASE_URL=https://fqptsjvfvhippzwsxdza.supabase.co
doppler secrets set SUPABASE_KEY=your_key
doppler secrets set PORT=3001  # if running alongside main app

# Run with Doppler
npm run dev:backend
```

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test contact creation (requires Supabase client setup)
curl -X POST http://localhost:3000/tools/find_or_create_contact \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-uuid",
    "phone": "+1234567890",
    "name": "Test Contact"
  }'
```

## 🔧 Troubleshooting

### "Missing SUPABASE_URL or SUPABASE_KEY"

```bash
# Verify secrets are in Doppler
doppler secrets get SUPABASE_URL --plain
doppler secrets get SUPABASE_KEY --plain

# Make sure you're running with doppler run
npm run dev:backend  # uses doppler run internally
```

### Port Conflict

If port 3000 is in use:

```bash
# Change PORT in Doppler
doppler secrets set PORT=3001

# Or run manually
doppler run -- PORT=3001 node agent-backend/server.js
```

## 📝 Next Steps

1. Ensure `clients` table exists in Supabase
2. Add GHL credentials for your clients to Supabase
3. Test the `/tools/find_or_create_contact` endpoint
4. Add additional tool endpoints as needed

## 🔗 Related Docs

- [Main Project README](../README.md)
- [Doppler Quick Start](../QUICKSTART.md)
- [Security Guide](../.github/SECURITY.md)
