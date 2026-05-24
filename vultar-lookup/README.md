# VULTAR LOOKUP — Discord Cheater Database
**Vultar of Imperium** | Anti-Cheat Division

A Next.js web app deployed on Vercel that lets clan members look up Discord IDs against:
- Your own Supabase cheater database (manual clan reports)
- XTracker API (Roblox cheater flagging service)

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14 (App Router) + Tailwind |
| Database | Supabase (Postgres) |
| Hosting | Vercel |
| External API | XTracker + Discord API (optional) |

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd vultar-lookup
npm install
```

### 2. Create Supabase project

1. Go to https://supabase.com → New Project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Go to **SQL Editor** and run the schema below

### 3. Supabase SQL Schema

```sql
-- Cheaters table
CREATE TABLE cheaters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  username TEXT,
  avatar_url TEXT,
  servers TEXT[] DEFAULT '{}',
  confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  notes TEXT,
  submitted_by TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'xtracker', 'bot')),
  roblox_username TEXT,
  evidence_links TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports table (raw submissions, for auditing)
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  discord_id TEXT NOT NULL,
  reported_by TEXT,
  server_name TEXT,
  reason TEXT NOT NULL,
  evidence TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_cheaters_discord_id ON cheaters (discord_id);
CREATE INDEX idx_reports_discord_id ON reports (discord_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cheaters_updated_at
  BEFORE UPDATE ON cheaters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: allow public reads, restrict writes to service role
ALTER TABLE cheaters ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read cheaters" ON cheaters FOR SELECT USING (true);
CREATE POLICY "Service role can write cheaters" ON cheaters FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can write reports" ON reports FOR ALL USING (auth.role() = 'service_role');
```

### 4. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in:

```env
# From Supabase Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Keep secret, server-side only

# XTracker — update with the real API base URL from XTracker docs
XTRACKER_API_KEY=your_key
XTRACKER_API_BASE=https://api.xtracker.gg

# Optional: Discord Bot Token to resolve usernames
# Create a bot at discord.com/developers → copy token
DISCORD_BOT_TOKEN=your_bot_token
```

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub and connect the repo at vercel.com → New Project.

**Add all env vars in Vercel → Project → Settings → Environment Variables.**

---

## XTracker API

The XTracker integration is in `lib/xtracker.ts`. Once you have:
- The real API base URL
- Your API key from XTracker

Update `XTRACKER_API_BASE` in your `.env.local`. The response normalizer handles both `entries` and `results` array formats. If their schema differs, update the field mapping in `lookupXTracker()`.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home with quick search |
| `/lookup` | Full search page with results |
| `/submit` | Submit a cheater report |
| `/api/lookup/[id]` | API: look up a Discord ID |
| `/api/submit` | API: POST a new report |

---

## Local Dev

```bash
npm run dev
# → http://localhost:3000
```

---

## Adding data manually (Supabase dashboard)

Go to Supabase → Table Editor → `cheaters` → Insert Row.
Fill in `discord_id`, `severity`, `reason` (in notes), `servers` array.
