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
        show_outreach: false,
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
    const { storage_mode, api_key, preferred_model } = req.body
    const updates = {}

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

export default router
