# Agent Backend

Express API providing tool endpoints for VAPI assistants. Integrates with GoHighLevel CRM via Supabase-stored credentials.

---

## 🚀 Quick Start

```bash
# From project root
npm run dev:backend

# Test
curl http://localhost:3000/health
```

See [main SETUP.md](../SETUP.md) for complete installation.

---

## 📡 API Endpoints

### `GET /health`

Health check endpoint.

**Response:** `"ok"`

---

### `GET /`

Root endpoint.

**Response:** `"agent-backend is running"`

---

### `POST /tools/find_or_create_contact`

Find existing contact or create new one in GoHighLevel CRM.

**Request Body:**

```json
{
  "client_id": "uuid", // Required: Client UUID from Supabase
  "email": "user@example.com", // Required: Contact email
  "phone": "+15551234567", // Optional: Contact phone
  "name": "John Doe" // Optional: Contact name
}
```

**Success Response:**

```json
{
  "contactId": "ghl-id",
  "existed": false,
  "contact": {
    "id": "ghl-id",
    "email": "user@example.com",
    "locationId": "...",
    "type": "lead",
    ...
  }
}
```

**Error Response:**

```json
{
  "error": "Missing ghl_token or location_id for this client."
}
```

---

## 🔐 How It Works

1. **Receives request** with `client_id`
2. **Fetches credentials** from Supabase `clients` table:
   - `ghl_token` - GoHighLevel API token
   - `location_id` - GHL location ID
3. **Searches GHL** for existing contact by email/phone
4. **Creates contact** if not found
5. **Returns** contact ID and details

---

## 📊 Supabase Schema

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_token TEXT NOT NULL,      -- GoHighLevel API token
  location_id TEXT NOT NULL,     -- GHL location ID
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🛠️ Environment Variables

Loaded via Doppler:

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase service role key
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

---

## 🧪 Testing

```bash
# Get your client_id from Supabase
curl -X POST http://localhost:3000/tools/find_or_create_contact \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "your-uuid-here",
    "email": "test@example.com",
    "name": "Test Contact"
  }'
```

---

## 📝 Adding New Endpoints

Example: SMS sending

```javascript
app.post("/tools/send_sms", async (req, res) => {
  try {
    const { client_id, phone, message } = req.body;

    // Get client creds
    const { data: client } = await supabase
      .from("clients")
      .select("ghl_token")
      .eq("id", client_id)
      .single();

    // Call GHL API
    const response = await fetch(
      "https://services.leadconnectorhq.com/conversations/messages",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${client.ghl_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, message }),
      }
    );

    const data = await response.json();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

---

## 🔗 Resources

- [Main README](../README.md) - Project overview
- [SETUP.md](../SETUP.md) - Complete setup guide
- [GoHighLevel API Docs](https://highlevel.stoplight.io/)
- [Supabase Docs](https://supabase.com/docs)
