# LiVE Pro - LinkedIn Visual Engine

AI-powered LinkedIn network analysis tool for professionals.

## Features

- **Network Analytics**: Visualize your LinkedIn connections, engagement patterns, and network composition
- **AI Outreach Drafts**: Generate personalized reconnection messages using Claude AI
- **Network Strategy**: Get AI-powered insights on how to grow and maintain your network
- **Privacy First**: Choose between cloud sync or local-only data storage

## Tech Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Database**: Supabase (Postgres + Auth + RLS)
- **AI**: Claude API (Anthropic)

## Quick Start

### Prerequisites

- Node.js 18+
- Supabase project (for auth and database)
- Claude API key (for AI features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/thorsonr/live-build.git
   cd live-build
   ```

2. Install dependencies:
   ```bash
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. Set up environment variables:
   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   # Edit both .env files with your credentials
   ```

4. Run the database schema:
   - Open your Supabase SQL Editor
   - Run the contents of `docs/schema.sql`

5. Start development servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev

   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

6. Open http://localhost:5173

## Project Structure

```
live-build/
├── frontend/              # React SPA
│   ├── src/
│   │   ├── pages/        # Route components
│   │   ├── components/   # Reusable UI components
│   │   └── lib/          # Utilities and API clients
│   └── package.json
├── backend/               # Express API
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── middleware/   # Auth, rate limiting
│   │   ├── services/     # Business logic
│   │   └── lib/          # Database clients
│   └── package.json
├── admin/                 # Admin dashboard
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md   # System design
│   └── schema.sql        # Database schema
└── README.md
```

## Environment Variables

See `.env.example` files in `frontend/` and `backend/` directories.

## License

Private - All rights reserved
