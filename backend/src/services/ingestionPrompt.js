import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load the ingestion prompt template once at startup
let INGESTION_PROMPT = ''
try {
  INGESTION_PROMPT = readFileSync(
    join(__dirname, '..', '..', '..', 'docs', 'LiVE_Pro_AI_Ingestion_Prompt.md'),
    'utf-8'
  )
} catch (e) {
  console.warn('Could not load ingestion prompt template:', e.message)
}

const MAX_CONNECTIONS = 1500
const MAX_SHARES = 100

/**
 * Summarize raw LinkedIn data for AI consumption.
 * Sends full connections but only a message index (not full message bodies),
 * caps shares at 200, and aggregates if connections > 2000.
 */
export function prepareDataForAI(rawData, userName) {
  const summary = {
    data_files_present: [],
    data_files_missing: [],
  }

  // Track which files are present
  // Only check files that are actually used in the AI analysis
  const fileChecks = [
    { key: 'connections', label: 'Connections.csv' },
    { key: 'skills', label: 'Skills.csv' },
    { key: 'endorsements', label: 'Endorsement_Received_Info.csv' },
    { key: 'recommendations', label: 'Recommendations_Received.csv' },
    { key: 'adtargeting', label: 'Ad_Targeting.csv' },
    { key: 'inferences', label: 'Inferences_about_you.csv' },
    { key: 'shares', label: 'Shares.csv' },
  ]

  // Check for messages — frontend may send pre-built messageIndex instead of raw messages
  const hasMessages = (rawData.messageIndex && Object.keys(rawData.messageIndex).length > 0) ||
    (rawData.messages && rawData.messages.length > 0)
  if (hasMessages) {
    summary.data_files_present.push('Messages.csv')
  } else {
    summary.data_files_missing.push('Messages.csv')
  }

  for (const { key, label } of fileChecks) {
    if (rawData[key] && rawData[key].length > 0) {
      summary.data_files_present.push(label)
    } else {
      summary.data_files_missing.push(label)
    }
  }

  // Connections — strip URL/Email (AI doesn't use them), cap at MAX_CONNECTIONS (most recent first)
  let connections = rawData.connections || []
  let connectionsSummary = null
  if (connections.length > MAX_CONNECTIONS) {
    // Sort by connected date descending (most recent first)
    const sorted = [...connections].sort((a, b) => {
      const dateA = a['Connected On'] || ''
      const dateB = b['Connected On'] || ''
      return dateB.localeCompare(dateA)
    })
    connections = sorted.slice(0, MAX_CONNECTIONS)
    connectionsSummary = {
      total_count: rawData.connections.length,
      sent_count: MAX_CONNECTIONS,
      note: `Network has ${rawData.connections.length} connections. Sending the ${MAX_CONNECTIONS} most recent. Older connections omitted for brevity.`,
    }
  }
  // Strip fields the AI doesn't need
  connections = connections.map(c => {
    const { URL, 'Profile URL': _p, 'LinkedIn URL': _l, 'Email Address': _e, ...rest } = c
    return rest
  })
  summary.connections = connections
  if (connectionsSummary) {
    summary.connections_note = connectionsSummary
  }

  // Messages — use pre-built index from frontend if available, otherwise build from raw
  if (rawData.messageIndex) {
    // Frontend already built the index (name → {count, lastDate})
    // Normalize key names for consistency in the prompt
    const messageIndex = {}
    for (const [name, data] of Object.entries(rawData.messageIndex)) {
      messageIndex[name] = {
        message_count: data.count || data.message_count || 0,
        last_message_date: data.lastDate || data.last_message_date || null,
      }
    }
    summary.message_index = messageIndex
    summary.total_messages = rawData.totalMessages || 0
  } else {
    // Fallback: build from raw messages (backwards compatibility)
    const messageIndex = {}
    ;(rawData.messages || []).forEach(msg => {
      const from = (msg['FROM'] || msg['From'] || '').trim()
      const to = (msg['TO'] || msg['To'] || '').trim()
      const date = msg['DATE'] || msg['Date'] || ''

      ;[from, to].filter(Boolean).forEach(name => {
        const key = name
        if (!messageIndex[key]) {
          messageIndex[key] = { message_count: 0, last_message_date: null }
        }
        messageIndex[key].message_count++
        if (date && (!messageIndex[key].last_message_date || date > messageIndex[key].last_message_date)) {
          messageIndex[key].last_message_date = date
        }
      })
    })
    summary.message_index = messageIndex
    summary.total_messages = (rawData.messages || []).length
  }

  // Remove the user's own entry from the message index so AI doesn't cite them
  if (userName && summary.message_index) {
    const userNameLower = userName.toLowerCase()
    for (const key of Object.keys(summary.message_index)) {
      if (key.toLowerCase() === userNameLower) {
        delete summary.message_index[key]
      }
    }
  }

  // Skills — full data (small)
  summary.skills = rawData.skills || []

  // Endorsements — full data
  summary.endorsements = rawData.endorsements || []

  // Recommendations — full data
  summary.recommendations = rawData.recommendations || []

  // Shares — capped at MAX_SHARES (most recent)
  const shares = rawData.shares || []
  if (shares.length > MAX_SHARES) {
    summary.shares = shares.slice(0, MAX_SHARES)
    summary.shares_note = `Showing ${MAX_SHARES} of ${shares.length} total posts (most recent).`
  } else {
    summary.shares = shares
  }
  summary.total_posts = shares.length

  // Inferences — full data (small)
  summary.inferences = rawData.inferences || []

  // Ad Targeting — full data (small)
  summary.adtargeting = rawData.adtargeting || []

  // Note: invitations and positions are deliberately excluded —
  // they are not used in the AI analysis prompt.

  return summary
}

/**
 * Convert an array of objects to pipe-delimited text.
 * Much more token-efficient than JSON for tabular data (~60% smaller).
 */
function toPipeDelimited(records, fields) {
  if (!records.length) return ''
  const header = fields.join('|')
  const rows = records.map(r => fields.map(f => (r[f] || '').toString().replace(/\|/g, '/').replace(/\n/g, ' ')).join('|'))
  return header + '\n' + rows.join('\n')
}

/**
 * Build the system prompt and user message for Claude ingestion analysis.
 */
export function buildIngestionPrompt(dataSummary, userContext) {
  const systemPrompt = INGESTION_PROMPT || getDefaultPrompt()

  // Build the user message with data + context
  let userMessage = ''

  if (userContext) {
    userMessage += `## About This User\n\nIMPORTANT: Tailor ALL insights, priorities, and recommendations to this user's specific situation:\n\n${userContext}\n\n---\n\n`
  }

  userMessage += `## LinkedIn Data Export\n\n`
  userMessage += `**Files present:** ${dataSummary.data_files_present.join(', ')}\n`
  userMessage += `**Files missing:** ${dataSummary.data_files_missing.join(', ') || 'None'}\n\n`

  if (dataSummary.connections_note) {
    userMessage += `**Note:** ${dataSummary.connections_note.note}\n\n`
  }

  // Connections — pipe-delimited (saves ~45K tokens vs JSON)
  const connFields = ['First Name', 'Last Name', 'Position', 'Company', 'Connected On']
  userMessage += `### Connections (${dataSummary.connections.length} records, pipe-delimited)\n\`\`\`\n${toPipeDelimited(dataSummary.connections, connFields)}\n\`\`\`\n\n`

  // Message Index — pipe-delimited
  const msgEntries = Object.entries(dataSummary.message_index).map(([name, d]) => ({
    Name: name, Count: d.message_count, LastDate: d.last_message_date || ''
  }))
  userMessage += `### Message Index (${msgEntries.length} unique contacts, ${dataSummary.total_messages} total messages, pipe-delimited)\n\`\`\`\n${toPipeDelimited(msgEntries, ['Name', 'Count', 'LastDate'])}\n\`\`\`\n\n`

  // Skills — JSON (small dataset)
  if (dataSummary.skills.length > 0) {
    userMessage += `### Skills (${dataSummary.skills.length})\n\`\`\`json\n${JSON.stringify(dataSummary.skills, null, 0)}\n\`\`\`\n\n`
  }

  // Endorsements — pipe-delimited
  if (dataSummary.endorsements.length > 0) {
    const endFields = ['Endorser First Name', 'Endorser Last Name', 'Skill Name']
    userMessage += `### Endorsements (${dataSummary.endorsements.length}, pipe-delimited)\n\`\`\`\n${toPipeDelimited(dataSummary.endorsements, endFields)}\n\`\`\`\n\n`
  }

  // Recommendations — JSON (small dataset, has free-text)
  if (dataSummary.recommendations.length > 0) {
    userMessage += `### Recommendations (${dataSummary.recommendations.length})\n\`\`\`json\n${JSON.stringify(dataSummary.recommendations, null, 0)}\n\`\`\`\n\n`
  }

  if (dataSummary.shares.length > 0) {
    userMessage += `### Posts/Shares (${dataSummary.shares.length}${dataSummary.shares_note ? ' — ' + dataSummary.shares_note : ''})\n\`\`\`json\n${JSON.stringify(dataSummary.shares, null, 0)}\n\`\`\`\n\n`
  }

  // Inferences — JSON (small dataset)
  if (dataSummary.inferences.length > 0) {
    userMessage += `### Inferences About You (${dataSummary.inferences.length})\n\`\`\`json\n${JSON.stringify(dataSummary.inferences, null, 0)}\n\`\`\`\n\n`
  }

  // Ad Targeting — JSON (small dataset)
  if (dataSummary.adtargeting.length > 0) {
    userMessage += `### Ad Targeting Data (${dataSummary.adtargeting.length})\n\`\`\`json\n${JSON.stringify(dataSummary.adtargeting, null, 0)}\n\`\`\`\n\n`
  }

  userMessage += `\n---\n\nPlease analyze all of this data and return the JSON response as specified in your instructions. For screens 1-6, return ONLY the editorial insight fields — no computed stats, hero numbers, or chart datasets (the frontend computes those locally). For the summary screen, also include do_next_items (3-5 actionable items) and top_opportunities (top 3 contacts). For screens 2-6, return each editorial insight as a structured object with key_insight, why_it_matters, and suggested_action. For screens 7-8 (Priorities + LinkedIn's View), return the full AI-generated output. Skip Screen 9 (all_contacts). IMPORTANT: All text values must be plain text — do NOT use markdown formatting (no **bold**, no *italics*, no bullet markers). Return ONLY valid JSON — no markdown, no commentary outside the JSON object.`

  return { systemPrompt, userMessage }
}

function getDefaultPrompt() {
  return `You are the analytics engine behind LiVE Pro, a paid professional LinkedIn intelligence tool. Your tone should be that of an encouraging strategic advisor — professionally warm, constructive, and focused on untapped potential rather than criticism. All text must be plain text only — no markdown formatting (no **bold**, no *italics*, no bullet points). Analyze the provided LinkedIn data export and return a JSON response. For screens 1-6 (summary, network, relationships, skills_expertise, your_content, your_advocates), return ONLY editorial insight fields — no computed stats, charts, or category breakdowns. For the summary screen, also include do_next_items (3-5 actionable items with action, why, target_tab) and top_opportunities (top 3 contacts with name, company, role, reason, suggested_action). For screens 2-6, return each editorial insight as a structured object with key_insight, why_it_matters, and suggested_action fields. For screens 7-8 (priorities, linkedins_view), return full AI-generated output including outreach priorities and inference analysis. Skip screen 9 (all_contacts) — it is computed locally. Return only valid JSON.`
}
