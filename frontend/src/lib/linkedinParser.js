import JSZip from 'jszip'

// File mapping for ZIP extraction
const fileMapping = {
  connections: ['connections.csv'],
  messages: ['messages.csv'],
  skills: ['skills.csv'],
  endorsements: ['endorsement_received_info.csv', 'endorsements.csv'],
  recommendations: ['recommendations_received.csv', 'recommendations.csv'],
  positions: ['positions.csv'],
  invitations: ['invitations.csv'],
  adtargeting: ['ad_targeting.csv'],
  inferences: ['inferences_about_you.csv', 'inferences.csv'],
  shares: ['shares.csv']
}

function getFileName(path) {
  return path.split('/').pop().toLowerCase()
}

// Parse CSV string into array of objects
function parseCSV(text) {
  const lines = text.split('\n')
  if (!lines.length) return []

  // Find header row - LinkedIn CSVs sometimes have notes before headers
  let headerIndex = 0
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].toLowerCase()
    if (line.includes('first name') || line.includes('from') || line.includes('skill name') ||
        line.includes('endorser') || line.includes('recommender') || line.includes('company name') ||
        line.includes('date') || line.includes('sharelink') || line.includes('category')) {
      headerIndex = i
      break
    }
  }

  const headers = parseCSVLine(lines[headerIndex])
  return lines.slice(headerIndex + 1).filter(l => l.trim()).map(line => {
    const values = parseCSVLine(line)
    const row = {}
    headers.forEach((h, i) => row[h.trim()] = (values[i] || '').trim())
    return row
  })
}

// Handle quoted CSV fields
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

// Parse date strings from LinkedIn (handles multiple formats)
function parseDate(str) {
  if (!str) return null

  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }

  // LinkedIn format: "01 Jan 2024"
  const match = str.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/)
  if (match) {
    const day = parseInt(match[1])
    const month = months[match[2].toLowerCase()]
    const year = parseInt(match[3])
    if (month !== undefined) return new Date(year, month, day)
  }

  // ISO format: "2024-01-01"
  const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return new Date(isoMatch[1], parseInt(isoMatch[2]) - 1, isoMatch[3])

  // Fallback
  const d = new Date(str)
  return isNaN(d) ? null : d
}

// Extract files from ZIP and return raw data
export async function extractLinkedInZip(file) {
  const zip = await JSZip.loadAsync(file)
  const zipFiles = Object.keys(zip.files)

  const rawData = {
    connections: [],
    messages: [],
    skills: [],
    endorsements: [],
    recommendations: [],
    positions: [],
    invitations: [],
    adtargeting: [],
    inferences: [],
    shares: []
  }

  const fileStatus = {}

  for (const [dataKey, possibleNames] of Object.entries(fileMapping)) {
    const match = zipFiles.find(f => {
      const fname = getFileName(f)
      return possibleNames.some(name => fname === name.toLowerCase())
    })

    if (match && !zip.files[match].dir) {
      const content = await zip.files[match].async('text')
      rawData[dataKey] = parseCSV(content)
      fileStatus[dataKey] = { found: true, count: rawData[dataKey].length }
    } else {
      fileStatus[dataKey] = { found: false, count: 0 }
    }
  }

  return { rawData, fileStatus }
}

// Build message index from messages data
function buildMessageIndex(messages) {
  const index = {}
  messages.forEach(msg => {
    const from = msg['FROM'] || msg['From'] || ''
    const to = msg['TO'] || msg['To'] || ''
    const date = msg['DATE'] || msg['Date'] || ''

    ;[from, to].forEach(name => {
      if (!name) return
      const key = name.toLowerCase().trim()
      if (!index[key]) index[key] = { count: 0, lastDate: null }
      index[key].count++
      const msgDate = parseDate(date)
      if (msgDate && (!index[key].lastDate || msgDate > new Date(index[key].lastDate))) {
        index[key].lastDate = date
      }
    })
  })
  return index
}

// Build endorser index from endorsements data
function buildEndorserIndex(endorsements) {
  const index = {}
  endorsements.forEach(e => {
    const name = `${e['Endorser First Name'] || ''} ${e['Endorser Last Name'] || ''}`.trim().toLowerCase()
    const skill = e['Skill Name'] || ''
    if (!name) return
    if (!index[name]) index[name] = { skills: [], count: 0 }
    index[name].skills.push(skill)
    index[name].count++
  })
  return index
}

// Calculate relationship strength
function calcRelStrength(msgCount, connDate) {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime())
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  if (msgCount >= 3) return 'strong'
  if (msgCount >= 1) return 'warm'
  if (connDate && connDate > sixMonthsAgo) return 'new'
  return 'cold'
}

// Check if contact is dormant
function checkDormancy(lastContact, connectedOn) {
  const lastDate = parseDate(lastContact) || parseDate(connectedOn)
  if (!lastDate) return false
  return (new Date() - lastDate) / (1000 * 60 * 60 * 24 * 30) > 12 // 12 months
}

// Check if position/company matches category keywords
function matchesCategory(position, company, keywords) {
  const text = `${position} ${company}`.toLowerCase()
  return keywords.some(kw => text.includes(kw.toLowerCase()))
}

// Main analysis function - call this after extracting ZIP and user clicks Analyze
export function analyzeLinkedInData(rawData, customCategories) {
  const messageIndex = buildMessageIndex(rawData.messages)
  const endorserIndex = buildEndorserIndex(rawData.endorsements)
  const companyIndex = {}

  // Process connections
  const enrichedContacts = rawData.connections.map(conn => {
    const firstName = conn['First Name'] || ''
    const lastName = conn['Last Name'] || ''
    const name = `${firstName} ${lastName}`.trim()
    const position = conn['Position'] || ''
    const company = conn['Company'] || ''
    const linkedInUrl = conn['URL'] || conn['Profile URL'] || conn['LinkedIn URL'] || ''
    const email = conn['Email Address'] || ''
    const connectedOn = conn['Connected On'] || ''
    const connectedDate = parseDate(connectedOn)

    if (company) companyIndex[company] = (companyIndex[company] || 0) + 1

    const msgHistory = messageIndex[name.toLowerCase()] || { count: 0, lastDate: null }
    const endorsed = endorserIndex[name.toLowerCase()] || { skills: [], count: 0 }

    // Match categories
    const categories = {}
    customCategories.forEach(cat => {
      const keywords = typeof cat.keywords === 'string'
        ? cat.keywords.split(',').map(k => k.trim()).filter(k => k)
        : cat.keywords
      categories[cat.name] = matchesCategory(position, company, keywords)
    })

    const relStrength = calcRelStrength(msgHistory.count, connectedDate)
    const isDormant = checkDormancy(msgHistory.lastDate, connectedOn)

    return {
      id: crypto.randomUUID(),
      name,
      firstName,
      lastName,
      position,
      company,
      linkedInUrl,
      email,
      connectedOn,
      connectedDate,
      messageCount: msgHistory.count,
      lastContact: msgHistory.lastDate,
      relStrength,
      categories,
      isDormant,
      endorsedSkills: endorsed.skills,
      endorsementCount: endorsed.count
    }
  })

  // Build analytics
  const analytics = buildAnalytics(enrichedContacts, rawData, companyIndex, endorserIndex, customCategories)

  return {
    contacts: enrichedContacts,
    analytics,
    rawData
  }
}

function buildAnalytics(contacts, rawData, companyIndex, endorserIndex, customCategories) {
  const total = contacts.length
  const messaged = contacts.filter(c => c.messageCount > 0).length
  const neverMessaged = total - messaged
  const strong = contacts.filter(c => c.relStrength === 'strong').length
  const warm = contacts.filter(c => c.relStrength === 'warm').length
  const cold = contacts.filter(c => c.relStrength === 'cold').length
  const newConn = contacts.filter(c => c.relStrength === 'new').length
  const dormant = contacts.filter(c => c.isDormant).length

  // Category counts
  const categoryCounts = {}
  customCategories.forEach(cat => {
    categoryCounts[cat.name] = contacts.filter(c => c.categories && c.categories[cat.name]).length
  })

  // Top companies
  const topCompanies = Object.entries(companyIndex)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})

  // Years building
  const dates = contacts.map(c => c.connectedDate).filter(Boolean)
  const minYear = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))).getFullYear() : new Date().getFullYear()
  const yearsBuilding = new Date().getFullYear() - minYear

  // Connections by year
  const connectionsByYear = {}
  contacts.forEach(c => {
    if (c.connectedDate) {
      const y = c.connectedDate.getFullYear()
      connectionsByYear[y] = (connectionsByYear[y] || 0) + 1
    }
  })

  // Top endorsed skills
  const skillCounts = {}
  rawData.endorsements.forEach(e => {
    const skill = e['Skill Name'] || ''
    if (skill) skillCounts[skill] = (skillCounts[skill] || 0) + 1
  })
  const topEndorsedSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Top endorsers
  const topEndorsers = Object.entries(endorserIndex).sort((a, b) => b[1].count - a[1].count).slice(0, 10)

  // Content analysis
  const shares = rawData.shares
  const postDates = shares.map(s => parseDate(s['Date'])).filter(Boolean)
  const postsByMonth = {}
  shares.forEach(s => {
    const d = parseDate(s['Date'])
    if (d) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      postsByMonth[key] = (postsByMonth[key] || 0) + 1
    }
  })

  // Content themes
  const themeKeywords = {
    'AI/GenAI': ['ai', 'genai', 'artificial intelligence', 'machine learning', 'copilot', 'chatgpt', 'llm', 'agents', 'agentic'],
    'Strategy': ['strategy', 'strategic', 'transformation', 'roadmap'],
    'Leadership': ['leadership', 'executive', 'c-suite', 'management', 'ceo', 'cfo'],
    'Innovation': ['innovation', 'innovative', 'disrupt', 'emerging'],
    'Data': ['data', 'analytics', 'insights', 'metrics'],
    'Change Management': ['change management', 'adoption', 'organizational change']
  }
  const themeCounts = {}
  shares.forEach(s => {
    const text = (s['ShareCommentary'] || '').toLowerCase()
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) themeCounts[theme] = (themeCounts[theme] || 0) + 1
    })
  })

  return {
    totalConnections: total,
    messaged,
    neverMessaged,
    strengthCounts: { strong, warm, cold, new: newConn },
    dormantCount: dormant,
    categoryCounts,
    topCompanies,
    yearsBuilding,
    connectionsByYear,
    engagementRate: total > 0 ? ((messaged / total) * 100).toFixed(1) : '0.0',
    neverMessagedPct: total > 0 ? ((neverMessaged / total) * 100).toFixed(0) : '0',
    skills: rawData.skills,
    topEndorsedSkills,
    topEndorsers,
    endorsementCount: rawData.endorsements.length,
    recommendationCount: rawData.recommendations.length,
    recommendations: rawData.recommendations,
    inferences: rawData.inferences,
    adtargeting: rawData.adtargeting,
    shares,
    postsByMonth,
    totalPosts: shares.length,
    firstPost: postDates.length ? new Date(Math.min(...postDates.map(d => d.getTime()))) : null,
    lastPost: postDates.length ? new Date(Math.max(...postDates.map(d => d.getTime()))) : null,
    themeCounts,
    messageCount: rawData.messages.length
  }
}

// Prepare raw data for API — only send what the AI actually needs.
// Strips: full message content (sends index only), positions, invitations, URLs, emails.
// Pre-caps connections at 1500 and shares at 100 to reduce payload size.
export function prepareDataForAPI(rawData) {
  const MAX_CONNECTIONS = 1500
  const MAX_SHARES = 100

  // Build message index (name → count + lastDate) instead of full message bodies
  const messageIndex = {}
  ;(rawData.messages || []).forEach(msg => {
    const from = (msg['FROM'] || msg['From'] || '').trim()
    const to = (msg['TO'] || msg['To'] || '').trim()
    const date = msg['DATE'] || msg['Date'] || ''

    ;[from, to].filter(Boolean).forEach(name => {
      if (!messageIndex[name]) {
        messageIndex[name] = { count: 0, lastDate: null }
      }
      messageIndex[name].count++
      if (date && (!messageIndex[name].lastDate || date > messageIndex[name].lastDate)) {
        messageIndex[name].lastDate = date
      }
    })
  })

  // Cap connections (most recent first) and strip fields the AI doesn't need
  let connections = rawData.connections || []
  if (connections.length > MAX_CONNECTIONS) {
    connections = [...connections]
      .sort((a, b) => (b['Connected On'] || '').localeCompare(a['Connected On'] || ''))
      .slice(0, MAX_CONNECTIONS)
  }
  // Strip URL and Email — AI never uses these, saves ~20K tokens
  connections = connections.map(c => {
    const { URL, 'Profile URL': _p, 'LinkedIn URL': _l, 'Email Address': _e, ...rest } = c
    return rest
  })

  // Cap shares
  let shares = rawData.shares || []
  if (shares.length > MAX_SHARES) {
    shares = shares.slice(0, MAX_SHARES)
  }

  return {
    connections,
    messageIndex,
    totalMessages: (rawData.messages || []).length,
    skills: rawData.skills || [],
    endorsements: rawData.endorsements || [],
    recommendations: rawData.recommendations || [],
    shares,
    totalShares: (rawData.shares || []).length,
    inferences: rawData.inferences || [],
    adtargeting: rawData.adtargeting || [],
    // Deliberately NOT sending: positions, invitations, raw message content
  }
}

// Legacy function for backwards compatibility
export async function parseLinkedInExport(file) {
  const { rawData, fileStatus } = await extractLinkedInZip(file)

  // Use default categories
  const defaultCategories = [
    { name: 'Recruiters', keywords: 'recruiter, talent acquisition, headhunter, staffing, sourcer' },
    { name: 'Executives', keywords: 'ceo, cfo, cto, cio, coo, cmo, chief, president, founder' },
    { name: 'Senior Leaders', keywords: 'vp, vice president, director, managing director, partner, svp, evp' },
    { name: 'Investors', keywords: 'investor, venture, private equity, vc, portfolio, angel' },
  ]

  return analyzeLinkedInData(rawData, defaultCategories)
}
