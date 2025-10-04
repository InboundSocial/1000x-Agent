# 1000x Agent: High-Level Task List

This task list is derived from the official [1000x Agent PRD](./1000x-Agent-PRD.md).

---

### **Product Management**

- [ ] Finalize selection of a unified platform for SMS/Email/Voice channels.
- [ ] Define the specific qualifying questions for lead intake.
- [ ] Create a template for the client-specific knowledge bases.
- [ ] Detail the logic for pipeline updates in GoHighLevel (e.g., when does a lead become an "Estimate Booked" opportunity?).
- [ ] Define the specific criteria for "failed interaction" tagging.

### **Design (UX/Conversational)**

- [ ] Write initial script templates for the agent's key conversational flows (greetings, error handling, handoff).
- [ ] Define the agent's core "personality" in a more detailed character brief.
- [ ] Design the content for confirmation and summary messages (SMS and Email).

### **Engineering - Backend**

- [x] **Setup:** Set up Supabase `clients` table schema.
- [x] **Integration:** Build integration layer for GoHighLevel API (authentication, calendar, contacts).
- [ ] **Integration:** Build integration layer for VAPI.
- [ ] **Integration (Investigation):** Implement and test a solution for receiving SMS and Email.
- [ ] **Core Feature:** Implement intent recognition logic.
- [ ] **Core Feature:** Implement information gathering and session management.
- [x] **Core Feature:** Develop the appointment booking and rescheduling logic against GHL.
- [ ] **Knowledge Base:** Set up Supabase pgvector and build the service to query it for Q&A.
- [ ] **Features:** Implement call recording, summarization, and note-taking features.
- [ ] **Deployment:** Set up initial deployment environment for alpha testing.

### **Voice Quality Enhancement (Future Phase)**

- [ ] **Voice Provider Evaluation:** Test and compare voice quality across providers
  - [ ] Test ElevenLabs Turbo v2.5 with advanced settings (stability, similarity_boost, style)
  - [ ] Evaluate PlayHT conversational models
  - [ ] Test Cartesia's real-time voice synthesis
  - [ ] Evaluate Deepgram Aura for phone conversations
  - [ ] Document quality, latency, and cost comparison

- [ ] **Advanced Voice Configuration:**
  - [ ] Add voice model settings to client configuration in Supabase
  - [ ] Implement voice parameter configuration in dynamic assistant builder
  - [ ] Configure stability (0.3-0.7 for conversational, higher for robotic)
  - [ ] Configure similarity_boost (0.7-0.9 for voice clone accuracy)
  - [ ] Add style parameter (0-1 for expressiveness)
  - [ ] Enable use_speaker_boost for clarity

- [ ] **Conversational Naturalness:**
  - [ ] Update system prompts to include natural speech patterns
  - [ ] Add conversational fillers ("um", "let me check", thinking pauses)
  - [ ] Implement emotion/tone variation based on conversation context
  - [ ] Configure dynamic pacing (faster when confident, slower when uncertain)
  - [ ] Add natural breathing pauses between sentences
  
- [ ] **Audio Quality & Environment:**
  - [ ] Configure background ambience for natural phone call feel
  - [ ] Implement noise suppression and audio gating
  - [ ] Test and optimize audio encoding settings
  - [ ] Add silence detection and natural pause handling
  
- [ ] **Testing & Optimization:**
  - [ ] Conduct A/B testing with different voice configurations
  - [ ] Gather customer feedback on voice quality
  - [ ] Create voice quality benchmarking tests
  - [ ] Document optimal settings per use case (appointment booking vs Q&A)
  - [ ] Establish voice quality monitoring and alerts
