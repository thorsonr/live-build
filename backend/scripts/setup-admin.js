#!/usr/bin/env node
// One-off script to create/promote a user to admin
// Usage: node scripts/setup-admin.js <email>

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

const email = process.argv[2]
if (!email) {
  console.error('Usage: node scripts/setup-admin.js <email>')
  process.exit(1)
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function setupAdmin() {
  // Find user in Supabase Auth
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) {
    console.error('Failed to list auth users:', authError.message)
    process.exit(1)
  }

  const authUser = users.find(u => u.email === email)
  if (!authUser) {
    console.error(`No auth user found with email: ${email}`)
    console.log('Available users:', users.map(u => u.email).join(', '))
    process.exit(1)
  }

  console.log(`Found auth user: ${authUser.id} (${authUser.email})`)

  // Upsert into users table with is_admin = true
  // password_hash is NOT NULL in schema but unused (Supabase Auth handles passwords)
  const { error } = await supabase
    .from('users')
    .upsert({
      id: authUser.id,
      email: authUser.email,
      password_hash: 'supabase-auth-managed',
      is_admin: true,
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })

  if (error) {
    console.error('Failed to upsert user:', error)
    process.exit(1)
  }

  console.log(`Successfully set ${email} as admin!`)

  // Verify
  const { data: user } = await supabase
    .from('users')
    .select('id, email, is_admin, subscription_status')
    .eq('id', authUser.id)
    .single()

  console.log('User record:', user)
}

setupAdmin()
