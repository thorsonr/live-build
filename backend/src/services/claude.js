import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '../lib/supabase.js'
import { decrypt } from '../lib/encryption.js'
import { buildIngestionPrompt } from './ingestionPrompt.js'
import { getUserTier } from './usage.js'

const DEFAULT_MODEL = 'claude-haiku-4-5-20251001'
const DEFAULT_MAX_TOKENS = 6144

// Model-specific output token limits
const MODEL_MAX_TOKENS = {
  'claude-haiku-4-5-20251001': 8192,
  'claude-sonnet-4-20250514': 8192,
  'claude-sonnet-4-5-20250929': 16384,
}

// Read AI model + maxTokens from platform_config table
async function getAIConfig() {
  try {
    const { data: configs } = await supabaseAdmin
      .from('platform_config')
      .select('key, value')
      .in('key', ['ai_model', 'max_tokens'])

    const configMap = {}
    ;(configs || []).forEach(c => {
      try { configMap[c.key] = JSON.parse(c.value) }
      catch { configMap[c.key] = c.value }
    })

    return {
      model: (typeof configMap.ai_model === 'string' ? configMap.ai_model : null) || DEFAULT_MODEL,
      maxTokens: parseInt(configMap.max_tokens) || DEFAULT_MAX_TOKENS,
    }
  } catch (e) {
    console.warn('Could not read platform_config, using defaults:', e.message)
    return { model: DEFAULT_MODEL, maxTokens: DEFAULT_MAX_TOKENS }
  }
}

// Get the user's decrypted API key (or platform key)
async function getUserAPIKey(userId) {
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('api_key_encrypted')
    .eq('id', userId)
    .single()

  if (user?.api_key_encrypted) {
    try {
      return decrypt(user.api_key_encrypted)
    } catch (e) {
      console.error('Failed to decrypt user API key:', e.message)
      throw new Error('Failed to decrypt API key. Please re-enter your key in settings.')
    }
  }

  return process.env.CLAUDE_API_KEY
}

/**
 * Get the correct model + maxTokens for a feature based on user tier.
 * ai_chat → always Haiku, max_tokens 2048
 * Free trial + analysis → force Haiku
 * Paid + analysis → force Sonnet
 * BYOK + analysis → user's preferred_model
 */
export async function getModelForFeature(userId, feature) {
  const tier = await getUserTier(userId)

  // Chat always uses Haiku
  if (feature === 'ai_chat') {
    return {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 2048,
      apiKey: await getUserAPIKey(userId),
    }
  }

  // Outreach message generation uses Haiku
  if (feature === 'outreach_message') {
    return {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 2048,
      apiKey: await getUserAPIKey(userId),
    }
  }

  // Analysis features: model depends on tier
  let model
  if (tier.tier === 'byok') {
    // BYOK: use preferred_model or tier's forced model
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('preferred_model')
      .eq('id', userId)
      .single()
    const platformConfig = await getAIConfig()
    model = tier.analysis_model || user?.preferred_model || platformConfig.model
  } else if (tier.analysis_model) {
    // Tier-enforced model (or admin override via forced_model)
    model = tier.analysis_model
  } else {
    const platformConfig = await getAIConfig()
    model = platformConfig.model
  }

  return {
    model,
    maxTokens: MODEL_MAX_TOKENS[model] || DEFAULT_MAX_TOKENS,
    apiKey: await getUserAPIKey(userId),
  }
}

export async function generateFullAnalysis({ dataSummary, userContext, userId }) {
  const aiConfig = await getModelForFeature(userId, 'full_analysis')

  if (!aiConfig.apiKey) {
    throw new Error('No API key available. Please add your Claude API key in settings.')
  }

  const client = new Anthropic({ apiKey: aiConfig.apiKey })
  const { systemPrompt, userMessage } = buildIngestionPrompt(dataSummary, userContext)

  let message
  let usedModel = aiConfig.model
  try {
    message = await client.messages.create({
      model: aiConfig.model,
      max_tokens: aiConfig.maxTokens,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userMessage }
      ]
    })
  } catch (err) {
    // If model not found and we're not already using the default, retry with default
    if (err.status === 404 && aiConfig.model !== DEFAULT_MODEL) {
      console.warn(`Model ${aiConfig.model} not found, falling back to ${DEFAULT_MODEL}`)
      usedModel = DEFAULT_MODEL
      message = await client.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: aiConfig.maxTokens,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage }
        ]
      })
    } else {
      throw err
    }
  }

  const usage = {
    input_tokens: message.usage?.input_tokens || 0,
    output_tokens: message.usage?.output_tokens || 0,
    model: message.model || usedModel,
  }

  if (message.stop_reason === 'max_tokens') {
    console.warn(`AI response truncated at ${usage.output_tokens} tokens (limit: ${aiConfig.maxTokens}). Response may be incomplete.`)
  }

  const rawText = message.content[0].text

  // Strip markdown code fences if present (handles truncated responses missing closing fence)
  let jsonText = rawText
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    jsonText = fenceMatch[1]
  } else if (jsonText.startsWith('```')) {
    // Opening fence but no closing fence (response truncated at max_tokens)
    jsonText = jsonText.replace(/^```(?:json)?\s*/, '')
  }
  jsonText = jsonText.trim()

  // Parse and validate (with truncation recovery)
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    // If truncated, try to repair by closing open braces/brackets
    if (message.stop_reason === 'max_tokens') {
      console.warn('Response truncated — attempting JSON repair')
      let repaired = jsonText
      // Remove any trailing incomplete key-value pair
      repaired = repaired.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, '')
      // Count open/close braces and brackets
      const openBraces = (repaired.match(/{/g) || []).length
      const closeBraces = (repaired.match(/}/g) || []).length
      const openBrackets = (repaired.match(/\[/g) || []).length
      const closeBrackets = (repaired.match(/\]/g) || []).length
      repaired += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
      repaired += '}'.repeat(Math.max(0, openBraces - closeBraces))
      try {
        parsed = JSON.parse(repaired)
        console.warn('JSON repair succeeded — some screens may be incomplete')
      } catch (e2) {
        console.error('JSON repair also failed:', e2.message)
        console.error('Raw response (first 500 chars):', rawText.substring(0, 500))
        throw new Error('AI returned invalid JSON. Please try again.')
      }
    } else {
      console.error('Failed to parse AI response as JSON:', e.message)
      console.error('Raw response (first 500 chars):', rawText.substring(0, 500))
      throw new Error('AI returned invalid JSON. Please try again.')
    }
  }

  if (!parsed.screens) {
    // If the response has screen keys at root level, wrap them
    const screenKeys = ['summary', 'network', 'relationships', 'skills_expertise', 'your_content', 'your_advocates', 'priorities', 'linkedins_view']
    const hasScreenKeys = screenKeys.some(k => parsed[k])
    if (hasScreenKeys) {
      const screens = {}
      for (const key of screenKeys) {
        if (parsed[key]) {
          screens[key] = parsed[key]
          delete parsed[key]
        }
      }
      parsed = { ...parsed, screens }
    } else {
      throw new Error('AI response missing required "screens" key.')
    }
  }

  return { result: parsed, usage }
}

export async function generateOutreachDraft({ contact, tone, userId }) {
  const aiConfig = await getModelForFeature(userId, 'outreach_draft')

  if (!aiConfig.apiKey) {
    throw new Error('No API key available. Please add your Claude API key in settings.')
  }

  const client = new Anthropic({ apiKey: aiConfig.apiKey })

  const prompt = `You are helping write a professional outreach message to reconnect with a dormant contact.

CONTACT:
Name: ${contact.name}
Position: ${contact.position || 'Unknown'}
Company: ${contact.company || 'Unknown'}
Last Contact: ${contact.lastContact || 'Unknown'}
Relationship Strength: ${contact.relationshipStrength || 'Unknown'}
Is Dormant: ${contact.isDormant ? 'Yes (2+ years since meaningful contact)' : 'No'}

TONE: ${tone}

Write a warm, personalized LinkedIn message (3-4 paragraphs) that:
1. Acknowledges the time since last contact naturally
2. Shows genuine interest in their current work
3. Mentions a specific reason to reconnect (career update, industry trend, mutual interest)
4. Ends with a clear, low-pressure call to action

Keep it authentic and conversational. Avoid sounding templated or salesy.`

  const message = await client.messages.create({
    model: aiConfig.model,
    max_tokens: 1024,
    messages: [
      { role: 'user', content: prompt }
    ]
  })

  return {
    result: message.content[0].text,
    usage: {
      input_tokens: message.usage?.input_tokens || 0,
      output_tokens: message.usage?.output_tokens || 0,
      model: message.model || aiConfig.model,
    },
  }
}

export async function generateNetworkStrategy({ analysis, connections, focus, userId }) {
  const aiConfig = await getModelForFeature(userId, 'network_strategy')

  if (!aiConfig.apiKey) {
    throw new Error('No API key available. Please add your Claude API key in settings.')
  }

  const client = new Anthropic({ apiKey: aiConfig.apiKey })

  // Summarize connections for context
  const dormantContacts = connections.filter(c => c.is_dormant).slice(0, 10)
  const strongContacts = connections.filter(c => c.rel_strength === 'strong').slice(0, 10)

  const prompt = `Analyze this professional network and provide strategic recommendations.

NETWORK SUMMARY:
- Total connections: ${analysis.total_connections || connections.length}
- Categories: ${JSON.stringify(analysis.category_counts || {})}
- Relationship strength breakdown: ${JSON.stringify(analysis.strength_breakdown || {})}
- Dormant contacts (2+ years, low engagement): ${analysis.dormant_count || 0}
- Years building network: ${analysis.years_building || 'Unknown'}
- Engagement rate: ${analysis.engagement_rate || 0}%

TOP COMPANIES: ${JSON.stringify(analysis.company_counts || {})}

NOTABLE DORMANT CONTACTS:
${dormantContacts.map(c => `- ${c.name}, ${c.position} at ${c.company}`).join('\n')}

STRONGEST RELATIONSHIPS:
${strongContacts.map(c => `- ${c.name}, ${c.position} at ${c.company}`).join('\n')}

FOCUS AREA: ${focus}

Provide a strategic analysis with:
1. Key observations about network composition (2-3 bullet points)
2. Identified gaps or blind spots (2-3 bullet points)
3. Top 5 priority contacts to reach out to and why
4. Recommended networking activities for the next 30 days (3-5 specific actions)

Be specific and actionable. Reference actual contacts where relevant.`

  const message = await client.messages.create({
    model: aiConfig.model,
    max_tokens: 2048,
    messages: [
      { role: 'user', content: prompt }
    ]
  })

  return {
    result: message.content[0].text,
    usage: {
      input_tokens: message.usage?.input_tokens || 0,
      output_tokens: message.usage?.output_tokens || 0,
      model: message.model || aiConfig.model,
    },
  }
}

/**
 * Generate two LinkedIn outreach message variants for a contact.
 * Uses Haiku for fast, cost-effective generation.
 */
export async function generateOutreachMessages({ contact, userContext, tone = 'professional', length = 'medium', userId }) {
  const aiConfig = await getModelForFeature(userId, 'outreach_message')

  if (!aiConfig.apiKey) {
    throw new Error('No API key available. Please add your Claude API key in settings.')
  }

  const client = new Anthropic({ apiKey: aiConfig.apiKey })

  const lengthGuide = { short: '~50 words', medium: '~100 words', long: '~200 words' }
  const lengthText = lengthGuide[length] || lengthGuide.medium

  const prompt = `You are an expert at writing LinkedIn outreach messages that get responses. Generate exactly 2 message variants for the following contact.

CONTACT:
Name: ${contact.name}
Position: ${contact.position || 'Unknown'}
Company: ${contact.company || 'Unknown'}
Relationship: ${contact.relationship || 'Unknown'}
${contact.whyPrioritized ? `Why prioritized: ${contact.whyPrioritized}` : ''}
${contact.contextHook ? `Context: ${contact.contextHook}` : ''}

USER'S GOAL:
${userContext || 'Reconnect and explore mutual opportunities'}

TONE: ${tone}
LENGTH: approximately ${lengthText} per message

RULES:
- Each message should be suitable for LinkedIn messaging
- Variant A: More direct and to-the-point
- Variant B: More warm and conversational
- Match the requested tone: ${tone}
- Match the requested length: approximately ${lengthText}
- Reference specific details about the contact when possible
- End each with a clear, low-pressure call to action
- Do NOT use generic templates — make each feel personal

Respond with ONLY valid JSON in this exact format:
{
  "variant_a": { "subject": "short subject line", "body": "full message text" },
  "variant_b": { "subject": "short subject line", "body": "full message text" }
}`

  const message = await client.messages.create({
    model: aiConfig.model,
    max_tokens: aiConfig.maxTokens,
    messages: [
      { role: 'user', content: prompt }
    ]
  })

  const usage = {
    input_tokens: message.usage?.input_tokens || 0,
    output_tokens: message.usage?.output_tokens || 0,
    model: message.model || aiConfig.model,
  }

  const rawText = message.content[0].text

  // Strip markdown code fences if present
  let jsonText = rawText
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    jsonText = fenceMatch[1]
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\s*/, '')
  }
  jsonText = jsonText.trim()

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    console.error('Failed to parse outreach messages JSON:', e.message)
    throw new Error('AI returned invalid response. Please try again.')
  }

  return { result: parsed, usage }
}

/**
 * Generate a chat response using the user's network data as context.
 * Always uses Haiku for fast, cost-effective responses.
 */
export async function generateChatResponse({ messages, networkContext, userId }) {
  const aiConfig = await getModelForFeature(userId, 'ai_chat')

  if (!aiConfig.apiKey) {
    throw new Error('No API key available. Please add your Claude API key in settings.')
  }

  const client = new Anthropic({ apiKey: aiConfig.apiKey })

  const systemPrompt = `You are LiVE Pro AI, a professional networking advisor. You have access to the user's LinkedIn network data and help them make strategic networking decisions.

NETWORK CONTEXT:
${networkContext || 'No network data available yet.'}

GUIDELINES:
- Be concise and actionable (2-4 paragraphs max)
- Reference specific contacts, companies, or data points from their network when relevant
- Focus on practical networking advice: who to reconnect with, how to strengthen relationships, career strategy
- If asked about contacts not in their data, say so honestly
- Be warm and encouraging but direct`

  // Take only the last 10 messages for context
  const recentMessages = (messages || []).slice(-10)

  const message = await client.messages.create({
    model: aiConfig.model,
    max_tokens: aiConfig.maxTokens,
    system: systemPrompt,
    messages: recentMessages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  })

  return {
    result: message.content[0].text,
    usage: {
      input_tokens: message.usage?.input_tokens || 0,
      output_tokens: message.usage?.output_tokens || 0,
      model: message.model || aiConfig.model,
    },
  }
}
