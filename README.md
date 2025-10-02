# 1000x Agent

AI agent backend with GoHighLevel integration, Supabase credential management, and Doppler secrets. Provides tool endpoints for VAPI assistants to create contacts, book appointments, and send messages.

## 🚀 Quick Start

```bash
# 1. Clone and open in container
git clone https://github.com/InboundSocial/1000x-Agent.git
cd 1000x-Agent
code .  # Opens in VS Code - choose "Reopen in Container"

# 2. Login to Doppler (one-time per machine)
./scripts/doppler-login.sh

# 3. Install and run
npm install
npm run dev:backend
```

**First time setup?** See [SETUP.md](./SETUP.md) for detailed instructions.

---

## 📦 What's Included

- **Express Backend** (`/agent-backend/`) - REST API for VAPI tool integrations
- **Supabase Integration** - Client credential storage
- **GoHighLevel API** - CRM contact management
- **Doppler Secrets** - Secure environment variable management
- **Dev Container** - Pre-configured Node 22 environment with all CLIs

---

## 🔧 Available Commands

```bash
# Backend (agent-backend)
npm run dev:backend          # Start backend API on port 3000

# Development
npm install                  # Install dependencies

# Doppler
./scripts/doppler-login.sh   # Login to Doppler (interactive)
doppler secrets              # View all secrets
doppler secrets set KEY=val  # Update a secret
```

---

## 🔌 API Endpoints

### Health Check

```bash
GET /health
GET /
```

### Find or Create Contact

```bash
POST /tools/find_or_create_contact
Content-Type: application/json

{
  "client_id": "uuid-from-supabase",
  "email": "contact@example.com",    # required
  "phone": "+1234567890",            # optional
  "name": "Contact Name"             # optional
}
```

**Response:**

```json
{
  "contactId": "ghl-contact-id",
  "existed": true,
  "contact": {
    /* GHL contact object */
  }
}
```

---

## 🔐 Required Secrets (Doppler)

These must be set in your Doppler `1000x-agent/dev` config:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-key
PORT=3000
NODE_ENV=development
```

**Update secrets:**

```bash
doppler secrets set SUPABASE_KEY=your_new_key
```

---

## 📊 Supabase Database Setup

Create the `clients` table to store GoHighLevel credentials:

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_token TEXT NOT NULL,
  location_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert your client
INSERT INTO clients (ghl_token, location_id)
VALUES ('your-ghl-api-token', 'your-location-id');
```

---

## 🧪 Testing

```bash
# Health check
curl http://localhost:3000/health

# Create contact (replace client_id with yours from Supabase)
curl -X POST http://localhost:3000/tools/find_or_create_contact \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-client-uuid",
    "email": "test@example.com",
    "name": "Test Contact"
  }'
```

---

## 📁 Project Structure

```
1000x-Agent/
├── agent-backend/          # Express API backend
│   ├── server.js          # Main server
│   └── README.md          # Backend-specific docs
├── scripts/
│   └── doppler-login.sh   # Doppler authentication helper
├── src/
│   └── index.js           # Optional frontend/main app
├── SETUP.md               # Detailed setup instructions
└── README.md              # This file
```

---

## 🔄 Switching Machines

When moving from Mac to PC (or vice versa):

1. `git push` from current machine
2. `git pull` on new machine
3. Open in VS Code → "Reopen in Container"
4. Run `./scripts/doppler-login.sh` (first time only)
5. `npm run dev:backend`

Your secrets stay in Doppler - no tokens to copy! ✨

---

## 🆘 Troubleshooting

### "Invalid Auth token"

```bash
./scripts/doppler-login.sh  # Re-authenticate
```

### Port already in use

```bash
# Kill existing process
pkill -f "node agent-backend/server.js"

# Or run on different port
doppler run -- PORT=3001 node agent-backend/server.js
```

### Missing secrets

```bash
doppler secrets              # List all
doppler secrets set KEY=val  # Add missing ones
```

---

## 📚 Documentation

- **[SETUP.md](./SETUP.md)** - Complete setup guide with Doppler, Supabase, and troubleshooting
- **[agent-backend/README.md](./agent-backend/README.md)** - Backend API details
- **[.github/SECURITY.md](./.github/SECURITY.md)** - Security and secrets management

---

## 🌟 VAPI Integration Example

Configure your VAPI assistant to call the backend:

```json
{
  "type": "function",
  "function": {
    "name": "find_or_create_contact",
    "description": "Find or create a contact in CRM",
    "parameters": {
      "type": "object",
      "properties": {
        "client_id": { "type": "string" },
        "email": { "type": "string" },
        "phone": { "type": "string" },
        "name": { "type": "string" }
      },
      "required": ["client_id", "email"]
    }
  },
  "server": {
    "url": "https://your-backend-url.com/tools/find_or_create_contact",
    "method": "POST"
  }
}
```

---

## 📄 License

ISC

---

**Need help?** Check [SETUP.md](./SETUP.md) for detailed instructions or open an issue.
