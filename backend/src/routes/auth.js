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

    // Validate password strength
    const passwordError = validatePassword(password)
    if (passwordError) {
      return res.status(400).json({ error: passwordError })
    }

    // Validate invite code if provided (optional)
    let code = null
    if (invite_code && invite_code.trim()) {
      const { data: codeData, error: codeError } = await supabaseAdmin
        .from('invite_codes')
        .select('*')
        .eq('code', invite_code.trim())
        .single()

      if (codeError || !codeData) {
        return res.status(400).json({ error: 'Invalid invite code' })
      }

      if (codeData.use_count >= codeData.max_uses) {
        return res.status(400).json({ error: 'Invite code has been fully redeemed' })
      }

      if (new Date(codeData.expires_at) < new Date()) {
        return res.status(400).json({ error: 'Invite code has expired' })
      }

      code = codeData
    }

    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...(invite_code ? { invite_code: invite_code.trim() } : {}),
        }
      }
    })

    if (authError) {
      return res.status(400).json({ error: authError.message })
    }

    // Create users table row for every signup
    if (authData.user?.id) {
      await supabaseAdmin
        .from('users')
        .upsert({
          id: authData.user.id,
          email,
          first_name: first_name?.trim().slice(0, 100) || null,
          last_name: last_name?.trim().slice(0, 100) || null,
        }, { onConflict: 'id' })
    }

    // Redeem invite code if provided
    if (invite_code && invite_code.trim() && authData.user?.id && code) {
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

// Delete account (soft-delete: keeps user row with 'deleted' status)
router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id

    // Delete all user data (same as /api/data/all)
    await supabaseAdmin.from('ai_insights').delete().eq('user_id', userId)
    await supabaseAdmin.from('connections').delete().eq('user_id', userId)
    await supabaseAdmin.from('network_analysis').delete().eq('user_id', userId)
    await supabaseAdmin.from('usage_quotas').delete().eq('user_id', userId)
    await supabaseAdmin.from('custom_categories').delete().eq('user_id', userId)
    await supabaseAdmin.from('engagement_tracker').delete().eq('user_id', userId)
    await supabaseAdmin.from('analysis_archives').delete().eq('user_id', userId)

    // Soft-delete: clear sensitive fields but keep the row for billing audit
    await supabaseAdmin
      .from('users')
      .update({
        subscription_status: 'deleted',
        api_key_encrypted: null,
        preferred_model: null,
        first_name: null,
        last_name: null,
      })
      .eq('id', userId)

    // Disable the Supabase Auth user so they can't sign in
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: '876600h', // ~100 years
    })

    res.json({ success: true })
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

    // Handle comma-separated FRONTEND_URL (take the first one)
    const frontendUrl = (process.env.FRONTEND_URL || '').split(',')[0].trim()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${frontendUrl}/reset-password`,
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
