# LiVE Pro - Build Guide

## ⚠️ Security Notice
**Never commit API keys to Git.** Use environment variables and `.env` files (which are gitignored).

---

## Prerequisites Checklist

| Item | Status | Details |
|------|--------|---------|
| Dev Folder | ✅ | `/Users/robertthorson/Developer/live build` |
| Git Repo | ✅ | https://github.com/thorsonr/live-build.git |
| Supabase Project | ✅ | https://wbdlcykubkveotofwthi.supabase.co |
| Supabase Anon Key | ✅ | `sb_publishable_QS5sLdsj69H9qKa82xvYaw_kd0-6rnR` |
| Claude API Key | ✅ | Stored securely (starts with `sk-ant-api03-...`) |

---

## Step 1: Set Up Supabase (You Do This)

### 1.1 Run the Database Schema
1. Go to https://wbdlcykubkveotofwthi.supabase.co
2. Navigate to **SQL Editor**
3. Copy the entire contents of `schema.sql` and run it
4. Verify tables were created in **Table Editor**

### 1.2 Get Your Credentials
From Supabase Dashboard → Settings → API:
- **Project URL**: `https://wbdlcykubkveotofwthi.supabase.co`
- **anon public key**: Your publishable key
- **service_role key**: (Keep secret - for backend only)

### 1.3 Enable Auth
1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Optionally configure email templates

---

## Step 2: Launch Claude Code Build Session

### 2.1 Open Terminal and Navigate
```bash
cd "/Users/robertthorson/Developer/live build"
```

### 2.2 Launch Claude Code with Skip Permissions
```bash
claude --dangerously-skip-permissions
```

### 2.3 Initial Setup Prompt (Copy & Paste This Entire Block)

```
I need you to build LiVE Pro - an AI-powered LinkedIn network analysis tool. Here's everything you need:

## Project Setup
- Working directory: /Users/robertthorson/Developer/live build
- Git repo: https://github.com/thorsonr/live-build.git
- Initialize git if not already done, connect to remote

## Architecture Reference
Read these files for complete specifications:
- /Users/robertthorson/Developer/live build/docs/ARCHITECTURE.md
- /Users/robertthorson/Developer/live build/docs/schema.sql

## Environment Variables (create .env files, DO NOT commit)
Backend (.env):
- SUPABASE_URL=https://wbdlcykubkveotofwthi.supabase.co
- SUPABASE_ANON_KEY=sb_publishable_QS5sLdsj69H9qKa82xvYaw_kd0-6rnR
- SUPABASE_SERVICE_KEY=(I'll provide separately)
- CLAUDE_API_KEY=(I'll provide separately)
- JWT_SECRET=(generate a secure 32-char string)
- ENCRYPTION_KEY=(generate a secure 32-byte key for API key encryption)

Frontend (.env):
- VITE_SUPABASE_URL=https://wbdlcykubkveotofwthi.supabase.co
- VITE_SUPABASE_ANON_KEY=sb_publishable_QS5sLdsj69H9qKa82xvYaw_kd0-6rnR

## Tech Stack
- Frontend: React + Vite + TailwindCSS (match LIVE_v2.html styling)
- Backend: Node.js + Express
- Database: Supabase (Postgres + Auth + RLS)
- AI: Claude API via Anthropic SDK

## Brand Guidelines
- Logo: "Li" in gold (#c9a227) + "VE" in white
- Use the CSS variables from ARCHITECTURE.md
- Match the look and feel of LIVE_v2.html

## Build Order
1. Project scaffolding (frontend + backend folders, package.json files)
2. Environment setup (.env.example files, .gitignore)
3. Backend: Express server with basic routes
4. Backend: Supabase client + auth middleware
5. Frontend: Vite + React setup with routing
6. Frontend: Auth pages (Login, Signup with invite codes)
7. Frontend: File upload + LinkedIn parsing (port from LIVE_v2.html)
8. Frontend: Dashboard with network analytics
9. Backend: AI routes (Claude integration for outreach drafts)
10. Frontend: AI features UI
11. Admin dashboard (simple)

Start with steps 1-2: Create the project structure, package.json files, .env.example files, and .gitignore. Show me the file structure when done.
```

---

## Step 3: Continue Build Prompts

After the initial setup, use these prompts to continue building:

### 3.1 Backend Auth & Database
```
Continue with the backend:
1. Set up Express server in backend/src/index.js
2. Create Supabase client in backend/src/lib/supabase.js
3. Implement auth routes (signup, login, logout, me) in backend/src/routes/auth.js
4. Add auth middleware in backend/src/middleware/auth.js
5. Test that signup creates a user in Supabase

Use the Supabase JS client (@supabase/supabase-js). Handle invite codes on signup.
```

### 3.2 Frontend Setup
```
Set up the frontend:
1. Initialize Vite + React in frontend/
2. Install dependencies: react-router-dom, @supabase/supabase-js, tailwindcss
3. Configure Tailwind with our color palette from ARCHITECTURE.md
4. Create basic routing: Landing, Login, Signup, Dashboard (protected), Settings
5. Create the header component with the LiVE logo (Li in gold, VE in white)
6. Create a protected route wrapper that redirects to login if not authenticated
```

### 3.3 Auth UI
```
Build the auth pages:
1. Login page - email/password form, error handling, redirect to dashboard on success
2. Signup page - email/password form with optional invite code field
3. Style both to match the clean aesthetic of LIVE_v2.html
4. Connect to Supabase auth
5. Store session in localStorage, check on app load
```

### 3.4 LinkedIn Parser
```
Port the LinkedIn parsing logic from LIVE_v2.html to the frontend:
1. Create components/FileUpload.jsx - drag & drop zone for ZIP files
2. Create lib/linkedinParser.js - extract and parse CSVs from ZIP
3. Use JSZip library (same as LIVE_v2.html)
4. Parse Connections.csv, messages.csv, Endorsement_Received_info.csv
5. Build the enrichedContacts array with all fields
6. For cloud sync users: POST to /api/data/import after parsing
7. For local-only users: store in React state only
```

### 3.5 Dashboard
```
Build the main dashboard:
1. Port the analytics display from LIVE_v2.html
2. Hero stats section (total connections, engagement rate, dormant count, etc.)
3. Tab navigation: Overview, Your Content, Your Advocates, All Contacts
4. Reuse the Chart.js visualizations
5. Contact grid with filtering and search
6. Make it responsive

Reference LIVE_v2.html heavily - we want the same look and feel.
```

### 3.6 AI Features
```
Implement the AI features:

Backend:
1. Create backend/src/services/claude.js - Anthropic SDK client
2. Create backend/src/routes/ai.js with endpoints:
   - POST /api/ai/outreach-draft - generate personalized outreach message
   - POST /api/ai/strategy - network strategy analysis
3. Use the prompts from ARCHITECTURE.md
4. Track usage with increment_usage() function
5. Handle BYOK users (decrypt their API key, use it instead)

Frontend:
1. Create components/OutreachDrafter.jsx - select contact, choose tone, generate draft
2. Create components/StrategyAnalysis.jsx - generate network analysis
3. Show loading states, cache results
4. Display AI responses in a nice formatted way
```

### 3.7 Settings & BYOK
```
Build the settings page:
1. Show current storage mode (cloud vs local)
2. Toggle for BYOK users to switch modes
3. Input field for Claude API key (BYOK users only)
4. Encrypt API key before storing (use crypto-js AES)
5. "Clear All Data" button
6. Account info section
```

### 3.8 Admin Dashboard
```
Build a simple admin dashboard (admin/index.html):
1. Login check (must be admin)
2. Show user count, active subscriptions
3. List recent signups
4. Create invite codes form
5. Usage analytics chart
6. Keep it simple - single HTML file with fetch calls to admin API
```

---

## Step 4: Testing & Deployment

### 4.1 Local Testing
```
Let's test everything locally:
1. Start backend: cd backend && npm run dev
2. Start frontend: cd frontend && npm run dev
3. Test signup flow with an invite code
4. Test LinkedIn data upload
5. Test AI outreach draft generation
6. Fix any bugs found
```

### 4.2 Prepare for Deployment
```
Prepare for deployment:
1. Update CORS settings for production domains
2. Create production build scripts
3. Add health check endpoint to backend
4. Create deployment documentation
5. Set up proper error handling and logging
```

---

## File Structure (Expected)

```
live build/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── schema.sql
│   └── BUILD_GUIDE.md
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── FileUpload.jsx
│   │   │   ├── NetworkAnalytics.jsx
│   │   │   ├── OutreachDrafter.jsx
│   │   │   └── ContactGrid.jsx
│   │   ├── lib/
│   │   │   ├── supabase.js
│   │   │   ├── api.js
│   │   │   └── linkedinParser.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── data.js
│   │   │   ├── ai.js
│   │   │   └── admin.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── services/
│   │   │   ├── claude.js
│   │   │   └── usage.js
│   │   ├── lib/
│   │   │   └── supabase.js
│   │   └── index.js
│   ├── package.json
│   └── .env.example
├── admin/
│   └── index.html
├── .gitignore
└── README.md
```

---

## Troubleshooting

### "Module not found" errors
```bash
cd frontend && npm install
cd ../backend && npm install
```

### Supabase connection issues
- Check that SUPABASE_URL doesn't have trailing slash
- Verify anon key is correct
- Check RLS policies are applied

### CORS errors
- Backend needs cors middleware
- Check allowed origins match frontend URL

### AI not working
- Verify CLAUDE_API_KEY is set
- Check usage quotas aren't exceeded
- Look at backend logs for API errors

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `claude --dangerously-skip-permissions` | Launch Claude Code with full permissions |
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `git add . && git commit -m "msg" && git push` | Commit and push |
