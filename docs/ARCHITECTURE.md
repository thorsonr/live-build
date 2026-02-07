# LiVE Pro - Architecture & Implementation Guide

## Brand & UI Guidelines

### Logo
- **"Li"** in gold (#c9a227) + **"VE"** in white
- Font: 24px, weight 700
- Subtitle: "LinkedIn Visual Engine" (11px, 60% opacity)

### Color Palette (CSS Variables)
```css
--bg: #FAF9F7;           /* Page background */
--bg-warm: #F5F3EE;      /* Warm background */
--surface: #FFFFFF;       /* Cards */
--border: #E8E4DD;       /* Borders */
--text: #1a1a2e;         /* Primary text */
--text-secondary: #636e72;/* Secondary text */
--accent: #c9a227;       /* Gold accent */
--primary: #1a1a2e;      /* Primary/header bg */
--success: #2d8a6e;      /* Success/privacy */
--info: #667eea;         /* Info/links */
--danger: #c94a4a;       /* Danger/delete */
```

### Key UI Components
- **Header**: Dark (#1a1a2e) with gold "Li" + white "VE" logo
- **Cards**: White with subtle border, 12px border-radius
- **Contact Cards**: Show name (clickable to LinkedIn on hover), position, company, tags, meta info
- **LinkedIn Links**: Small 🔗 icon in card corner (subtle gray, blue on hover)
- **Storage Badge**: Blue badge "Data Saved Locally" (for IndexedDB users)
- **Privacy Badge**: Green badge with lock icon

### Reference Implementation
See `LIVE_v2.html` for the complete free version styling that Pro should match.

---

## Product Overview

| Version | Features | Data Storage | AI Cost |
|---------|----------|--------------|---------|
| **LiVE Free** | LIVE.html & LIVE_v2.html, 100% local analytics | Browser only (IndexedDB in v2) | None |
| **LiVE Pro (Subscription)** | AI insights, cloud sync | Stored securely | We pay |
| **LiVE Pro (BYOK)** | AI insights, choice of local or cloud | User chooses | User pays |

---

## Key Architecture Decisions

### 1. Data Storage Model (Hybrid with User Choice)

**Subscription Users:**
- Cloud sync enabled by default
- We store: processed connections, categories, AI-generated insights
- Benefits: Don't re-upload, insights persist, faster experience
- We control AI costs

**BYOK Users:**
- **Option A: Cloud Sync** - Same as subscription, but they pay AI costs
- **Option B: Local Only** - Nothing stored on server, re-upload each session
- Local-only option ONLY available for BYOK (since regenerating insights costs AI)

**What We Store (for cloud sync users):**
- User account (email, password hash, preferences)
- Processed LinkedIn data (connections, companies, categories)
- AI-generated insights (outreach drafts, strategy analysis)
- Usage metrics

**What We NEVER Store:**
- Raw uploaded files (parse and discard)
- Message content from LinkedIn
- Email addresses from connections (unless user opts in)

### 2. Tech Stack

```
Frontend:    React SPA (Vite) - reuse LIVE.html styling
Backend:     Node.js + Express
Database:    Supabase (Postgres + Auth + RLS)
AI:          Claude API (Anthropic SDK)
Hosting:     Vercel (frontend) + Railway (backend) + Supabase (DB)
Payments:    Stripe
```

### 3. MVP Scope (Individual Users Only)

**In Scope:**
- User auth (signup, login, password reset)
- Invite codes for free trials
- BYOK option for API keys
- LinkedIn data upload + processing
- AI Feature 1: Smart Outreach Drafts
- AI Feature 2: Network Strategy Analysis
- Basic admin dashboard (users, codes, usage)
- Cloud sync vs local-only choice

**Out of Scope (Phase 2):**
- Coach tier (manage clients)
- Content Coach add-on
- Advanced analytics/reporting

---

## File Structure

```
live-pro/
├── frontend/                 # React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── FileUpload.jsx
│   │   │   ├── NetworkAnalytics.jsx
│   │   │   ├── OutreachDrafter.jsx
│   │   │   ├── StrategyAnalysis.jsx
│   │   │   └── CategorySetup.jsx
│   │   ├── lib/
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   └── linkedinParser.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                  # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── data.js
│   │   │   ├── ai.js
│   │   │   └── admin.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── rateLimit.js
│   │   ├── services/
│   │   │   ├── claude.js
│   │   │   ├── linkedin.js
│   │   │   └── usage.js
│   │   ├── db/
│   │   │   └── schema.sql
│   │   └── index.js
│   ├── package.json
│   └── .env.example
│
├── admin/                    # Admin Dashboard (simple)
│   └── index.html            # Single-page admin
│
└── README.md
```

---

## API Endpoints

### Auth
```
POST /api/auth/signup        { email, password, invite_code? }
POST /api/auth/login         { email, password }
POST /api/auth/logout
POST /api/auth/reset-password
GET  /api/auth/me
```

### Data
```
POST /api/data/import        FormData (ZIP file) → parse & store
GET  /api/data/connections   ?search=&category=&strength=
GET  /api/data/stats         Network analytics summary
DELETE /api/data/all         Clear user's stored data
```

### AI
```
POST /api/ai/outreach-draft  { connection_id, tone? }
POST /api/ai/strategy        { focus?: 'dormant'|'executives'|'all' }
GET  /api/ai/insights        Cached insights for user
```

### Settings
```
GET  /api/settings
PATCH /api/settings          { storage_mode, api_key? }
```

### Admin
```
GET  /api/admin/users
GET  /api/admin/usage
POST /api/admin/invite-codes
GET  /api/admin/analytics
```

---

## User Flows

### New User (Subscription)
1. Gets invite code from admin
2. Signs up with code → trial starts
3. Uploads LinkedIn ZIP
4. Data stored to cloud (default)
5. Views analytics + generates AI insights
6. Insights cached, available on return
7. Subscribes via Stripe to continue

### BYOK User
1. Signs up (with or without code)
2. Goes to Settings → pastes Claude API key
3. Chooses: "Cloud Sync" or "Local Only"
4. If Local Only: data parsed in browser, sent to Claude, not stored
5. If Cloud Sync: same as subscription user

### Returning User (Cloud Sync)
1. Logs in
2. Sees previous connections + cached insights
3. Can re-upload to refresh data
4. Can generate new AI insights

### Returning User (Local Only)
1. Logs in
2. Prompted to upload LinkedIn data again
3. Generates fresh insights (uses their API key)

---

## Security Notes

- Passwords: bcrypt hashed
- API keys (BYOK): AES-256 encrypted at rest
- JWT tokens: short-lived (1 hour) + refresh tokens
- RLS: Database-level isolation per user
- CORS: Whitelist frontend domain only
- Rate limiting: Per user, per endpoint

---

## AI Prompts (Examples)

### Outreach Draft Prompt
```
You are helping {user_name} write a professional outreach message to reconnect with a dormant contact.

CONTACT:
Name: {contact_name}
Position: {position}
Company: {company}
Last Contact: {last_contact_date}
Relationship: {relationship_strength}

USER CONTEXT:
{user_background}
Current focus: {current_focus}

Write a warm, personalized LinkedIn message (3-4 paragraphs) that:
1. Acknowledges the time since last contact
2. Shows genuine interest in their work
3. Mentions a specific reason to reconnect
4. Ends with a clear, low-pressure call to action

Tone: Professional but personable
```

### Network Strategy Prompt
```
Analyze this professional network and provide strategic recommendations.

NETWORK SUMMARY:
- Total connections: {total}
- Categories: {category_breakdown}
- Relationship strength: {strength_breakdown}
- Dormant contacts: {dormant_count}

TOP COMPANIES: {top_companies}

Provide:
1. Key observations about network composition
2. Gaps or blind spots in the network
3. Top 5 priority contacts to reach out to (and why)
4. Recommended networking activities for the next 30 days
```

---

## Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
JWT_SECRET=random-secure-string-32-chars
CLAUDE_API_KEY=sk-ant-...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ENCRYPTION_KEY=32-byte-key-for-api-key-encryption

# Frontend
VITE_API_URL=https://api.live-pro.com
VITE_STRIPE_KEY=pk_live_...
```

---

## Build Commands

```bash
# Backend
cd backend
npm install
npm run dev      # Development
npm run build    # Production

# Frontend
cd frontend
npm install
npm run dev      # Development
npm run build    # Production build
npm run preview  # Preview production build
```

---

## Deployment

### Supabase
1. Create project at supabase.com
2. Run schema.sql in SQL editor
3. Enable Row Level Security
4. Copy URL and anon key to .env

### Backend (Railway)
1. Connect GitHub repo
2. Set environment variables
3. Deploy

### Frontend (Vercel)
1. Connect GitHub repo
2. Set VITE_API_URL
3. Deploy

---

## Pricing Model (Suggested)

| Tier | Price | AI Calls | Features |
|------|-------|----------|----------|
| Free Trial | $0 (invite code) | 10 | Basic analytics, 10 outreach drafts |
| Individual | $29/mo | 100/mo | Full analytics, AI insights, cloud sync |
| BYOK | $9/mo | Unlimited* | Use your own Claude key, local or cloud |

*BYOK users pay their own Claude API costs
