import { Router } from 'express'
import { supabase, supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Password validation
function validatePassword(password) {
  if (password.length < 10) {
    return 'Password must be at least 10 characters'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number'
  }
  return null
}

// Sanitize search input for PostgREST queries
function sanitizeSearch(input) {
  return input.replace(/[,.()"\\%_]/g, '')
}

// Sign up
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, invite_code, first_name, last_name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    // Require invite code
    if (!invite_code || !invite_code.trim()) {
      return res.status(400).json({ error: 'An invite code is required to sign up.' })
    }

    // Validate password strength
    const passwordError = validatePassword(password)
    if (passwordError) {
      return res.status(400).json({ error: passwordError })
    }

    // Validate invite code before creating user
    const { data: code, error: codeError } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .eq('code', invite_code.trim())
      .single()

    if (codeError || !code) {
      return res.status(400).json({ error: 'Invalid invite code' })
    }

    if (code.use_count >= code.max_uses) {
      return res.status(400).json({ error: 'Invite code has been fully redeemed' })
    }

    if (new Date(code.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invite code has expired' })
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          invite_code: invite_code.trim(),
        }
      }
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // Save first/last name to users table
    if (authData.user?.id && (first_name || last_name)) {
      await supabaseAdmin
        .from('users')
        .upsert({
          id: authData.user.id,
          email,
          first_name: first_name?.trim().slice(0, 100) || null,
          last_name: last_name?.trim().slice(0, 100) || null,
        }, { onConflict: 'id' })
    }

    // Atomically redeem invite code via RPC (prevents race condition)
    if (authData.user?.id) {
      const { data: redeemResult, error: redeemError } = await supabaseAdmin
        .rpc('redeem_invite_code', {
          p_code: invite_code.trim(),
          p_user_id: authData.user.id,
        })

      if (redeemError) {
        console.error('Failed to redeem invite code via RPC, using fallback:', redeemError.message)
        // Fallback: non-atomic update (acceptable if RPC function not yet deployed)
        await supabaseAdmin
          .from('invite_codes')
          .update({
            use_count: code.use_count + 1,
            redeemed_by: authData.user.id,
            redeemed_at: new Date().toISOString(),
          })
          .eq('code', invite_code.trim())
          .eq('use_count', code.use_count) // Optimistic lock

        // Apply bonus analyses
        if (code.bonus_analyses > 0) {
          await supabaseAdmin
            .from('users')
            .update({ analysis_limit_override: code.bonus_analyses })
            .eq('id', authData.user.id)
        }
      }
    }

    res.json({
      user: authData.user,
      session: authData.session,
    })
  } catch (err) {
    next(err)
  }
})

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    res.json({
      user: data.user,
      session: data.session,
    })
  } catch (err) {
    next(err)
  }
})

// Logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// Get current user — only return safe fields
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, first_name, last_name, storage_mode, subscription_status, preferred_model, is_admin, created_at')
      .eq('id', req.user.id)
      .single()

    res.json({
      user: req.user,
      profile: userData || null,
    })
  } catch (err) {
    next(err)
  }
})

// Password reset request
router.post('/reset-password', async (req, res, next) => {
  try {
    const { email } = req.body

    if (!email) {
      return res.status(400).json({ error: 'Email required' })
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
    })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true, message: 'Password reset email sent' })
  } catch (err) {
    next(err)
  }
})

export default router
