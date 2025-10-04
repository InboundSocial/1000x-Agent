# Voice Quality Enhancement - Implementation Guide

This document outlines the technical steps to achieve natural, human-like voice quality comparable to premium providers like Air.ai.

---

## Overview

Current voice implementation uses basic ElevenLabs configuration. This guide details enhancements for professional-grade conversational AI voice quality.

---

## Phase 1: Voice Provider Evaluation (1-2 weeks)

### Goal
Test and compare voice providers to find optimal quality/cost/latency balance.

### Providers to Test

#### 1. ElevenLabs (Current Provider - Optimization Path)
**Test Configuration:**
```javascript
voice: {
  provider: "11labs",
  voiceId: "NDTYOmYEjbDIVCKB35i3",
  model: "eleven_turbo_v2_5",  // NEW: Latest conversational model
  stability: 0.5,                // NEW: 0.3-0.7 for natural conversation
  similarity_boost: 0.85,        // NEW: Voice clone accuracy
  style: 0.6,                    // NEW: Expressiveness
  use_speaker_boost: true        // NEW: Clarity enhancement
}
```

**Testing Steps:**
1. Update VAPI assistant config with advanced settings
2. Record 5 test calls with different stability values (0.3, 0.4, 0.5, 0.6, 0.7)
3. Document voice quality, emotional range, and artifact presence
4. Test latency impact of each setting

#### 2. PlayHT (Conversational AI Specialist)
**Why Test:** Purpose-built for conversational AI with emotion control

**Test Configuration:**
```javascript
voice: {
  provider: "playht",
  voiceId: "play_voice_id_here",
  model: "PlayHT2.0-turbo",
  temperature: 0.5,              // Randomness/creativity
  quality: "premium",
  speed: 1.0
}
```

**Testing Steps:**
1. Create PlayHT account and API key
2. Clone voice or select from library
3. Run A/B comparison calls with ElevenLabs
4. Measure: naturalness, latency, emotional range, cost per minute

#### 3. Cartesia (Ultra-Low Latency)
**Why Test:** Sub-200ms latency for real-time conversations

**Test Configuration:**
```javascript
voice: {
  provider: "cartesia",
  voiceId: "cartesia_voice_id",
  model: "sonic-english",
  emotion: ["positivity:high", "curiosity:medium"]
}
```

**Testing Steps:**
1. Test interruption handling (critical for natural flow)
2. Measure time-to-first-audio
3. Test emotion control during appointment booking flow

#### 4. Deepgram Aura (Phone Optimized)
**Why Test:** Specifically designed for phone conversations

**Test Configuration:**
```javascript
voice: {
  provider: "deepgram",
  voiceId: "aura-asteria-en",  // Professional female
  // or "aura-arcas-en" for male
}
```

**Testing Steps:**
1. Test over actual phone lines (VAPI integration)
2. Compare clarity vs competitors
3. Document how it handles phone-specific audio compression

### Evaluation Criteria

Create scoring matrix (1-10 scale):

| Provider | Naturalness | Latency | Emotional Range | Clarity | Cost/min | Interruption Handling | Overall |
|----------|-------------|---------|-----------------|---------|----------|----------------------|---------|
| ElevenLabs | | | | | | | |
| PlayHT | | | | | | | |
| Cartesia | | | | | | | |
| Deepgram | | | | | | | |

---

## Phase 2: Advanced Voice Configuration (1 week)

### 2.1 Database Schema Updates

Add voice configuration to client settings:

```sql
ALTER TABLE clients ADD COLUMN voice_config JSONB DEFAULT '{
  "provider": "11labs",
  "voice_id": "NDTYOmYEjbDIVCKB35i3",
  "model": "eleven_turbo_v2_5",
  "stability": 0.5,
  "similarity_boost": 0.85,
  "style": 0.6,
  "use_speaker_boost": true,
  "background_sound": "office",
  "background_sound_volume": 0.1
}'::jsonb;
```

### 2.2 Dynamic Assistant Builder Updates

**File:** `agent-backend/server.js`

**Current voice config:**
```javascript
voice: {
  provider: "11labs",
  voiceId: "NDTYOmYEjbDIVCKB35i3"
}
```

**Enhanced voice config:**
```javascript
// Extract voice settings from client DB record
const voiceConfig = client.voice_config || {};

// Build advanced voice configuration
const assistantConfig = {
  // ... existing config
  voice: {
    provider: voiceConfig.provider || "11labs",
    voiceId: voiceConfig.voice_id || "NDTYOmYEjbDIVCKB35i3",
    ...(voiceConfig.provider === "11labs" && {
      model: voiceConfig.model || "eleven_turbo_v2_5",
      stability: voiceConfig.stability ?? 0.5,
      similarity_boost: voiceConfig.similarity_boost ?? 0.85,
      style: voiceConfig.style ?? 0.6,
      use_speaker_boost: voiceConfig.use_speaker_boost ?? true
    }),
    ...(voiceConfig.provider === "playht" && {
      model: voiceConfig.model || "PlayHT2.0-turbo",
      temperature: voiceConfig.temperature ?? 0.5,
      quality: voiceConfig.quality || "premium"
    })
    // Add other providers as needed
  },
  // Add background sound if configured
  ...(voiceConfig.background_sound && {
    backgroundSound: voiceConfig.background_sound,
    backgroundSoundVolume: voiceConfig.background_sound_volume ?? 0.1
  })
};
```

### 2.3 Admin Interface for Voice Tuning

Create endpoint to update voice settings per client:

```javascript
// PUT /clients/:id/voice-config
app.put("/clients/:id/voice-config", async (req, res) => {
  const { id } = req.params;
  const voiceConfig = req.body;
  
  // Validate configuration
  const allowedProviders = ["11labs", "playht", "cartesia", "deepgram"];
  if (!allowedProviders.includes(voiceConfig.provider)) {
    return res.status(400).json({ error: "Invalid provider" });
  }
  
  // Update in Supabase
  const { data, error } = await supabase
    .from("clients")
    .update({ voice_config: voiceConfig })
    .eq("id", id)
    .select()
    .single();
    
  if (error) return res.status(400).json({ error: error.message });
  
  // Clear cache for this client
  clientCache.delete(data.twilio_number);
  
  return res.json({ success: true, voice_config: data.voice_config });
});
```

---

## Phase 3: Conversational Naturalness (1-2 weeks)

### 3.1 Natural Speech Patterns in System Prompt

**File:** `agent-backend/server.js` (system prompt section)

**Add to prompt:**
```
CONVERSATIONAL STYLE GUIDELINES:
- Speak naturally with occasional brief pauses: "Let me... check that for you"
- Use thinking indicators when processing: "Hmm, let's see...", "One moment..."
- Show engagement: "Oh, great!", "Perfect!", "I understand"
- Vary your pacing - speak slightly faster when confirming simple info, slower when explaining complex details
- Use natural transitions: "So", "Now", "Alright", "Great"
- Avoid robotic repetition - vary your phrasing

AVOID:
- Saying "I'm checking the system" (just do it naturally)
- Repeating exact phrases
- Monotone responses
- Over-explaining every action
```

### 3.2 Emotion-Based Response Variation

Create response templates with variations:

```javascript
const responseTemplates = {
  greeting: [
    "Thank you for calling {business_name}! How can I help you today?",
    "Hi! You've reached {business_name}. What can I do for you?",
    "{business_name}, how may I help you?"
  ],
  booking_confirmed: [
    "Perfect! I've got you scheduled for {time} on {date}.",
    "Great! You're all set for {time} on {date}.",
    "Wonderful! I've booked you in for {time} on {date}."
  ],
  thinking: [
    "Let me check that...",
    "One moment...",
    "Let's see...",
    "Hmm, checking now..."
  ]
};

// Randomly select from variations to avoid repetitive responses
function getResponse(category, context = {}) {
  const templates = responseTemplates[category];
  const selected = templates[Math.floor(Math.random() * templates.length)];
  return selected.replace(/{(\w+)}/g, (_, key) => context[key] || '');
}
```

### 3.3 Dynamic Pacing Instructions

Add to assistant model config:

```javascript
model: {
  provider: "openai",
  model: "gpt-4",
  messages: [{
    role: "system",
    content: `${basePrompt}

PACING & TONE:
- When GREETING: Warm, upbeat, moderate pace
- When COLLECTING INFO: Patient, clear, slightly slower
- When CONFIRMING: Confident, slightly faster
- When EXPLAINING: Clear, measured pace
- When HANDLING ERROR: Calm, reassuring, slower
- When CLOSING: Friendly, warm, moderate pace

Show personality through natural variations in energy and emphasis.`
  }]
}
```

---

## Phase 4: Audio Environment & Quality (3-5 days)

### 4.1 Background Ambience

VAPI supports subtle background sounds that make the AI feel more "real":

```javascript
// In assistant config
{
  backgroundSound: "office",  // Options: "office", "cafe", "off"
  backgroundSoundVolume: 0.1  // 0.0 to 1.0 (keep subtle)
}
```

**Test different environments:**
- `"office"` - Subtle keyboard/office ambience
- `"cafe"` - Light background chatter (may not be professional)
- `"off"` - Pure silence (can feel unnatural)

### 4.2 Noise Suppression

Configure in VAPI dashboard or via API:

```javascript
{
  transcriber: {
    provider: "deepgram",
    model: "nova-2-phonecall",  // Phone-optimized
    language: "en-US",
    keywords: ["appointment", "booking", ...],  // Improve accuracy
    endpointing: 200,  // ms silence before considering speech ended
    smart_format: true  // Better formatting
  },
  audioConfig: {
    inputAudioEncoding: "linear16",
    sampleRateHertz: 16000,  // Phone quality
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
}
```

### 4.3 Silence & Pause Handling

Configure natural pause detection:

```javascript
{
  silenceTimeoutSeconds: 30,  // How long to wait in silence before ending
  responseDelaySeconds: 0.4,  // Brief pause before AI responds (natural)
  interruptionHandling: {
    enabled: true,
    threshold: 50  // Lower = more sensitive to interruptions
  }
}
```

---

## Phase 5: Testing & Optimization (Ongoing)

### 5.1 Voice Quality Test Suite

Create automated test script:

```javascript
// scripts/test-voice-quality.js
const testScenarios = [
  {
    name: "Simple Booking",
    script: [
      "I'd like to book an appointment",
      "Mike Smith",
      "mike@example.com",
      "Tomorrow at 2pm works"
    ],
    measureLatency: true,
    measureEmotionalRange: true
  },
  {
    name: "Complex Rescheduling",
    script: [
      "I need to reschedule my appointment",
      // ... complex back-and-forth
    ]
  },
  {
    name: "Interruption Handling",
    script: [
      "I want to— actually, wait, let me— no, I'd like to book"
    ],
    measureInterruptionQuality: true
  }
];

// Run tests and collect metrics
async function runVoiceQualityTests() {
  for (const scenario of testScenarios) {
    // Make VAPI test call
    // Record audio
    // Measure latency, naturalness, emotion
    // Generate report
  }
}
```

### 5.2 Customer Feedback Loop

Add post-call survey:

```javascript
// After call ends, send SMS survey
async function sendPostCallSurvey(callId, customerPhone) {
  await sendSMS(customerPhone, 
    `Thanks for calling! How would you rate the call quality? Reply 1-5 (5=excellent)`
  );
  
  // Store feedback linked to:
  // - Voice provider used
  // - Voice configuration
  // - Call duration
  // - Complexity score
}
```

### 5.3 A/B Testing Framework

```javascript
// Randomly assign callers to different voice configs
const voiceConfigs = {
  control: { stability: 0.5, style: 0.6 },
  test_a: { stability: 0.4, style: 0.7 },
  test_b: { stability: 0.6, style: 0.5 }
};

function getVoiceConfigForTest(callId) {
  // Consistent assignment based on call ID
  const hash = simpleHash(callId);
  const variant = hash % 3;
  return Object.values(voiceConfigs)[variant];
}

// Track metrics per variant
// After statistically significant sample, choose winner
```

---

## Success Metrics

### Voice Quality KPIs

1. **Latency**
   - Time to first audio: < 500ms
   - Response delay: 300-500ms (natural pause)
   - End-to-end turn time: < 2s

2. **Customer Satisfaction**
   - Voice quality rating: > 4.5/5
   - "Sounded human" score: > 90%
   - Interruption handling satisfaction: > 85%

3. **Business Metrics**
   - Call completion rate: > 95%
   - Customer hang-up rate: < 3%
   - Repeat caller rate: Increase by 20%

4. **Technical Metrics**
   - Audio artifacts per call: < 1
   - Failed audio generations: < 0.1%
   - Voice consistency score: > 95%

---

## Cost Analysis

### Per-Minute Pricing Estimates (as of Oct 2024)

| Provider | Cost/min | Quality Tier | Latency | Best For |
|----------|----------|--------------|---------|----------|
| ElevenLabs Turbo | $0.30 | High | ~800ms | General use |
| PlayHT 2.0 | $0.25 | High | ~1000ms | Emotion control |
| Cartesia | $0.15 | Medium-High | ~200ms | Real-time |
| Deepgram Aura | $0.10 | Medium | ~600ms | Phone calls |

**Optimization Strategy:**
- Use premium voice (ElevenLabs/PlayHT) for first-time callers
- Switch to cost-effective option (Deepgram) for repeat callers
- Monitor quality complaints and adjust accordingly

---

## Implementation Timeline

| Phase | Duration | Dependencies | Output |
|-------|----------|--------------|--------|
| 1. Provider Evaluation | 1-2 weeks | VAPI accounts, test budget | Provider comparison report |
| 2. Advanced Config | 1 week | Phase 1 complete | Updated DB schema & API |
| 3. Conversational Naturalness | 1-2 weeks | None | Enhanced prompts & logic |
| 4. Audio Environment | 3-5 days | VAPI features | Production-ready audio config |
| 5. Testing & Optimization | Ongoing | All phases | Quality benchmarks |

**Total Initial Implementation:** 4-6 weeks

**Ongoing Optimization:** Continuous A/B testing and refinement

---

## Next Steps

1. ✅ Document current voice quality issues and baseline metrics
2. ⏳ Set up test accounts with all voice providers
3. ⏳ Create voice quality evaluation rubric
4. ⏳ Record baseline test calls with current configuration
5. ⏳ Begin Phase 1: Provider evaluation

---

## References

- [ElevenLabs Voice Settings Guide](https://elevenlabs.io/docs/speech-synthesis/voice-settings)
- [PlayHT Conversational AI](https://docs.play.ht/)
- [Cartesia Sonic Docs](https://docs.cartesia.ai/)
- [Deepgram Aura Documentation](https://developers.deepgram.com/docs/tts-models)
- [VAPI Voice Configuration](https://docs.vapi.ai/assistants/voice)
