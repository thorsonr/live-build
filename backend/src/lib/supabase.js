import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Fail fast if service key is missing — never fall back to anon key for admin ops
// Check is deferred slightly to allow dotenv to load in index.js
let _checkedServiceKey = false
function ensureServiceKey() {
  if (!_checkedServiceKey) {
    _checkedServiceKey = true
    if (!process.env.SUPABASE_SERVICE_KEY) {
      console.error('FATAL: SUPABASE_SERVICE_KEY is required for backend operations')
      process.exit(1)
    }
  }
}

// Service client for admin operations (bypasses RLS)
// Uses getter to ensure service key is available after dotenv loads
let _supabaseAdmin = null
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    ensureServiceKey()
    _supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    })
  }
  return _supabaseAdmin
}

// Legacy export for backward compatibility — lazy proxy
export const supabaseAdmin = new Proxy({}, {
  get(_, prop) {
    return getSupabaseAdmin()[prop]
  }
})

// Regular client for user operations (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Create a client with user's JWT for RLS
export function createUserClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}
