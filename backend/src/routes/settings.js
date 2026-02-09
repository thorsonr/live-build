import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { encrypt } from '../lib/encryption.js'
import { getTierConfig, getUserQuota } from '../services/usage.js'

const router = Router()

// Get user settings (includes tier info)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('storage_mode, subscription_status, trial_ends_at, api_key_encrypted, preferred_model, analysis_limit_override, chat_limit_override, forced_model, is_admin')
      .eq('id', req.user.id)
      .single()

    if (error) {
      // User might not exist in our users table yet (only in Supabase Auth)
      return res.json({
        storage_mode: 'cloud',
        subscription_status: 'trial',
        has_api_key: false,
        tier: 'trial',
        chat_enabled: true,
        show_byok: false,
        show_outreach: true,
        show_tracker: false,
        analysis_limit: 1,
        chat_limit: 2,
        show_chat_counter: true,
        trial_expired: false,
        is_admin: false,
      })
    }

    const tier = await getTierConfig(user)

    res.json({
      storage_mode: user.storage_mode || 'cloud',
      subscription_status: user.subscription_status || 'trial',
      trial_ends_at: user.trial_ends_at,
      has_api_key: !!user.api_key_encrypted,
      preferred_model: user.preferred_model || null,
      // Tier info
      tier: tier.tier,
      chat_enabled: tier.chat_enabled,
      show_byok: tier.show_byok,
      show_outreach: tier.show_outreach || false,
      show_tracker: tier.show_tracker || false,
      analysis_limit: tier.analysis_limit,
      chat_limit: tier.chat_limit,
      show_chat_counter: tier.show_chat_counter || false,
      trial_expired: tier.trial_expired || false,
      is_admin: !!user.is_admin,
    })
  } catch (err) {
    next(err)
  }
})

// Get usage quota for current month
router.get('/quota', requireAuth, async (req, res, next) => {
  try {
    const quota = await getUserQuota(req.user.id)

    res.json({
      analysis_used: quota.analysis_calls_used || 0,
      analysis_limit: quota.analysis_calls_limit || 1,
      chat_used: quota.chat_calls_used || 0,
      chat_limit: quota.chat_calls_limit || 0,
      outreach_used: quota.outreach_calls_used || 0,
      outreach_limit: quota.outreach_calls_limit || 0,
    })
  } catch (err) {
    next(err)
  }
})

// Update settings
router.patch('/', requireAuth, async (req, res, next) => {
  try {
    const { storage_mode, api_key, preferred_model, first_name, last_name } = req.body
    const updates = {}

    if (first_name !== undefined) {
      updates.first_name = first_name ? first_name.trim().slice(0, 100) : null
    }
    if (last_name !== undefined) {
      updates.last_name = last_name ? last_name.trim().slice(0, 100) : null
    }

    if (storage_mode && ['cloud', 'local'].includes(storage_mode)) {
      updates.storage_mode = storage_mode
    }

    if (api_key) {
      // Encrypt the API key before storing (AES-256-GCM)
      updates.api_key_encrypted = encrypt(api_key)
    }

    if (api_key === null) {
      // Allow removing API key
      updates.api_key_encrypted = null
      updates.preferred_model = null
    }

    const ALLOWED_MODELS = [
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-20250514',
      'claude-sonnet-4-5-20250929',
    ]
    if (preferred_model && ALLOWED_MODELS.includes(preferred_model)) {
      updates.preferred_model = preferred_model
    }
    if (preferred_model === null) {
      updates.preferred_model = null
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' })
    }

    // Upsert user record
    const { error } = await supabaseAdmin
      .from('users')
      .upsert({
        id: req.user.id,
        email: req.user.email,
        ...updates,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// Redeem an invite code (for existing users)
router.post('/redeem-code', requireAuth, async (req, res, next) => {
  try {
    const { code: inviteCode } = req.body

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ error: 'Invite code is required' })
    }

    // Look up the code
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode.trim())
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

    // Try RPC first, fallback to manual update
    const { error: redeemError } = await supabaseAdmin
      .rpc('redeem_invite_code', {
        p_code: inviteCode.trim(),
        p_user_id: req.user.id,
      })

    if (redeemError) {
      console.error('Failed to redeem invite code via RPC, using fallback:', redeemError.message)
      await supabaseAdmin
        .from('invite_codes')
        .update({
          use_count: codeData.use_count + 1,
          redeemed_by: req.user.id,
          redeemed_at: new Date().toISOString(),
        })
        .eq('code', inviteCode.trim())
        .eq('use_count', codeData.use_count)
    }

    // Apply bonus analyses if any
    if (codeData.bonus_analyses > 0) {
      await supabaseAdmin
        .from('users')
        .update({ analysis_limit_override: codeData.bonus_analyses })
        .eq('id', req.user.id)
    }

    res.json({ success: true, bonus_analyses: codeData.bonus_analyses || 0 })
  } catch (err) {
    next(err)
  }
})

// Submit feedback
router.post('/feedback', requireAuth, async (req, res, next) => {
  try {
    const { category, message, page_url } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' })
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message must be under 2000 characters' })
    }

    const { error } = await supabaseAdmin
      .from('feedback')
      .insert({
        user_id: req.user.id,
        email: req.user.email,
        category: category || 'general',
        message: message.trim(),
        page_url: page_url || null,
      })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

export default router
