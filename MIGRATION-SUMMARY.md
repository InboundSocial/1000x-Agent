# Agent Backend Migration Summary

## ✅ What Was Done

### 1. **Imported agent-backend** into `/agent-backend/` folder
- ✅ Copied `server.js` and `package.json`
- ✅ Created comprehensive README with migration notes

### 2. **Merged Dependencies**
Added to root `package.json`:
- `express` ^4.19.2
- `@supabase/supabase-js` ^2.45.0
- `node-fetch` ^3.3.2

### 3. **Updated Scripts**
New npm scripts available:
```json
"dev:backend": "doppler run -- node agent-backend/server.js",
"dev:both": "doppler run -- node src/index.js & doppler run -- node agent-backend/server.js"
```

### 4. **Migrated from Render to Doppler**
- ✅ Updated comments in code (removed Render references)
- ✅ Added helpful error messages for missing env vars
- ✅ Updated `env.sample` with Supabase variables
- ✅ Improved startup logging

### 5. **Documentation**
- ✅ `agent-backend/README.md` - Complete backend docs
- ✅ Updated root `README.md` with new scripts
- ✅ `QUICKSTART.md` still applies for Doppler setup

---

## 🔐 Required Doppler Secrets

The agent-backend needs these secrets (already in Doppler):

```bash
SUPABASE_URL=https://fqptsjvfvhippzwsxdza.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PORT=3000  # or 3001 if running both apps
```

### To verify/add secrets:
```bash
# After doppler login
doppler secrets get SUPABASE_URL --plain
doppler secrets get SUPABASE_KEY --plain

# Add if missing:
doppler secrets set SUPABASE_URL=https://fqptsjvfvhippzwsxdza.supabase.co
doppler secrets set SUPABASE_KEY=your_key
```

---

## 🚀 How to Run

### Option 1: Run backend only
```bash
npm run dev:backend
# Runs on http://localhost:3000
```

### Option 2: Run both apps
```bash
npm run dev:both
# Main app: http://localhost:3000
# Backend: http://localhost:3000 (will conflict - see below)
```

### Option 3: Run on different ports
```bash
# Terminal 1 - Main app
npm run dev

# Terminal 2 - Backend on port 3001
doppler run -- PORT=3001 node agent-backend/server.js
```

---

## 🧪 Testing the Backend

### Health Check
```bash
curl http://localhost:3000/health
# Response: "ok"
```

### Find/Create Contact (requires Supabase setup)
```bash
curl -X POST http://localhost:3000/tools/find_or_create_contact \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-uuid-from-supabase",
    "phone": "+1234567890",
    "name": "Test Contact"
  }'
```

---

## 📊 Supabase Setup Required

The backend expects a `clients` table in Supabase:

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_token TEXT NOT NULL,      -- GoHighLevel API token
  location_id TEXT NOT NULL,     -- GHL location ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example insert:
INSERT INTO clients (id, ghl_token, location_id)
VALUES (
  'your-uuid-here',
  'ghl-api-token',
  'ghl-location-id'
);
```

---

## 🔄 What Changed from Render

| Aspect | Render (Old) | Doppler (New) |
|--------|-------------|---------------|
| **Secrets** | Set in Render dashboard | Set in Doppler |
| **Env Loading** | Automatic on Render | Via `doppler run --` |
| **Running** | `npm start` | `npm run dev:backend` |
| **Deployment** | Render auto-deploy | TBD (can use Render with Doppler) |

---

## 📁 Project Structure

```
1000x-Agent/
├── agent-backend/          # Imported backend
│   ├── server.js          # Express API
│   ├── package.json       # Backend deps (unused, merged to root)
│   └── README.md          # Backend docs
├── src/
│   └── index.js           # Main Fastify app
├── scripts/
│   ├── doppler-login.sh   # Easy Doppler auth
│   └── bootstrap-doppler.sh
├── package.json           # Merged dependencies
├── QUICKSTART.md          # Doppler setup guide
└── README.md              # Main docs
```

---

## ⚠️ Known Issues / TODOs

### Port Conflict
- Main app and backend both default to port 3000
- **Solution**: Run backend on different port or use nginx reverse proxy

### Deployment
- Render deployment config not yet updated for Doppler
- **Options**:
  1. Set `DOPPLER_TOKEN` in Render env vars
  2. Use Doppler CLI in Render build command
  3. Switch to a different platform (Railway, Fly.io, etc.)

### Database Schema
- `clients` table needs to be created in Supabase
- No migration scripts yet
- **Action**: Create table manually (SQL provided above)

---

## 📝 Next Steps

1. **Create Supabase table**:
   ```sql
   -- Run in Supabase SQL Editor
   CREATE TABLE clients (...);
   ```

2. **Verify Doppler secrets**:
   ```bash
   ./scripts/doppler-login.sh
   doppler secrets
   ```

3. **Test the backend**:
   ```bash
   npm run dev:backend
   curl http://localhost:3000/health
   ```

4. **Add test client to Supabase**:
   ```sql
   INSERT INTO clients (id, ghl_token, location_id)
   VALUES ('test-uuid', 'your-ghl-token', 'your-location-id');
   ```

5. **Test contact creation**:
   ```bash
   curl -X POST http://localhost:3000/tools/find_or_create_contact \
     -H "Content-Type: application/json" \
     -d '{"client_id":"test-uuid","phone":"+1234567890","name":"Test"}'
   ```

---

## 🔗 Resources

- [Main README](./README.md)
- [Backend README](./agent-backend/README.md)
- [Doppler Quick Start](./QUICKSTART.md)
- [Security Guide](./.github/SECURITY.md)
- [Supabase Docs](https://supabase.com/docs)
- [GoHighLevel API](https://highlevel.stoplight.io/)

