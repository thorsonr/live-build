import { Router } from 'express'
import { requireAdmin } from '../middleware/auth.js'
import { supabaseAdmin } from '../lib/supabase.js'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// Get all users (admin only)
router.get('/users', requireAdmin, async (req, res, next) => {
  try {
    const { search } = req.query

    let query = supabaseAdmin
      .from('users')
      .select('id, email, name, subscription_status, created_at, is_admin, trial_ends_at, preferred_model, api_key_encrypted, analysis_limit_override, chat_limit_override, forced_model')
      .order('created_at', { ascending: false })
      .limit(100)

    if (search) {
      const sanitized = search.replace(/[,.()"\\%_]/g, '')
      query = query.or(`email.ilike.%${sanitized}%,name.ilike.%${sanitized}%`)
    }

    const { data: users, error } = await query

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Get AI call counts per user
    const userIds = users.map(u => u.id)
    const { data: usageCounts } = await supabaseAdmin
      .from('usage_logs')
      .select('user_id')
      .in('user_id', userIds)

    const callCountMap = {}
    ;(usageCounts || []).forEach(u => {
      callCountMap[u.user_id] = (callCountMap[u.user_id] || 0) + 1
    })

    // Transform: hide encrypted key, add ai_calls count
    const enrichedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      subscription_status: u.subscription_status,
      created_at: u.created_at,
      is_admin: u.is_admin,
      trial_ends_at: u.trial_ends_at,
      preferred_model: u.preferred_model,
      has_api_key: !!u.api_key_encrypted,
      ai_calls: callCountMap[u.id] || 0,
      analysis_limit_override: u.analysis_limit_override,
      chat_limit_override: u.chat_limit_override,
      forced_model: u.forced_model,
    }))

    res.json({ users: enrichedUsers })
  } catch (err) {
    next(err)
  }
})

// Update user (admin only)
const ALLOWED_USER_UPDATES = ['subscription_status', 'is_admin', 'trial_ends_at', 'analysis_limit_override', 'chat_limit_override', 'forced_model']
const ALLOWED_STATUSES = ['trial', 'active', 'max', 'suspended']

router.patch('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = {}

    for (const key of ALLOWED_USER_UPDATES) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' })
    }

    // Validate subscription_status
    if (updates.subscription_status && !ALLOWED_STATUSES.includes(updates.subscription_status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` })
    }

    // Prevent admin from removing their own admin status
    if (updates.is_admin === false && id === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin status' })
    }

    // Validate override types
    if (updates.analysis_limit_override !== undefined && updates.analysis_limit_override !== null) {
      updates.analysis_limit_override = parseInt(updates.analysis_limit_override)
      if (isNaN(updates.analysis_limit_override)) updates.analysis_limit_override = null
    }
    if (updates.chat_limit_override !== undefined && updates.chat_limit_override !== null) {
      updates.chat_limit_override = parseInt(updates.chat_limit_override)
      if (isNaN(updates.chat_limit_override)) updates.chat_limit_override = null
    }

    const ALLOWED_MODELS = [
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-20250514',
      'claude-sonnet-4-5-20250929',
    ]
    if (updates.forced_model && !ALLOWED_MODELS.includes(updates.forced_model)) {
      updates.forced_model = null
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, email, name, subscription_status, is_admin, trial_ends_at, analysis_limit_override, chat_limit_override, forced_model')
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ user: data })
  } catch (err) {
    next(err)
  }
})

// Get usage analytics
router.get('/usage', requireAdmin, async (req, res, next) => {
  try {
    const { data: usage, error } = await supabaseAdmin
      .from('admin_usage')
      .select('*')
      .limit(30)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ usage })
  } catch (err) {
    next(err)
  }
})

// Get analytics summary
router.get('/analytics', requireAdmin, async (req, res, next) => {
  try {
    // Total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Active subscriptions
    const { count: activeSubscriptions } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')

    // Users this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: usersThisMonth } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // AI calls this month
    const { data: usageData } = await supabaseAdmin
      .from('usage_logs')
      .select('id')
      .gte('created_at', startOfMonth.toISOString())

    res.json({
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      usersThisMonth: usersThisMonth || 0,
      aiCallsThisMonth: usageData?.length || 0,
    })
  } catch (err) {
    next(err)
  }
})

// Create invite codes
router.post('/invite-codes', requireAdmin, async (req, res, next) => {
  try {
    const { count = 1, max_uses = 1, expires_days = 30, prefix = 'LIVE', bonus_analyses = 0 } = req.body

    const codes = []
    for (let i = 0; i < count; i++) {
      const code = `${prefix}-${uuidv4().substring(0, 8).toUpperCase()}`
      codes.push({
        code,
        created_by: req.user.id,
        max_uses,
        bonus_analyses: parseInt(bonus_analyses) || 0,
        expires_at: new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    const { data, error } = await supabaseAdmin
      .from('invite_codes')
      .insert(codes)
      .select()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ codes: data })
  } catch (err) {
    next(err)
  }
})

// Get invite codes
router.get('/invite-codes', requireAdmin, async (req, res, next) => {
  try {
    const { data: codes, error } = await supabaseAdmin
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ codes })
  } catch (err) {
    next(err)
  }
})

// Get AI usage logs with token/cost data
router.get('/ai-usage', requireAdmin, async (req, res, next) => {
  try {
    // Recent calls (last 50)
    const { data: logs, error } = await supabaseAdmin
      .from('usage_logs')
      .select('id, user_id, feature, tokens_in, tokens_out, model, cost, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    // Enrich with user emails
    const userIds = [...new Set(logs.map(l => l.user_id))]
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .in('id', userIds)

    const emailMap = {}
    ;(users || []).forEach(u => { emailMap[u.id] = u.email })

    const enrichedLogs = logs.map(l => ({
      ...l,
      user_email: emailMap[l.user_id] || 'unknown',
    }))

    // Summary stats
    const totalTokensIn = logs.reduce((s, l) => s + (l.tokens_in || 0), 0)
    const totalTokensOut = logs.reduce((s, l) => s + (l.tokens_out || 0), 0)
    const totalCost = logs.reduce((s, l) => s + (l.cost || 0), 0)
    const callsWithCost = logs.filter(l => l.cost > 0)
    const avgCost = callsWithCost.length > 0 ? totalCost / callsWithCost.length : 0

    res.json({
      logs: enrichedLogs,
      summary: {
        total_tokens_in: totalTokensIn,
        total_tokens_out: totalTokensOut,
        total_cost: Math.round(totalCost * 1_000_000) / 1_000_000,
        avg_cost_per_call: Math.round(avgCost * 1_000_000) / 1_000_000,
        total_calls: logs.length,
      },
    })
  } catch (err) {
    next(err)
  }
})

// Get all feedback (admin only)
router.get('/feedback', requireAdmin, async (req, res, next) => {
  try {
    const { data: feedback, error } = await supabaseAdmin
      .from('feedback')
      .select('id, user_id, email, category, message, page_url, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ feedback: feedback || [] })
  } catch (err) {
    next(err)
  }
})

// Get AI platform config
router.get('/ai-config', requireAdmin, async (req, res, next) => {
  try {
    const { data: configs, error } = await supabaseAdmin
      .from('platform_config')
      .select('key, value, updated_at')

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    const config = {}
    ;(configs || []).forEach(c => {
      try { config[c.key] = JSON.parse(c.value) }
      catch { config[c.key] = c.value }
    })

    res.json({ config })
  } catch (err) {
    next(err)
  }
})

// Update AI platform config
const ALLOWED_CONFIG_KEYS = ['ai_model', 'ai_model_first_analysis', 'ai_model_analysis', 'ai_model_chat', 'ai_model_outreach', 'max_connections', 'max_shares', 'max_tokens']

router.put('/ai-config', requireAdmin, async (req, res, next) => {
  try {
    const { key, value } = req.body

    if (!key || !ALLOWED_CONFIG_KEYS.includes(key)) {
      return res.status(400).json({ error: `Invalid config key. Allowed: ${ALLOWED_CONFIG_KEYS.join(', ')}` })
    }

    const { error } = await supabaseAdmin
      .from('platform_config')
      .upsert({
        key,
        value: JSON.stringify(value),
        updated_at: new Date().toISOString(),
        updated_by: req.user.id,
      })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true, key, value })
  } catch (err) {
    next(err)
  }
})

export default router
