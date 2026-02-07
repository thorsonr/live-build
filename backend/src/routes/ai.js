import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { generateOutreachDraft, generateNetworkStrategy, generateFullAnalysis, generateChatResponse, generateOutreachMessages } from '../services/claude.js'
import { prepareDataForAI } from '../services/ingestionPrompt.js'
import { checkAndIncrementUsage, logTokenUsage } from '../services/usage.js'
import { createUserClient, supabaseAdmin } from '../lib/supabase.js'

const router = Router()

// Full network analysis via AI
router.post('/analyze', requireAuth, async (req, res, next) => {
  // Set 180-second timeout for this endpoint
  req.setTimeout(180000)
  res.setTimeout(180000)

  try {
    const { rawData, userContext } = req.body
    const userId = req.user.id

    if (!rawData || !rawData.connections || rawData.connections.length === 0) {
      return res.status(400).json({ error: 'LinkedIn data with connections is required.' })
    }

    // Check usage quota
    const canUse = await checkAndIncrementUsage(userId, 'full_analysis')
    if (!canUse.allowed) {
      const status = canUse.reason === 'trial_expired' ? 403 : 429
      return res.status(status).json({
        error: canUse.reason === 'trial_expired'
          ? 'Your free trial has ended. Upgrade to Pro to continue.'
          : 'Monthly AI quota exceeded',
        reason: canUse.reason,
        quota: canUse.quota,
      })
    }

    // Prepare data for AI
    const dataSummary = prepareDataForAI(rawData)

    // Generate full analysis
    const { result: analysis, usage } = await generateFullAnalysis({
      dataSummary,
      userContext: userContext || '',
      userId,
    })

    // Log actual token usage
    await logTokenUsage(userId, 'full_analysis', usage)

    // Cache the insight
    await supabaseAdmin
      .from('ai_insights')
      .insert({
        user_id: userId,
        insight_type: 'full_analysis',
        content: JSON.stringify(analysis),
        metadata: { connection_count: rawData.connections.length },
      })

    res.json({ analysis })
  } catch (err) {
    next(err)
  }
})

// Generate outreach draft
router.post('/outreach-draft', requireAuth, async (req, res, next) => {
  try {
    const { contact, tone = 'warm' } = req.body
    const userId = req.user.id

    if (!contact || !contact.name) {
      return res.status(400).json({ error: 'Contact information required' })
    }

    // Check usage quota
    const canUse = await checkAndIncrementUsage(userId, 'outreach_draft')
    if (!canUse.allowed) {
      const status = canUse.reason === 'trial_expired' ? 403 : 429
      return res.status(status).json({
        error: canUse.reason === 'trial_expired'
          ? 'Your free trial has ended. Upgrade to Pro to continue.'
          : 'Monthly AI quota exceeded',
        reason: canUse.reason,
        quota: canUse.quota,
      })
    }

    // Generate the draft
    const { result: draft, usage } = await generateOutreachDraft({
      contact,
      tone,
      userId,
    })

    // Log actual token usage
    await logTokenUsage(userId, 'outreach_draft', usage)

    // Cache the insight
    await supabaseAdmin
      .from('ai_insights')
      .insert({
        user_id: userId,
        insight_type: 'outreach_draft',
        content: draft,
        metadata: { tone, contact_name: contact.name },
      })

    res.json({ draft })
  } catch (err) {
    next(err)
  }
})

// Generate network strategy analysis
router.post('/strategy', requireAuth, async (req, res, next) => {
  try {
    const { focus = 'all' } = req.body
    const userId = req.user.id

    // Check usage quota
    const canUse = await checkAndIncrementUsage(userId, 'network_strategy')
    if (!canUse.allowed) {
      const status = canUse.reason === 'trial_expired' ? 403 : 429
      return res.status(status).json({
        error: canUse.reason === 'trial_expired'
          ? 'Your free trial has ended. Upgrade to Pro to continue.'
          : 'Monthly AI quota exceeded',
        reason: canUse.reason,
        quota: canUse.quota,
      })
    }

    // Get user's network data
    const { data: analysis } = await supabaseAdmin
      .from('network_analysis')
      .select('*')
      .eq('user_id', userId)
      .single()

    const { data: connections } = await supabaseAdmin
      .from('connections')
      .select('*')
      .eq('user_id', userId)
      .limit(500)

    if (!connections || connections.length === 0) {
      return res.status(400).json({ error: 'No network data found. Please upload your LinkedIn data first.' })
    }

    // Generate strategy
    const { result: strategy, usage } = await generateNetworkStrategy({
      analysis: analysis || {},
      connections,
      focus,
      userId,
    })

    // Log actual token usage
    await logTokenUsage(userId, 'network_strategy', usage)

    // Cache the insight
    await supabaseAdmin
      .from('ai_insights')
      .insert({
        user_id: userId,
        insight_type: 'network_strategy',
        content: strategy,
        metadata: { focus },
      })

    res.json({ strategy })
  } catch (err) {
    next(err)
  }
})

// AI Chat — conversational network advisor
router.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const { messages, networkContext } = req.body
    const userId = req.user.id

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' })
    }

    // Validate message content
    for (const msg of messages) {
      if (!msg.role || !['user', 'assistant'].includes(msg.role)) {
        return res.status(400).json({ error: 'Each message must have a valid role (user or assistant)' })
      }
      if (typeof msg.content !== 'string' || msg.content.length > 10000) {
        return res.status(400).json({ error: 'Each message content must be a string under 10,000 characters' })
      }
    }

    // Check usage quota
    const canUse = await checkAndIncrementUsage(userId, 'ai_chat')
    if (!canUse.allowed) {
      const status = canUse.reason === 'trial_expired' ? 403 : 429
      return res.status(status).json({
        error: canUse.reason === 'trial_expired'
          ? 'Your free trial has ended. Upgrade to Pro to continue.'
          : canUse.reason === 'quota_exceeded'
            ? 'Chat quota exceeded. Upgrade to Pro for more questions.'
            : 'AI quota exceeded',
        reason: canUse.reason,
        quota: canUse.quota,
      })
    }

    // Truncate to last 10 messages
    const recentMessages = messages.slice(-10)

    // Generate chat response
    const { result: reply, usage } = await generateChatResponse({
      messages: recentMessages,
      networkContext: networkContext || '',
      userId,
    })

    // Log token usage
    await logTokenUsage(userId, 'ai_chat', usage)

    res.json({ reply })
  } catch (err) {
    next(err)
  }
})

// Generate outreach messages (2 variants)
router.post('/outreach-messages', requireAuth, async (req, res, next) => {
  try {
    const { contact, userContext } = req.body
    const userId = req.user.id

    if (!contact || !contact.name) {
      return res.status(400).json({ error: 'Contact information required' })
    }

    // Check usage quota
    const canUse = await checkAndIncrementUsage(userId, 'outreach_message')
    if (!canUse.allowed) {
      if (canUse.reason === 'feature_not_available') {
        return res.status(403).json({
          error: 'Upgrade to Max for the Custom Message Generator.',
          reason: canUse.reason,
        })
      }
      const status = canUse.reason === 'trial_expired' ? 403 : 429
      return res.status(status).json({
        error: canUse.reason === 'trial_expired'
          ? 'Your free trial has ended. Upgrade to continue.'
          : 'Monthly outreach quota exceeded',
        reason: canUse.reason,
        quota: canUse.quota,
      })
    }

    // Generate messages
    const { result: messages, usage } = await generateOutreachMessages({
      contact,
      userContext: userContext || '',
      userId,
    })

    // Log token usage
    await logTokenUsage(userId, 'outreach_message', usage)

    res.json({ messages })
  } catch (err) {
    next(err)
  }
})

// Get cached insights
router.get('/insights', requireAuth, async (req, res, next) => {
  try {
    const supabase = createUserClient(req.accessToken)

    const { data: insights, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ insights })
  } catch (err) {
    next(err)
  }
})

export default router
