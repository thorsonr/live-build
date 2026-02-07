import { supabaseAdmin } from '../lib/supabase.js'

// =============================================
// TIER CONFIGURATION — single source of truth
// =============================================

const TIER_CONFIGS = {
  trial: {
    analysis_limit: 1,
    chat_limit: 2,
    outreach_limit: 2,
    analysis_model: 'claude-haiku-4-5-20251001',
    chat_enabled: true,
    show_byok: false,
    show_outreach: true,
    show_tracker: false,
    trial_days: 5,
    show_chat_counter: true,
  },
  active: {
    analysis_limit: 4,
    chat_limit: 25,
    outreach_limit: 10,
    analysis_model: 'claude-sonnet-4-20250514',
    chat_enabled: true,
    show_byok: true,
    show_outreach: true,
    show_tracker: false,
    show_chat_counter: false,
  },
  max: {
    analysis_limit: 4,
    chat_limit: 999999,
    outreach_limit: 999999,
    analysis_model: 'claude-sonnet-4-20250514',
    chat_enabled: true,
    show_byok: true,
    show_outreach: true,
    show_tracker: true,
    show_chat_counter: false,
  },
  byok: {
    analysis_limit: 999999,
    chat_limit: 999999,
    outreach_limit: 999999,
    analysis_model: null, // user picks
    chat_enabled: true,
    show_byok: true,
    show_outreach: true,
    show_tracker: true,
    show_chat_counter: false,
  },
}

// Feature → counter mapping
const FEATURE_COUNTER_MAP = {
  full_analysis: 'analysis',
  outreach_draft: 'analysis',
  network_strategy: 'analysis',
  ai_chat: 'chat',
  outreach_message: 'outreach',
}

/**
 * Determine the tier for a user and return full config.
 * Checks admin overrides (analysis_limit_override, chat_limit_override, forced_model).
 */
export async function getTierConfig(user) {
  // user should have: subscription_status, api_key_encrypted, trial_ends_at,
  //   analysis_limit_override, chat_limit_override, forced_model
  // Admins get unlimited everything
  if (user.is_admin) {
    return {
      ...TIER_CONFIGS.byok,
      tier: user.api_key_encrypted ? 'byok' : user.subscription_status === 'active' ? 'active' : 'trial',
      is_admin: true,
      analysis_limit: 999999,
      chat_limit: 999999,
      chat_enabled: true,
      show_byok: true,
      show_chat_counter: false,
    }
  }

  let tierKey = 'trial'
  if (user.api_key_encrypted) {
    tierKey = 'byok'
  } else if (user.subscription_status === 'max') {
    tierKey = 'max'
  } else if (user.subscription_status === 'active') {
    tierKey = 'active'
  }

  const config = { ...TIER_CONFIGS[tierKey], tier: tierKey }

  // Check trial expiry
  if (tierKey === 'trial' && user.trial_ends_at) {
    config.trial_expired = new Date(user.trial_ends_at) < new Date()
    config.trial_ends_at = user.trial_ends_at
  }

  // Admin overrides
  if (user.analysis_limit_override != null) {
    config.analysis_limit = user.analysis_limit_override
  }
  if (user.chat_limit_override != null) {
    config.chat_limit = user.chat_limit_override
  }
  if (user.forced_model) {
    config.analysis_model = user.forced_model
  }

  return config
}

/**
 * Convenience: fetch user from DB and return tier config.
 */
export async function getUserTier(userId) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('subscription_status, api_key_encrypted, trial_ends_at, analysis_limit_override, chat_limit_override, forced_model, preferred_model, is_admin')
    .eq('id', userId)
    .single()

  if (!user) {
    return { ...TIER_CONFIGS.trial, tier: 'trial' }
  }

  return getTierConfig(user)
}

/**
 * Check and increment usage for a specific feature.
 * Feature map: full_analysis/outreach_draft/network_strategy → analysis counter; ai_chat → chat counter.
 */
export async function checkAndIncrementUsage(userId, feature) {
  const monthYear = new Date().toISOString().slice(0, 7) // "2026-02"
  const counterType = FEATURE_COUNTER_MAP[feature] || 'analysis'

  // Fetch user for tier determination
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('subscription_status, api_key_encrypted, trial_ends_at, analysis_limit_override, chat_limit_override, forced_model, is_admin')
    .eq('id', userId)
    .single()

  if (!user) {
    return { allowed: false, reason: 'user_not_found' }
  }

  const tier = await getTierConfig(user)

  // Trial expiry check
  if (tier.trial_expired) {
    return { allowed: false, reason: 'trial_expired' }
  }

  const limit = counterType === 'outreach' ? tier.outreach_limit
    : counterType === 'chat' ? tier.chat_limit
    : tier.analysis_limit

  // Feature not available for this tier (e.g. outreach on trial/active)
  if (limit === 0) {
    return { allowed: false, reason: 'feature_not_available' }
  }

  // Get or create quota for this month
  let { data: quota, error } = await supabaseAdmin
    .from('usage_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single()

  if (error && error.code === 'PGRST116') {
    // Not found - create new quota
    const { data: newQuota, error: insertError } = await supabaseAdmin
      .from('usage_quotas')
      .insert({
        user_id: userId,
        month_year: monthYear,
        ai_calls_limit: tier.analysis_limit,
        ai_calls_used: 0,
        analysis_calls_used: 0,
        analysis_calls_limit: tier.analysis_limit,
        chat_calls_used: 0,
        chat_calls_limit: tier.chat_limit,
        outreach_calls_used: 0,
        outreach_calls_limit: tier.outreach_limit || 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create quota:', insertError)
      return { allowed: true, quota: null, warning: 'Quota system unavailable' }
    }

    quota = newQuota
  } else if (error) {
    console.error('Failed to get quota:', error)
    return { allowed: true, quota: null, warning: 'Quota system unavailable' }
  }

  // Determine current usage and limit for this counter type
  const usedField = counterType === 'outreach' ? 'outreach_calls_used'
    : counterType === 'chat' ? 'chat_calls_used'
    : 'analysis_calls_used'
  const currentUsed = quota[usedField] || 0

  // Check if over limit (BYOK and max-unlimited features skip limit check)
  if (currentUsed >= limit && limit < 999999) {
    return {
      allowed: false,
      reason: 'quota_exceeded',
      quota: {
        used: currentUsed,
        limit,
        type: counterType,
      },
    }
  }

  // Increment usage with optimistic lock to prevent race conditions
  const updates = {
    [usedField]: currentUsed + 1,
    ai_calls_used: (quota.ai_calls_used || 0) + 1, // backward compat for admin dashboard
  }

  const { data: updatedRows, error: updateError } = await supabaseAdmin
    .from('usage_quotas')
    .update(updates)
    .eq('id', quota.id)
    .eq(usedField, currentUsed) // Optimistic lock: only update if value unchanged
    .select('id')

  if (updateError) {
    console.error('Failed to update quota:', updateError)
  } else if (!updatedRows || updatedRows.length === 0) {
    // Race condition: value changed between read and write — retry once
    return checkAndIncrementUsage(userId, feature)
  }

  return {
    allowed: true,
    quota: {
      used: currentUsed + 1,
      limit,
      type: counterType,
    },
  }
}

// Pricing per million tokens (USD)
const MODEL_PRICING = {
  'claude-sonnet-4-20250514':  { input: 3.00, output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
}

/**
 * Log actual token usage and cost after an AI call completes.
 */
export async function logTokenUsage(userId, feature, usage) {
  const pricing = MODEL_PRICING[usage.model] || MODEL_PRICING['claude-sonnet-4-20250514']
  const costIn = (usage.input_tokens / 1_000_000) * pricing.input
  const costOut = (usage.output_tokens / 1_000_000) * pricing.output
  const totalCost = Math.round((costIn + costOut) * 1_000_000) / 1_000_000 // 6 decimal places

  const { error } = await supabaseAdmin
    .from('usage_logs')
    .insert({
      user_id: userId,
      feature,
      tokens_in: usage.input_tokens,
      tokens_out: usage.output_tokens,
      model: usage.model,
      cost: totalCost,
    })

  if (error) {
    console.error('Failed to log token usage:', error)
  }

  return { cost: totalCost, tokens_in: usage.input_tokens, tokens_out: usage.output_tokens }
}

export async function getUserQuota(userId) {
  const monthYear = new Date().toISOString().slice(0, 7)

  const { data: quota } = await supabaseAdmin
    .from('usage_quotas')
    .select('*')
    .eq('user_id', userId)
    .eq('month_year', monthYear)
    .single()

  if (!quota) {
    const tier = await getUserTier(userId)
    return {
      ai_calls_used: 0,
      ai_calls_limit: tier.analysis_limit,
      analysis_calls_used: 0,
      analysis_calls_limit: tier.analysis_limit,
      chat_calls_used: 0,
      chat_calls_limit: tier.chat_limit,
      outreach_calls_used: 0,
      outreach_calls_limit: tier.outreach_limit || 0,
    }
  }

  return quota
}
