import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side only client with full access
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export type Cheater = {
  id: string
  discord_id: string
  username: string | null
  avatar_url: string | null
  servers: string[]
  confidence: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  notes: string | null
  submitted_by: string | null
  source: 'manual' | 'xtracker' | 'bot'
  roblox_username: string | null
  evidence_links: string[]
  created_at: string
  updated_at: string
}

export type Report = {
  id: string
  discord_id: string
  reported_by: string | null
  server_name: string | null
  reason: string
  evidence: string | null
  created_at: string
}
