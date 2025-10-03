import express from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const app = express();
app.use(express.json());

// ----- Supabase connection (from Doppler secrets) -----
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY environment variables.");
  console.error(
    "Make sure to run with: doppler run -- node agent-backend/server.js"
  );
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ----- In-memory cache for client lookups -----
const clientCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCachedClient(phoneNumber) {
  const cached = clientCache.get(phoneNumber);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedClient(phoneNumber, clientData) {
  clientCache.set(phoneNumber, {
    data: clientData,
    timestamp: Date.now()
  });
}

// ----- Authentication Middleware -----
function verifyBearerToken(req, res, next) {
  const expectedToken = process.env.VAPI_WEBHOOK_TOKEN;
  
  // Skip auth if token not configured (for local dev)
  if (!expectedToken) {
    console.warn("[Auth] VAPI_WEBHOOK_TOKEN not set - skipping authentication");
    return next();
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  
  // Constant-time comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedToken);
  const actualBuffer = Buffer.from(token);
  
  if (expectedBuffer.length !== actualBuffer.length) {
    return res.status(401).json({ error: "Invalid token" });
  }
  
  if (!crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return res.status(401).json({ error: "Invalid token" });
  }
  
  next();
}

// ----- Basic routes -----
app.get("/", (_req, res) => res.send("agent-backend is running"));
app.get("/health", (_req, res) => res.send("ok"));

// ----- MCP Proxy: Dynamic GHL routing based on phone number -----
// expects x-phone-number header from VAPI
app.post("/mcp", async (req, res) => {
  try {
    const phoneNumber = req.headers["x-phone-number"];
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        error: "x-phone-number header required" 
      });
    }

    // Look up client credentials by phone number
    const { data: client, error: dbErr } = await supabase
      .from("clients")
      .select("ghl_token, location_id")
      .eq("twilio_number", phoneNumber)
      .single();

    if (dbErr || !client) {
      return res.status(404).json({ 
        error: "Client not found for phone number" 
      });
    }

    const { ghl_token, location_id } = client;
    if (!ghl_token || !location_id) {
      return res.status(400).json({ 
        error: "Missing ghl_token or location_id for this client" 
      });
    }

    // Forward MCP request to GHL with correct credentials
    const ghlMcpUrl = "https://services.leadconnectorhq.com/mcp/";
    const ghlResponse = await fetch(ghlMcpUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ghl_token}`,
        "locationId": location_id,
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
      },
      body: JSON.stringify(req.body)
    });

    // Check if response is SSE or JSON
    const contentType = ghlResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('text/event-stream')) {
      // Stream SSE response back to client
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      // Convert Web ReadableStream to Node stream
      const reader = ghlResponse.body.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
        res.end();
      } catch (streamErr) {
        console.error('Stream error:', streamErr);
        res.end();
      }
    } else {
      // Handle JSON response
      const responseData = await ghlResponse.json();
      res.status(ghlResponse.status).json(responseData);
    }
    
  } catch (e) {
    console.error("MCP proxy error:", e);
    return res.status(500).json({ 
      error: "mcp_proxy_error", 
      details: String(e) 
    });
  }
});

// ----- Tool: find_or_create_contact -----
// expects JSON body: { client_id, phone?, email?, name? }
app.post("/tools/find_or_create_contact", async (req, res) => {
  try {
    const { client_id, phone, email, name } = req.body;

    if (!client_id || (!phone && !email)) {
      return res
        .status(400)
        .json({ error: "client_id and phone or email are required" });
    }

    // 1) Pull GHL creds for this client from Supabase
    const { data: client, error: dbErr } = await supabase
      .from("clients")
      .select("ghl_token, location_id")
      .eq("id", client_id)
      .single();

    if (dbErr) return res.status(400).json({ error: dbErr.message });
    const { ghl_token, location_id } = client || {};
    if (!ghl_token || !location_id) {
      return res
        .status(400)
        .json({ error: "Missing ghl_token or location_id for this client." });
    }

    const GHL_BASE = "https://services.leadconnectorhq.com";

    // Common headers
    const authHeaders = {
      Authorization: `Bearer ${ghl_token}`,
      Version: "2021-07-28",
    };

    // 2) Try a GET lookup first (locationId as QUERY PARAM — per docs)
    const searchUrl = new URL(`${GHL_BASE}/contacts/`);
    searchUrl.searchParams.set("locationId", location_id);
    if (phone) searchUrl.searchParams.set("phone", phone);
    else if (email) searchUrl.searchParams.set("email", email);

    let foundResp = await fetch(searchUrl.toString(), { headers: authHeaders });

    if (foundResp.ok) {
      const found = await foundResp.json();
      if (Array.isArray(found?.contacts) && found.contacts.length > 0) {
        const contact = found.contacts[0];
        return res.json({ contactId: contact.id, existed: true, contact });
      }
      // not found → proceed to create
    } else {
      // if lookup blocked or fails, we'll proceed to create
    }

    // 3) Create contact (locationId in body + LocationId header)
    const createHeaders = {
      ...authHeaders,
      "Content-Type": "application/json",
      LocationId: location_id,
    };

    const contactData = { locationId: location_id };
    if (phone) contactData.phone = phone;
    if (email) contactData.email = email;
    if (name) contactData.name = name;

    const createResp = await fetch(`${GHL_BASE}/contacts/`, {
      method: "POST",
      headers: createHeaders,
      body: JSON.stringify(contactData),
    });

    const createTxt = await createResp.text();
    let created;
    try {
      created = JSON.parse(createTxt);
    } catch {
      created = {};
    }

    // Handle duplicate error (400) and return existing ID
    if (createResp.status === 400 && created?.meta?.contactId) {
      return res.json({
        contactId: created.meta.contactId,
        existed: true,
        duplicate: true,
        contact: null,
      });
    }

    if (!createResp.ok) {
      return res.status(400).json({ error: `GHL create failed: ${createTxt}` });
    }

    // New contact created
    return res.json({
      contactId: created?.contact?.id,
      existed: false,
      contact: created?.contact,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "server_error", details: String(e) });
  }
});

// ----- Tool: check_availability -----
// expects JSON body: { client_id, start_date, end_date }
app.post("/tools/check_availability", async (req, res) => {
  try {
    const { client_id, start_date, end_date } = req.body;

    if (!client_id || !start_date || !end_date) {
      return res.status(400).json({ 
        error: "client_id, start_date, and end_date are required" 
      });
    }

    // Get client credentials
    const { data: client, error: dbErr } = await supabase
      .from("clients")
      .select("ghl_token, location_id, calendar_id")
      .eq("id", client_id)
      .single();

    if (dbErr || !client) {
      return res.status(400).json({ error: "Client not found" });
    }

    const { ghl_token, location_id, calendar_id } = client;
    if (!ghl_token || !calendar_id) {
      return res.status(400).json({ 
        error: "Missing credentials for this client" 
      });
    }

    const GHL_BASE = "https://services.leadconnectorhq.com";

    // Get available slots
    const url = new URL(`${GHL_BASE}/calendars/${calendar_id}/free-slots`);
    url.searchParams.set("startDate", new Date(start_date).getTime().toString());
    url.searchParams.set("endDate", new Date(end_date).getTime().toString());

    const slotsResp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ghl_token}`,
        Version: "2021-07-28"
      }
    });

    const responseText = await slotsResp.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!slotsResp.ok) {
      return res.status(slotsResp.status).json({ 
        error: "Failed to check availability", 
        details: result 
      });
    }

    return res.json({ 
      success: true, 
      slots: result 
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ 
      error: "server_error", 
      details: String(e) 
    });
  }
});

// ----- Tool: book_appointment -----
// expects JSON body: { client_id, contact_id, start_time, end_time, title?, notes? }
app.post("/tools/book_appointment", async (req, res) => {
  try {
    const { client_id, contact_id, start_time, end_time, title, notes } = req.body;

    if (!client_id || !contact_id || !start_time || !end_time) {
      return res.status(400).json({ 
        error: "client_id, contact_id, start_time, and end_time are required" 
      });
    }

    // Get client credentials
    const { data: client, error: dbErr } = await supabase
      .from("clients")
      .select("ghl_token, location_id, calendar_id")
      .eq("id", client_id)
      .single();

    if (dbErr || !client) {
      return res.status(400).json({ error: "Client not found" });
    }

    const { ghl_token, location_id, calendar_id } = client;
    if (!ghl_token || !location_id || !calendar_id) {
      return res.status(400).json({ 
        error: "Missing credentials for this client" 
      });
    }

    const GHL_BASE = "https://services.leadconnectorhq.com";

    // Create appointment
    const appointmentData = {
      calendarId: calendar_id,
      locationId: location_id,
      contactId: contact_id,
      startTime: start_time,
      endTime: end_time,
      title: title || "Appointment",
      appointmentStatus: "confirmed"
    };

    if (notes) appointmentData.notes = notes;

    const createResp = await fetch(`${GHL_BASE}/calendars/events/appointments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ghl_token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(appointmentData)
    });

    const responseText = await createResp.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    if (!createResp.ok) {
      return res.status(createResp.status).json({ 
        error: "Failed to book appointment", 
        details: result 
      });
    }

    return res.json({ 
      success: true, 
      appointment: result 
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ 
      error: "server_error", 
      details: String(e) 
    });
  }
});

// ----- VAPI Webhooks -----
// POST /vapi/webhooks - Handle VAPI call lifecycle events
app.post("/vapi/webhooks", verifyBearerToken, async (req, res) => {
  try {
    const event = req.body;
    const eventType = event.type || event.message?.type;

    console.log(`[VAPI Webhook] Received event: ${eventType}`);

    // Handle assistant-request synchronously (VAPI needs immediate response)
    if (eventType === "assistant-request") {
      const assistantConfig = await handleAssistantRequest(event);
      console.log('[Assistant Request] Sending config to VAPI:', JSON.stringify({ assistant: assistantConfig }, null, 2));
      return res.status(200).json({ assistant: assistantConfig });
    }

    // Quick acknowledgment for other events
    res.status(200).json({ received: true });

    // Process other events asynchronously
    switch (eventType) {
      case "call.started":
        await handleCallStarted(event);
        break;
      
      case "call.ended":
      case "end-of-call-report":
        await handleCallEnded(event);
        break;
      
      case "status-update":
        await handleStatusUpdate(event);
        break;
      
      default:
        console.log(`[VAPI Webhook] Unhandled event type: ${eventType}`);
    }

  } catch (e) {
    console.error("[VAPI Webhook] Error:", e);
    // Only return error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: String(e) });
    }
  }
});

// Handle assistant-request - Return dynamic assistant config
async function handleAssistantRequest(event) {
  try {
    // VAPI sends event wrapped in a message object
    const message = event.message || event;
    const phoneNumberCalled = message.phoneNumber?.number;
    const customerNumber = message.customer?.number;

    console.log(`[Assistant Request] Number called: ${phoneNumberCalled}, From: ${customerNumber}`);

    // Check cache first
    let client = getCachedClient(phoneNumberCalled);
    
    if (!client) {
      // Cache miss - look up client by VAPI number
      const { data: dbClient, error: dbErr } = await supabase
        .from("clients")
        .select("*")
        .eq("twilio_number", phoneNumberCalled)
        .single();
      
      if (dbErr || !dbClient) {
        console.error(`[Assistant Request] No client found for: ${phoneNumberCalled}`);
        // Return generic assistant
        return {
          name: "1000x Agent",
          firstMessage: "Hello! How can I help you today?",
          model: {
            provider: "openai",
            model: "gpt-4o",
            messages: [{
              role: "system",
              content: "You are a helpful AI assistant."
            }]
          },
          voice: {
            provider: "11labs",
            voiceId: "paula"
          }
        };
      }
      
      client = dbClient;
      setCachedClient(phoneNumberCalled, client);
      console.log(`[Assistant Request] Cache miss - loaded from DB`);
    } else {
      console.log(`[Assistant Request] Cache hit for ${phoneNumberCalled}`);
    }

    // Build personalized assistant config
    // Note: Only include fields supported in assistant-request response
    const assistantConfig = {
      firstMessage: `Thank you for calling ${client.client_name}! How can I help you today?`,
      model: {
        provider: "openai",
        model: "gpt-4",
        messages: [{
          role: "system",
          content: `You are an AI receptionist for ${client.client_name}. 
          
Your responsibilities:
- Answer questions about services
- Book appointments by checking availability and creating bookings
- Be friendly, professional, and helpful
- Keep responses concise and natural

Business Details:
- Name: ${client.client_name}
- Timezone: ${client.timezone}

When booking appointments:
1. Ask for their name and phone number
2. Ask what service they need
3. Check availability using the check_availability tool
4. Offer available time slots
5. Confirm the booking using book_appointment tool
6. Confirm details back to the customer

Always be polite and end with "Is there anything else I can help you with?"`
        }]
      },
      voice: {
        provider: "11labs",
        voiceId: "rzF2ITnIG6HbQ1aRdhAv"
      }
    };

    console.log(`[Assistant Request] Returning config for: ${client.client_name}`);
    return assistantConfig;

  } catch (e) {
    console.error("[Assistant Request] Error:", e);
    throw e;
  }
}

// Handle call started - create voice session and contact
async function handleCallStarted(event) {
  try {
    const call = event.call || event.message?.call || {};
    const callId = call.id;
    const customerNumber = call.customer?.number || call.phoneNumber;
    const vapiNumber = call.phoneNumber || call.to;
    
    console.log(`[Call Started] ID: ${callId}, Customer: ${customerNumber}`);

    // Look up client by VAPI number
    const { data: client, error: dbErr } = await supabase
      .from("clients")
      .select("*")
      .eq("twilio_number", vapiNumber)
      .single();

    if (dbErr || !client) {
      console.error(`[Call Started] No client found for VAPI number: ${vapiNumber}`);
      return;
    }

    // Create or update voice session
    const { data: session, error: sessionErr } = await supabase
      .from("voice_sessions")
      .upsert({
        id: callId,
        client_id: client.id,
        caller: customerNumber,
        called_number: vapiNumber,
        started_at: new Date().toISOString(),
        context: { 
          vapi_call_id: callId,
          status: "in_progress" 
        }
      }, { onConflict: "id" })
      .select()
      .single();

    if (sessionErr) {
      console.error("[Call Started] Error creating session:", sessionErr);
      return;
    }

    // Create or find contact in GHL
    const GHL_BASE = "https://services.leadconnectorhq.com";
    const authHeaders = {
      Authorization: `Bearer ${client.ghl_token}`,
      Version: "2021-07-28",
    };

    // Try to find existing contact
    const searchUrl = new URL(`${GHL_BASE}/contacts/`);
    searchUrl.searchParams.set("locationId", client.location_id);
    searchUrl.searchParams.set("phone", customerNumber);

    let contactId = null;
    const foundResp = await fetch(searchUrl.toString(), { headers: authHeaders });
    
    if (foundResp.ok) {
      const found = await foundResp.json();
      if (found?.contacts?.length > 0) {
        contactId = found.contacts[0].id;
      }
    }

    // Create contact if not found
    if (!contactId) {
      const createResp = await fetch(`${GHL_BASE}/contacts/`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
          LocationId: client.location_id,
        },
        body: JSON.stringify({
          locationId: client.location_id,
          phone: customerNumber,
        }),
      });

      if (createResp.ok) {
        const created = await createResp.json();
        contactId = created?.contact?.id;
      }
    }

    // Update session with contact ID
    if (contactId) {
      await supabase
        .from("voice_sessions")
        .update({ 
          context: { 
            ...session.context, 
            ghl_contact_id: contactId 
          } 
        })
        .eq("id", callId);
    }

    console.log(`[Call Started] Session created: ${callId}, Contact: ${contactId}`);

  } catch (e) {
    console.error("[Call Started] Error:", e);
  }
}

// Handle call ended - sync to GHL
async function handleCallEnded(event) {
  try {
    const call = event.call || event.message?.call || {};
    const callId = call.id;
    const endedReason = call.endedReason || event.endedReason;
    const transcript = event.transcript || call.transcript;
    const summary = event.summary || call.summary;
    const recordingUrl = event.recordingUrl || call.recordingUrl;
    const duration = call.duration || event.duration;

    console.log(`[Call Ended] ID: ${callId}, Reason: ${endedReason}`);

    // Get session from database
    const { data: session, error: sessionErr } = await supabase
      .from("voice_sessions")
      .select("*, clients(*)")
      .eq("id", callId)
      .single();

    if (sessionErr || !session) {
      console.error(`[Call Ended] Session not found: ${callId}`);
      return;
    }

    // Update voice session with call outcomes
    await supabase
      .from("voice_sessions")
      .update({
        ended_at: new Date().toISOString(),
        recording_url: recordingUrl,
        context: {
          ...session.context,
          status: "completed",
          ended_reason: endedReason,
          duration: duration,
          transcript: transcript,
          summary: summary
        }
      })
      .eq("id", callId);

    // Sync to GHL - Add call note
    const client = session.clients;
    const contactId = session.context?.ghl_contact_id;

    if (client && contactId) {
      const GHL_BASE = "https://services.leadconnectorhq.com";
      const authHeaders = {
        Authorization: `Bearer ${client.ghl_token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json"
      };

      // Create note with call summary
      const noteBody = `
📞 AI Call Summary
Duration: ${duration || 'N/A'}
Ended: ${endedReason || 'N/A'}

${summary || 'No summary available'}

${recordingUrl ? `🎙️ Recording: ${recordingUrl}` : ''}
      `.trim();

      await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          body: noteBody,
          userId: client.location_id // Or specific user ID
        })
      });

      console.log(`[Call Ended] Synced to GHL contact: ${contactId}`);
    }

  } catch (e) {
    console.error("[Call Ended] Error:", e);
  }
}

// Handle status updates during call
async function handleStatusUpdate(event) {
  try {
    const call = event.call || event.message?.call || {};
    const callId = call.id;
    const status = event.status || call.status;

    if (!callId) {
      console.log("[Status Update] No call ID in event, skipping");
      return;
    }

    // Update session context with latest status
    const { data: session } = await supabase
      .from("voice_sessions")
      .select("context")
      .eq("id", callId)
      .single();

    if (session) {
      await supabase
        .from("voice_sessions")
        .update({
          context: {
            ...session.context,
            last_status: status,
            updated_at: new Date().toISOString()
          }
        })
        .eq("id", callId);
      console.log(`[Status Update] Updated session ${callId} with status: ${status}`);
    } else {
      console.log(`[Status Update] Session ${callId} not found (may not be created yet)`);
    }

  } catch (e) {
    console.error("[Status Update] Error:", e);
  }
}

// ----- Start server -----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`agent-backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
