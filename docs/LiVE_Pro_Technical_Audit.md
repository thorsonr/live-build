# LiVE Pro — Technical, Security & Compliance Audit

**Date:** February 7, 2026
**Version:** 1.0
**Application:** LiVE Pro (livepro.robertthorson.com)
**Author:** Generated via comprehensive codebase analysis

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [API Endpoints](#3-api-endpoints)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Security Implementation](#5-security-implementation)
6. [AI Integration & Prompts](#6-ai-integration--prompts)
7. [Data Flow & Privacy](#7-data-flow--privacy)
8. [Frontend Calculations](#8-frontend-calculations)
9. [Subscription Tiers & Billing](#9-subscription-tiers--billing)
10. [PII Handling & Data Retention](#10-pii-handling--data-retention)
11. [Compliance Considerations](#11-compliance-considerations)
12. [Known Gaps & Recommendations](#12-known-gaps--recommendations)

---

## 1. Architecture Overview

### Technology Stack

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | React 18 + Vite | SPA, hosted on Vercel |
| Styling | TailwindCSS + CSS Variables | Custom `live.*` prefix, dark/light theme |
| Backend | Node.js / Express | Hosted on Railway |
| Database | Supabase (Postgres) | Auth + RLS + Row-level policies |
| AI | Anthropic Claude API | Haiku & Sonnet models, BYOK support |
| Hosting | Vercel (frontend) + Railway (backend) | Auto-deploy from GitHub |

### Request Flow

```
User Browser → Vercel (static React SPA)
     ↓ API calls (HTTPS)
Railway (Express backend, port 3001)
     ↓ Authenticated queries
Supabase (Postgres + Auth)
     ↓ AI requests (when triggered)
Anthropic Claude API
```

### Environment Variables

**Backend (Railway):**
- `PORT` — Server port (3001)
- `NODE_ENV` — Environment (production)
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_KEY` — Supabase service role key (admin operations)
- `JWT_SECRET` — JWT signing secret
- `ENCRYPTION_KEY` — 32-byte hex key for AES-256-GCM encryption of BYOK API keys
- `CLAUDE_API_KEY` — Platform's Anthropic API key
- `FRONTEND_URL` — Allowed CORS origin

**Frontend (Vercel):**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key
- `VITE_API_URL` — Backend API base URL

---

## 2. Database Schema

### Tables (11 total)

#### 2.1 users
Primary user table, extended from Supabase Auth.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | Supabase Auth ID |
| email | TEXT, UNIQUE | User email |
| name | TEXT | Display name |
| first_name | TEXT | First name (collected at signup) |
| last_name | TEXT | Last name (collected at signup) |
| storage_mode | TEXT | 'cloud' or 'local' |
| api_key_encrypted | TEXT | BYOK API key, AES-256-GCM encrypted |
| subscription_status | TEXT | 'trial', 'active', 'max', 'suspended' |
| stripe_customer_id | TEXT | Future billing integration |
| stripe_subscription_id | TEXT | Future billing integration |
| trial_ends_at | TIMESTAMPTZ | Default: NOW() + 5 days |
| is_admin | BOOLEAN | Admin flag |
| analysis_limit_override | INT | Admin override for analysis quota |
| chat_limit_override | INT | Admin override for chat quota |
| forced_model | TEXT | Admin-forced AI model |
| preferred_model | TEXT | BYOK user's preferred Claude model |
| created_at, updated_at | TIMESTAMPTZ | Timestamps |

**RLS Policies:** users_select_own, users_update_own, users_insert_own (all `auth.uid() = id`)

#### 2.2 connections
LinkedIn connection data imported by user.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, FK→users, CASCADE | |
| name | TEXT | Contact full name |
| first_name | TEXT | |
| last_name | TEXT | |
| position | TEXT | Job title |
| company | TEXT | Company name |
| linkedin_url | TEXT | LinkedIn profile URL |
| email_encrypted | TEXT | Column exists but NOT currently populated |
| connected_on | DATE | Connection date |
| message_count | INT | Messages exchanged |
| last_contact | DATE | Last message date |
| rel_strength | TEXT | 'strong', 'warm', 'cold', 'new' |
| is_dormant | BOOLEAN | 12+ months without contact |
| endorsement_count | INT | Endorsements from this contact |
| categories | JSONB | Custom category matches |

**RLS:** `auth.uid() = user_id` for all operations.
**Indexes:** user_id, company, rel_strength, is_dormant

#### 2.3 ai_insights
Cached AI analysis results.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, FK→users, CASCADE | |
| insight_type | TEXT | 'full_analysis', 'outreach_draft', 'network_strategy', 'analytics_cache' |
| connection_id | UUID, FK→connections, nullable | |
| content | TEXT | JSON-stringified AI response |
| prompt_used | TEXT | For debugging |
| metadata | JSONB | Tone, template info |
| tokens_used | INT | |
| created_at | TIMESTAMPTZ | |

**RLS:** `auth.uid() = user_id`

#### 2.4 engagement_tracker
Mini-CRM for contact engagement pipeline (Max/BYOK tiers only).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, FK→auth.users, CASCADE | |
| contact_name | TEXT | |
| contact_company | TEXT | |
| contact_position | TEXT | |
| contact_email | TEXT | Stored plaintext |
| contact_phone | TEXT | Stored plaintext |
| status | TEXT | 'identified', 'contacted', 'replied', 'meeting', 'closed', 'parked' |
| notes | TEXT | Free-text notes |
| engagement_log | JSONB | Array of {date, type} entries |
| last_action_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**Engagement log types:** Email, Call, Text, In-Person, LinkedIn, Other
**RLS:** `auth.uid() = user_id`

#### 2.5 usage_quotas
Monthly usage tracking per user.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, FK→users, CASCADE | |
| month_year | TEXT | "YYYY-MM" format |
| analysis_calls_used / _limit | INT | Full analysis + outreach draft + strategy |
| chat_calls_used / _limit | INT | AI chat messages |
| outreach_calls_used / _limit | INT | Custom outreach messages |
| ai_calls_used / _limit | INT | Legacy backward compat |
| exports_used | INT | |

**UNIQUE:** (user_id, month_year)
**RLS:** `auth.uid() = user_id`

#### 2.6 usage_logs
Token-level billing audit trail.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, FK→users, CASCADE | |
| feature | TEXT | 'full_analysis', 'ai_chat', 'outreach_message', etc. |
| tokens_in | INT | Input tokens |
| tokens_out | INT | Output tokens |
| model | TEXT | Claude model used |
| cost | DECIMAL(10,6) | Calculated cost in USD |
| created_at | TIMESTAMPTZ | |

**RLS:** `auth.uid() = user_id`

#### 2.7 network_analysis
Aggregated network statistics (one row per user).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, UNIQUE | |
| total_connections | INT | |
| category_counts | JSONB | {"Recruiters": 45, "Executives": 120} |
| company_counts | JSONB | Top companies |
| strength_breakdown | JSONB | {"strong": 10, "warm": 50, "cold": 100, "new": 20} |
| dormant_count | INT | |
| years_building | INT | |
| engagement_rate | DECIMAL(5,2) | |
| analyzed_at | TIMESTAMPTZ | |

**RLS:** `auth.uid() = user_id`

#### 2.8 analysis_archives
Historical analysis snapshots.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, FK→users, CASCADE | |
| connection_count | INT | |
| ai_analysis | JSONB | Full AI response |
| analytics_summary | JSONB | Aggregated metrics |
| archived_at | TIMESTAMPTZ | |

**RLS:** SELECT/DELETE only, `auth.uid() = user_id`

#### 2.9 invite_codes
Beta access gating.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| code | TEXT, UNIQUE | Format: PREFIX-UUID8CHARS |
| created_by | UUID, FK→users | Admin who generated |
| redeemed_by | UUID, FK→users | User who redeemed |
| redeemed_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | Default: NOW() + 30 days |
| max_uses | INT | Default: 1 |
| use_count | INT | Default: 0 |
| bonus_analyses | INT | Extra analyses granted |
| metadata | JSONB | |

**RLS:** No user-facing policies (service role only)

#### 2.10 custom_categories
User-defined contact segmentation keywords.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID, PK | |
| user_id | UUID, FK→users, CASCADE | |
| name | TEXT | Category name |
| keywords | TEXT[] | Array of matching keywords |
| color | TEXT | Display color |
| sort_order | INT | |

**RLS:** `auth.uid() = user_id`

#### 2.11 platform_config
Admin-controlled platform settings.

| Column | Type | Notes |
|--------|------|-------|
| key | TEXT, PK | 'ai_model', 'max_connections', 'max_shares', 'max_tokens' |
| value | JSONB | Config value |
| updated_at | TIMESTAMPTZ | |
| updated_by | UUID, FK→users | |

**RLS:** No user-facing policies (service role only)

### Stored Procedures

**redeem_invite_code(p_code TEXT, p_user_id UUID)**
- SECURITY DEFINER function
- Atomic: validates code → increments use_count → applies bonus_analyses
- Uses `FOR UPDATE` row-level locks to prevent race conditions
- Returns success/failure status

---

## 3. API Endpoints

### 3.1 Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | Create account with invite code |
| POST | `/api/auth/login` | No | Sign in with email/password |
| POST | `/api/auth/logout` | Yes | Sign out |
| GET | `/api/auth/me` | Yes | Get current user profile |
| POST | `/api/auth/reset-password` | No | Send password reset email |

**POST /api/auth/signup**
- Accepts: `{email, password, invite_code, first_name, last_name}`
- Validates: email required, password (10+ chars, upper, lower, number), invite code (valid, not expired, not fully redeemed)
- Creates user in Supabase Auth, upserts to `users` table
- Redeems invite code atomically via `redeem_invite_code()` RPC
- Returns: `{user, session}`

**POST /api/auth/login**
- Accepts: `{email, password}`
- Uses Supabase Auth `signInWithPassword()`
- Rate limited: 20 attempts per 15 minutes
- Returns: `{user, session}`

### 3.2 AI Features (`/api/ai`)

All endpoints require authentication. Rate limited: 10 requests per minute.

| Method | Endpoint | Quota Type | Description |
|--------|----------|-----------|-------------|
| POST | `/api/ai/analyze` | analysis | Full 8-screen network analysis (180s timeout) |
| POST | `/api/ai/outreach-draft` | analysis | Single reconnection message |
| POST | `/api/ai/strategy` | analysis | Strategic network recommendations |
| POST | `/api/ai/chat` | chat | Conversational AI advisor |
| POST | `/api/ai/outreach-messages` | outreach | Generate 2 message variants |
| GET | `/api/ai/insights` | none | Retrieve cached analysis results |

**POST /api/ai/analyze**
- Accepts: `{rawData: {connections[], messages[], skills[], ...}, userContext}`
- Validates: rawData with non-empty connections required
- Looks up user's name from DB, filters from message index
- Calls `generateFullAnalysis()` via Claude API
- Caches result in `ai_insights` table
- Returns: `{analysis: {screens: {summary, network, relationships, skills_expertise, your_content, your_advocates, priorities, linkedins_view}}}`

**POST /api/ai/chat**
- Accepts: `{messages: [{role, content}], networkContext}`
- Validates: messages non-empty, content < 10,000 chars, role is "user" or "assistant"
- Only last 10 messages sent to API
- Always uses Haiku model
- Returns: `{reply: string}`

**POST /api/ai/outreach-messages**
- Accepts: `{contact, userContext, tone, length, senderName}`
- Tone: Professional, Casual, Friendly, Direct
- Length: Short (~50 words), Medium (~100 words), Long (~200 words)
- Returns: `{messages: {variant_a: {subject, body}, variant_b: {subject, body}}}`

### 3.3 Data Management (`/api/data`)

All endpoints require authentication.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/data/import` | Yes | Import connections (batch insert) |
| GET | `/api/data/connections` | Yes | List connections (paginated, searchable) |
| GET | `/api/data/stats` | Yes | Get network analysis summary |
| POST | `/api/data/archive` | Yes | Snapshot current data to archives |
| GET | `/api/data/archives` | Yes | List historical archives |
| DELETE | `/api/data/all` | Yes | Permanently delete all user data |
| POST | `/api/data/analytics-cache` | Yes | Cache supplementary analytics |
| GET | `/api/data/analytics-cache` | Yes | Retrieve cached analytics |

**Engagement Tracker** (requires `requireTracker` middleware — Max/BYOK only):

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data/tracker` | List all tracker entries |
| POST | `/api/data/tracker` | Add contact to tracker |
| PATCH | `/api/data/tracker/:id` | Update status, notes, engagement log, email, phone |
| DELETE | `/api/data/tracker/:id` | Remove entry |

**DELETE /api/data/all** permanently deletes from:
- ai_insights, connections, network_analysis, usage_quotas, custom_categories, engagement_tracker, analysis_archives

### 3.4 Settings (`/api/settings`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | Yes | Get user settings + tier config |
| GET | `/api/settings/quota` | Yes | Get current month's usage quota |
| PATCH | `/api/settings` | Yes | Update profile, storage mode, API key, model preference |

**GET /api/settings returns:**
```json
{
  "storage_mode": "cloud",
  "subscription_status": "active",
  "tier": "active",
  "chat_enabled": true,
  "show_byok": true,
  "show_outreach": true,
  "show_tracker": false,
  "analysis_limit": 4,
  "chat_limit": 25,
  "show_chat_counter": false,
  "trial_expired": false,
  "has_api_key": false,
  "is_admin": false
}
```

**PATCH /api/settings accepts:**
- `first_name`, `last_name` — trimmed, max 100 chars
- `storage_mode` — must be 'cloud' or 'local'
- `api_key` — encrypted with AES-256-GCM before storage; `null` to remove
- `preferred_model` — must be in whitelist

### 3.5 Admin (`/api/admin`)

All endpoints require `requireAdmin` middleware (JWT + is_admin flag).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List users (searchable) |
| PATCH | `/api/admin/users/:id` | Update user tier, admin status, quotas |
| GET | `/api/admin/analytics` | Platform analytics (user counts, AI calls) |
| POST | `/api/admin/invite-codes` | Generate invite codes |
| GET | `/api/admin/invite-codes` | List invite codes |
| GET | `/api/admin/ai-usage` | Token usage logs with costs |
| GET | `/api/admin/ai-config` | Get platform AI configuration |
| PUT | `/api/admin/ai-config` | Update platform AI configuration |

---

## 4. Authentication & Authorization

### Authentication Flow

1. **Signup**: User provides email, password, invite code, first/last name
   - Backend validates invite code against `invite_codes` table
   - Supabase Auth creates user (handles password hashing with bcrypt)
   - Backend upserts user profile in `users` table
   - Invite code redeemed atomically (prevents race conditions)
   - 5-day trial period begins

2. **Login**: Supabase Auth `signInWithPassword()`
   - Returns JWT access token
   - Frontend stores session via Supabase client (secure cookies)

3. **Request Authentication**:
   - Frontend: `supabase.auth.getSession()` → access_token
   - Sent as: `Authorization: Bearer <token>`
   - Backend: `supabase.auth.getUser(token)` verifies JWT signature
   - Invalid/expired tokens → 401 Unauthorized

### Authorization Layers

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Route-level | `requireAuth` middleware | All authenticated endpoints |
| Admin-level | `requireAdmin` middleware | Admin panel endpoints |
| Feature-level | `requireTracker` middleware | Engagement tracker (Max/BYOK) |
| Data-level | Supabase RLS policies | `auth.uid() = user_id` on all tables |
| Quota-level | `checkAndIncrementUsage()` | Per-feature monthly limits |

### Password Policy
- Minimum 10 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- Enforced on both frontend and backend

---

## 5. Security Implementation

### 5.1 Network Security

**CORS:**
- Whitelist-based: Only `FRONTEND_URL` environment variable is allowed
- Credentials enabled
- Not using wildcard (`*`)

**Helmet.js:**
- Automatic secure HTTP headers
- X-Frame-Options (clickjacking protection)
- Content-Security-Policy
- X-Content-Type-Options (MIME sniffing protection)

**Rate Limiting:**
- Auth endpoints: 20 requests per 15-minute window
- AI endpoints: 10 requests per 1-minute window
- Returns proper `RateLimit-*` headers

**Body Size:**
- JSON parsing capped at 10MB
- Prevents DoS via large payloads

### 5.2 Encryption

**BYOK API Key Encryption:**
- Algorithm: AES-256-GCM (authenticated encryption)
- Key derivation: `crypto.scryptSync(ENCRYPTION_KEY, salt, 32)`
- Salt: `'live-pro-key-derivation'`
- Storage format: `iv:authTag:ciphertext` (all hex-encoded)
- IV: 12 bytes, randomly generated per encryption
- AuthTag: 16 bytes, detects tampering
- Decrypted only at request time (never stored in plaintext in memory)

**Transport:**
- All connections over HTTPS (TLS)
- Vercel and Railway provide automatic SSL certificates

### 5.3 Row-Level Security (RLS)

All user-facing tables have RLS enabled with `auth.uid() = user_id` policies:
- users, connections, ai_insights, usage_logs, usage_quotas, network_analysis, custom_categories, engagement_tracker, analysis_archives

Admin-only tables (no user-facing policies):
- invite_codes, platform_config

### 5.4 Input Validation & Sanitization

- **Search inputs**: Special characters stripped: `[,.()"\\%_]` (prevents PostgREST injection)
- **String lengths**: first_name/last_name capped at 100 chars, chat messages at 10,000 chars
- **Enum validation**: status values, model names, config keys validated against whitelists
- **Invite codes**: trimmed before database queries

### 5.5 Admin Protection

- Admin cannot remove their own admin status
- Admin operations require both JWT verification AND `is_admin` database check
- All admin updates are to specific allowed fields only

---

## 6. AI Integration & Prompts

### 6.1 AI Functions

| Function | Purpose | Model | Max Tokens |
|----------|---------|-------|------------|
| `generateFullAnalysis()` | 8-screen network intelligence report | Tier-dependent | 8192-16384 |
| `generateOutreachDraft()` | Single reconnection message | Always Haiku | 1024 |
| `generateNetworkStrategy()` | Strategic network analysis + 30-day plan | Tier-dependent | 2048 |
| `generateOutreachMessages()` | 2 personalized message variants | Always Haiku | 2048 |
| `generateChatResponse()` | Conversational AI advisor | Always Haiku | 2048 |

### 6.2 Model Selection by Tier

| Feature | Trial | Pro | Max | BYOK |
|---------|-------|-----|-----|------|
| Full Analysis | Haiku | Sonnet | Sonnet | User's choice |
| Outreach Draft | Haiku | Haiku | Haiku | Haiku |
| Network Strategy | Haiku | Sonnet | Sonnet | User's choice |
| AI Chat | Haiku | Haiku | Haiku | Haiku |
| Outreach Messages | Haiku | Haiku | Haiku | Haiku |

**Available models:**
- `claude-haiku-4-5-20251001` (fast, cost-effective)
- `claude-sonnet-4-20250514` (balanced)
- `claude-sonnet-4-5-20250929` (most capable)

**Fallback:** If selected model returns 404, retries with Haiku.

### 6.3 Full Analysis Prompt

The main analysis prompt (~380 lines) is stored in `docs/LiVE_Pro_AI_Ingestion_Prompt.md`.

**Tone directive:** "Encouraging strategic advisor, not critical auditor. Write like a trusted career strategist who genuinely wants them to succeed."

**Formatting rule:** All text output must be plain text only. No markdown formatting.

**8 screens requested:**

1. **Summary**: Executive overview (headline, body, key_insight), 3-5 do_next_items with target_tab navigation, 3 top_opportunities (real contacts)
2. **Network**: network_shape_insight — concentration risk, sector gaps, executive/recruiter ratio
3. **Relationships**: opportunity_insight — dormant network as unrealized potential, specific reachable opportunities
4. **Skills & Expertise**: expertise_insight — perception gap between listed skills vs. endorsed skills
5. **Your Content**: content_themes (6 themes with counts) + content_strategy_insight — activity level, theme focus, recency
6. **Your Advocates**: advocate_insight — recommendation themes, advocate seniority, company diversity
7. **Priorities** (fully AI-generated): Top 10 outreach contacts ranked by strategic value (40%), relationship warmth (30%), endorsement signal (15%), recency (15%). Plus 5-6 revival playbooks with personalized messages.
8. **LinkedIn's View** (fully AI-generated): Absurd inferences, concerning mismatches, reality check insight

**Critical rules in prompt:**
- Never fabricate data
- Use real people's names (user's private data)
- User's own name removed from message index before AI sees it
- Seniority parsing rules: C-suite, VP, Director, Manager, IC
- Engagement classification: Strong (messaged < 6mo), Warm (messaged > 6mo), Cold (never)
- Screen 9 (All Contacts) computed locally, not requested from AI

### 6.4 Chat System Prompt

```
You are LiVE Pro AI, a professional networking advisor. You have access to
the user's LinkedIn network data and help them make strategic networking decisions.

GUIDELINES:
- Be concise and actionable (2-4 paragraphs max)
- Reference specific contacts, companies, or data points from their network
- Focus on practical networking advice
- If asked about contacts not in their data, say so honestly
- Be warm and encouraging but direct
```

Network context (total connections, strength breakdown, top companies, categories, sample contacts) is prepended to each chat request.

### 6.5 Outreach Message Prompt

Requests 2 variants for a single contact:
- **Variant A**: Direct, to-the-point
- **Variant B**: Warm, conversational

Rules enforced in prompt:
- LinkedIn-appropriate tone
- Reference specific contact details
- Clear call-to-action
- No "I hope this finds you well"
- Sign with sender name if provided
- Match requested tone (Professional/Casual/Friendly/Direct) and length (Short/Medium/Long)
- Output as JSON only

### 6.6 Token Usage & Cost Tracking

| Model | Input Cost (per 1M tokens) | Output Cost (per 1M tokens) |
|-------|---------------------------|----------------------------|
| Haiku 4.5 | $0.80 | $4.00 |
| Sonnet 4.0 | $3.00 | $15.00 |
| Sonnet 4.5 | $3.00 | $15.00 |

All AI calls logged to `usage_logs` with: user_id, feature, tokens_in, tokens_out, model, cost, timestamp.

---

## 7. Data Flow & Privacy

### 7.1 LinkedIn Data Processing Pipeline

```
1. User uploads LinkedIn ZIP file
        ↓
2. extractLinkedInZip() — browser-side only, in-memory
   Extracts: connections, messages, skills, endorsements,
   recommendations, shares, inferences, ad_targeting
        ↓
3. analyzeLinkedInData() — browser-side computation
   Enriches contacts with: message counts, relationship strength,
   dormancy status, endorsement data, custom categories
        ↓
4. prepareDataForAPI() — FILTERS applied before sending to backend
   REMOVED: LinkedIn URLs, email addresses, full message bodies,
            position history, invitations
   CAPPED:  Connections at 1500, shares at 100
   KEPT:    Message index (name→{count, lastDate}), skills,
            endorsements, recommendations, share metadata, inferences
        ↓
5. POST /api/ai/analyze — Backend
   Additional filter: user's own name removed from message index
        ↓
6. Claude API — receives sanitized data summary only
        ↓
7. Response cached in ai_insights table
        ↓
8. Connections synced to cloud via POST /api/data/import
   Supplementary analytics cached via POST /api/data/analytics-cache
```

### 7.2 What IS Sent to Claude API

- Connection names, titles, companies, connected dates (pipe-delimited for token efficiency)
- Message index: name → {count, lastDate} (NOT message content)
- Skills and endorsement counts
- Recommendation text
- Post titles/commentary (for content analysis)
- LinkedIn's inferences about user (seniority, interests)
- User-provided context (goals, situation)
- Message tone/length preferences (for outreach generation)
- Sender name (if user provides it)

### 7.3 What is NOT Sent to Claude API

- Email addresses
- LinkedIn profile URLs
- Full message content/bodies
- Position history
- Invitation records
- User's own name (removed from message index)
- User's API key (decrypted locally, used only to instantiate client)

### 7.4 Data Storage Locations

**Server-side (Supabase):**
- User profiles & auth metadata
- Connection data (stripped of emails/URLs)
- AI analyses (cached responses)
- Analytics summaries
- Usage quotas & logs
- Engagement tracker entries
- Analysis archives

**Client-side (browser memory only, NOT persisted):**
- Raw LinkedIn ZIP content
- Enriched contact list (before cloud sync)
- Chat messages (session-only)
- Computed local analytics

**localStorage (minimal):**
- `live_theme` — dark/light mode preference only
- `live_contacts` — legacy, cleared on archive

### 7.5 Safety Valves

- Connections capped at 1500 for AI analysis
- Shares capped at 100 for AI analysis
- Chat messages truncated to last 10 for API calls
- Chat message content max 10,000 characters
- JSON body size limit 10MB

---

## 8. Frontend Calculations

All statistics, charts, and category breakdowns are computed locally in the browser. The AI provides editorial insights only (screens 1-6) or fully generated content (screens 7-8).

### 8.1 Relationship Strength Calculation

```javascript
function calcRelStrength(messageCount, connectedDate) {
  if (messageCount >= 3) return 'strong'
  if (messageCount >= 1) return 'warm'
  if (connectedDate > 6_months_ago) return 'new'
  return 'cold'
}
```

### 8.2 Dormancy Detection

```javascript
function checkDormancy(lastContact, connectedOn) {
  // Dormant = 12+ months since last contact
  return (now - lastContact) / (1000 * 60 * 60 * 24 * 30) > 12
}
```

### 8.3 Key Computed Metrics

| Metric | Formula | Display |
|--------|---------|---------|
| Engagement Rate | `(messaged / totalConnections * 100).toFixed(1)` | Summary, Relationships |
| Never Messaged % | `(neverMessaged / totalConnections * 100).toFixed(0)` | Summary |
| Top Concentration | `(topCompany.count / totalConnections * 100).toFixed(0)` | Network |
| Posts Per Month | `(totalPosts / monthsSinceFirst).toFixed(1)` | Content |
| Days Since Last Post | `Math.floor((now - lastPost) / (1000*60*60*24))` | Content |
| Activity Level | `>= 2/mo: 'active', >= 0.5/mo: 'moderate', else 'light'` | Content |

### 8.4 Charts (all computed client-side)

- **Category Distribution** (Doughnut) — categoryCounts + "Other"
- **Connection Timeline** (Bar) — connectionsByYear
- **Top Companies** (Horizontal Bar) — top 10 companies
- **Relationship Strength** (Doughnut) — strong/warm/cold counts
- **Dormancy Analysis** (Progress bars) — dormant/total ratios
- **Most Endorsed Skills** (Horizontal Bar) — topEndorsedSkills
- **Posting Timeline** (Bar) — postsByMonth (last 12 months)
- **Content Themes** (Progress bars) — theme percentages

### 8.5 Priority Contact Scoring (local fallback)

```javascript
score = 0
score += (30 - categoryIndex * 5)  // per category match
score += 15                         // if dormant AND has message history
score += 10                         // if has endorsements
// Sorted descending, top 10
```

---

## 9. Subscription Tiers & Billing

### 9.1 Tier Configuration

| Feature | Trial | Pro (active) | Max | BYOK |
|---------|-------|-------------|-----|------|
| Analysis limit/month | 1 | 4 | 4 | Unlimited |
| Chat messages/month | 2 | 25 | Unlimited | Unlimited |
| Outreach messages/month | 2 | 10 | Unlimited | Unlimited |
| AI Model (analysis) | Haiku | Sonnet | Sonnet | User's choice |
| Engagement Tracker | No | No | Yes | Yes |
| BYOK option | No | Yes | Yes | Yes |
| Trial duration | 5 days | N/A | N/A | N/A |
| Chat counter shown | Yes | No | No | No |

### 9.2 Tier Determination Logic

1. If `is_admin` → max tier with all overrides
2. If `api_key_encrypted` exists → byok tier
3. If `subscription_status === 'max'` → max tier
4. If `subscription_status === 'active'` → active tier
5. Else → trial tier

### 9.3 Quota Enforcement

- Monthly reset based on `YYYY-MM` key
- Optimistic locking prevents race conditions on concurrent requests
- Trial expiry: hard block on all AI features after `trial_ends_at`
- Feature → counter mapping:
  - `full_analysis`, `outreach_draft`, `network_strategy` → `analysis_calls_used`
  - `ai_chat` → `chat_calls_used`
  - `outreach_message` → `outreach_calls_used`

### 9.4 BYOK (Bring Your Own Key)

- User provides Claude API key in Settings
- Encrypted with AES-256-GCM, stored as `users.api_key_encrypted`
- Decrypted at request time only
- User pays Anthropic directly for API usage
- Platform logs usage for analytics but incurs no AI cost
- User can choose preferred model from whitelist
- Can delete key at any time (clears encrypted value and model preference)

### 9.5 Billing Status

- Stripe integration columns exist (`stripe_customer_id`, `stripe_subscription_id`) but are not yet implemented
- Current billing: invite-code gated beta, no payment processing
- Admin can manually set tiers via admin panel

---

## 10. PII Handling & Data Retention

### 10.1 PII Inventory

| Data | Location | Encrypted | Source |
|------|----------|-----------|--------|
| User email | users.email | No (Supabase Auth) | Signup |
| User first/last name | users table | No | Signup / Settings |
| User password | Supabase Auth | Yes (bcrypt) | Signup |
| BYOK API key | users.api_key_encrypted | Yes (AES-256-GCM) | Settings |
| Contact names | connections table | No | LinkedIn export |
| Contact companies | connections table | No | LinkedIn export |
| Contact positions | connections table | No | LinkedIn export |
| Contact LinkedIn URLs | connections.linkedin_url | No | LinkedIn export |
| Tracker contact email | engagement_tracker.contact_email | No (plaintext) | Manual entry |
| Tracker contact phone | engagement_tracker.contact_phone | No (plaintext) | Manual entry |

**NOT stored server-side:**
- LinkedIn connection email addresses (stripped before import)
- Full message bodies (only count + last date stored)
- Position history
- Invitation records

### 10.2 Data Retention

| Data | Retention | User Control |
|------|-----------|-------------|
| User account | Until deleted by admin | N/A (no self-delete yet) |
| Connections | Until user archives or deletes | Archive & Reset, Delete All |
| AI analyses | Until user deletes | Delete All |
| Analytics cache | Until user deletes | Delete All |
| Archives | Until user deletes | Delete All |
| Usage logs | Indefinite | No user control |
| Engagement tracker | Until user deletes entries or Delete All | Per-entry delete, Delete All |

### 10.3 Data Deletion Capabilities

**Archive & Reset** (`POST /api/data/archive`):
- Snapshots connections + AI analysis to archives
- Deletes active connections, ai_insights, network_analysis
- Engagement tracker NOT deleted
- Clears localStorage

**Delete All** (`DELETE /api/data/all`):
- Permanently deletes: ai_insights, connections, network_analysis, usage_quotas, custom_categories, engagement_tracker, analysis_archives
- Irreversible

**Individual Tracker Entry** (`DELETE /api/data/tracker/:id`):
- Removes single engagement tracker entry

---

## 11. Compliance Considerations

### 11.1 GDPR Relevance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Lawful basis for processing | Needs documentation | Consent at signup, legitimate interest for analytics |
| Right to access | Partial | User can view all their data in dashboard |
| Right to rectification | Partial | User can edit profile, re-upload data |
| Right to erasure | Partial | "Delete All" removes most data; usage_logs retained |
| Right to data portability | Not implemented | No export-to-file feature |
| Data minimization | Good | Only necessary LinkedIn data stored; emails/URLs stripped |
| Storage limitation | Partial | No automatic purge; user must manually delete |
| Data processing agreements | Needed | Anthropic (Claude API), Supabase, Vercel, Railway |

### 11.2 CCPA Relevance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Right to know | Partial | User sees their data; no formal disclosure mechanism |
| Right to delete | Partial | Delete All available; usage_logs retained |
| Right to opt-out of sale | N/A | No data is sold |
| Non-discrimination | Yes | All users treated equally per tier |

### 11.3 Third-Party Data Processors

| Service | Data Shared | Purpose | Location |
|---------|------------|---------|----------|
| Supabase | User accounts, all stored data | Database, authentication | US (AWS) |
| Anthropic (Claude) | Sanitized network summaries, user context | AI analysis & generation | US |
| Vercel | Static frontend assets only | Frontend hosting | Global CDN |
| Railway | Backend app + env vars | Backend hosting | US |

### 11.4 Cookie & Tracking

- **Cookies**: Supabase Auth session cookies only (functional, not tracking)
- **Analytics**: No third-party analytics (no Google Analytics, no tracking pixels)
- **Advertising**: No ad tracking or retargeting

---

## 12. Known Gaps & Recommendations

### High Priority

| Issue | Risk | Recommendation |
|-------|------|----------------|
| Tracker contact email/phone stored plaintext | PII exposure if database breached | Encrypt with same AES-256-GCM as API keys |
| No account deletion workflow | GDPR Article 17 compliance gap | Add self-service account deletion endpoint |
| Usage logs retained indefinitely | Data minimization principle | Add retention policy (e.g., 12 months) |
| No formal privacy policy page | Legal requirement for public site | Create and link privacy policy |
| No terms of service page | Legal requirement | Create and link ToS |
| No cookie consent banner | ePrivacy compliance | Add if serving EU users (even if only functional cookies) |

### Medium Priority

| Issue | Risk | Recommendation |
|-------|------|----------------|
| ENCRYPTION_KEY rotation not supported | Key compromise requires migration | Implement key versioning |
| No data export feature | GDPR portability gap | Add CSV/JSON export of user data |
| No email verification check on login | Unverified accounts can operate | Enforce email verification before dashboard access |
| Error messages may leak implementation details | Information disclosure | Audit all error responses in production |
| No WAF (Web Application Firewall) | DDoS, bot protection | Add Cloudflare or similar in front of Railway |
| Admin actions not audit-logged | No accountability trail | Log admin operations (tier changes, overrides) |

### Low Priority

| Issue | Risk | Recommendation |
|-------|------|----------------|
| `email_encrypted` column exists but unused | Misleading schema | Either populate or remove column |
| Invite code brute-force | 8-char UUID space | Monitor signup attempts; consider longer codes |
| No session invalidation on security events | Stale sessions | Add explicit logout on password change |
| Timezone handling for quota | Edge case billing disputes | Document UTC-based quota periods |
| LinkedIn connection URLs stored in DB | Unnecessary PII | Stop importing linkedin_url to connections table |

### Security Strengths

- AES-256-GCM encryption for sensitive credentials
- Row-Level Security on all user-facing tables
- Rate limiting on auth and AI endpoints
- Helmet.js for secure HTTP headers
- CORS whitelist (not wildcard)
- Password policy (10+ chars, mixed case, number)
- Atomic invite code redemption (prevents race conditions)
- PII stripping before AI processing (emails, URLs, message bodies)
- No third-party analytics or tracking
- Supabase Auth handles password hashing (bcrypt)

---

*End of audit document.*
