#!/usr/bin/env node

/**
 * generateSampleData.js
 *
 * One-time script that:
 * 1. Extracts the LinkedIn ZIP at docs/Complete_LinkedInDataExport_01-21-2026.zip.zip
 * 2. Parses all CSVs (replicating linkedinParser.js logic)
 * 3. Anonymizes names, companies, URLs, emails, message bodies, recommendation text, share commentary
 * 4. Runs local analysis (analyzeLinkedInData equivalent)
 * 5. Calls Claude Sonnet for full AI analysis
 * 6. Generates sample outreach messages for the #1 recommended contact
 * 7. Writes result to frontend/src/data/sampleData.json
 *
 * Usage: CLAUDE_API_KEY=sk-... node scripts/generateSampleData.js
 *   or:  source backend/.env && node scripts/generateSampleData.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import Anthropic from '@anthropic-ai/sdk'
import JSZip from 'jszip'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = join(__dirname, '..')

// Load backend .env for CLAUDE_API_KEY
dotenv.config({ path: join(ROOT, 'backend', '.env') })

const API_KEY = process.env.CLAUDE_API_KEY
if (!API_KEY) {
  console.error('ERROR: CLAUDE_API_KEY not found. Set it in backend/.env or as an env var.')
  process.exit(1)
}

// ─── Name / Company Pools ───────────────────────────────────────────────────

const FIRST_NAMES = [
  'Alex','Jordan','Morgan','Taylor','Casey','Riley','Cameron','Avery','Quinn','Parker',
  'Drew','Reese','Skyler','Blake','Jamie','Sam','Dakota','Finley','Rowan','Peyton',
  'Emerson','Sage','Hayden','Kendall','Harley','River','Phoenix','Eden','Lennox','Remy',
  'James','Sarah','Michael','Emily','David','Jessica','Chris','Amanda','Daniel','Ashley',
  'Matthew','Jennifer','Andrew','Stephanie','Joshua','Nicole','Ryan','Megan','Brian','Rachel',
  'Kevin','Lauren','Justin','Heather','Brandon','Katherine','Tyler','Samantha','Jason','Laura',
  'Nathan','Elizabeth','Mark','Rebecca','Eric','Michelle','Steven','Kimberly','Patrick','Angela',
  'Sean','Melissa','Adam','Christina','Tim','Lisa','Greg','Dana','Paul','Amy',
  'Jeff','Karen','Scott','Monica','Aaron','Diana','Derek','Wendy','Colin','Natasha',
  'Luke','Grace','Henry','Olivia','Leo','Sophia','Marcus','Aisha','Raj','Priya',
  'Wei','Mei','Carlos','Maria','Ahmed','Fatima','Yuki','Kenji','Ivan','Elena',
  'Oscar','Isabella','Hugo','Camille','Liam','Nora','Felix','Zara','Max','Leah',
  'Ethan','Chloe','Owen','Maya','Caleb','Nina','Victor','Stella','Miles','Iris',
  'Grant','Tessa','Nolan','Ada','Theo','Jade','Silas','Ivy','Dean','Ruby',
  'Troy','Pearl','Kent','Holly','Wade','Dawn','Cole','Faye','Seth','Anne',
  'Clark','Vera','Ross','June','Brent','Joy','Dale','Hope','Lane','Eve',
  'Neil','Gail','Kurt','Lynn','Todd','Ruth','Craig','Beth','Doug','Jean',
  'Keith','Diane','Carl','Joyce','Roy','Alice','Glen','Helen','Ray','Marie',
  'Alan','Susan','Don','Linda','Phil','Carol','Gary','Nancy','Tom','Debra',
  'Frank','Janet','Fred','Donna','Earl','Judy','Hank','Sandy','Wes','Rose',
]

const LAST_NAMES = [
  'Anderson','Bennett','Chen','Davis','Edwards','Fischer','Garcia','Hayes','Ishikawa','Johnson',
  'Kim','Lee','Martinez','Nakamura','Ortiz','Patel','Quinn','Rodriguez','Singh','Thompson',
  'Ueda','Vasquez','Williams','Xu','Yang','Zhang','Adams','Baker','Clark','Dixon',
  'Ellis','Foster','Grant','Harris','Irving','Jones','Kennedy','Lewis','Moore','Nash',
  'Owens','Perry','Reynolds','Scott','Turner','Underwood','Vance','Walsh','York','Zimmerman',
  'Brooks','Cooper','Dawson','Evans','Fleming','Gibson','Howard','Jackson','Kelly','Lambert',
  'Marshall','Nelson','Palmer','Reeves','Shaw','Taylor','Wade','Allen','Burke','Cross',
  'Drake','Fox','Gordon','Hunt','James','King','Logan','Mason','Noble','Price',
  'Reed','Stone','Trent','Walker','Barnes','Cole','Dean','Flynn','Hart','Jensen',
  'Lane','Mills','North','Pierce','Ross','Steele','Webb','Archer','Bell','Carr',
  'Dunn','Ford','Gray','Hill','Irwin','Joyce','Kane','Long','May','Norris',
  'Page','Riley','Stark','Todd','Vaughn','West','Young','Blair','Chase','Day',
  'Eaton','Frost','Hale','Kemp','Lynch','Marsh','Neal','Park','Rowe','Sharp',
  'Vale','Wolfe','Bloom','Craig','Doyle','Ernst','Faulk','Glenn','Holt','Judd',
  'Knox','Lowe','Mann','Noel','Otto','Penn','Rice','Snow','Troy','Voss',
  'Wise','Yates','Boone','Crane','Dane','Finch','Grove','Hicks','Ivory','Jarvis',
  'Kerr','Locke','Miles','Niles','Oakes','Pike','Rand','Sage','Thorne','Unger',
  'Vega','Wiley','Zane','Acosta','Boyd','Cain','Dyer','Engle','Floyd','Gibbs',
  'Hull','Innes','Jarrett','Kirk','Lam','Mack','Nava','Olson','Pope','Ramos',
  'Sosa','Tate','Upton','Villa','Watts','Yoder','Adler','Brock','Cooke','Duff',
]

const COMPANY_NAMES = [
  'Nexus Dynamics','Forge Analytics','Summit Partners','Cascade Systems','Pinnacle Solutions',
  'Meridian Group','Atlas Digital','Vertex Labs','Beacon Consulting','Crestview Technologies',
  'Horizon Ventures','Ember Capital','Prism Data','Stratos Inc','Lumen Advisors',
  'Keystone Global','Apex Strategy','Polaris Insights','Terra Systems','Vanguard Digital',
  'Brightpath Corp','Ironbridge Solutions','Sequoia Consulting','Cobalt Group','Evergreen Tech',
  'Granite Analytics','Sapphire Systems','Redwood Partners','Clearwater Capital','Northstar Digital',
  'Silverlake Group','Ironwood Consulting','Blueshift Labs','Greenfield Ventures','Goldcrest Corp',
  'Westfield Technologies','Eastpoint Solutions','Southgate Partners','Northgate Digital','Bridgewater Advisors',
  'Oakwood Systems','Maplewood Group','Cedarpoint Corp','Birchwood Analytics','Pinecrest Capital',
  'Ridgeview Partners','Lakeside Digital','Brookfield Technologies','Fieldstone Group','Stonewall Corp',
  'Riverdale Consulting','Hillcrest Ventures','Valleyforge Digital','Crestmont Systems','Fairview Partners',
  'Ironclad Solutions','Steelpoint Group','Copperfield Labs','Silverline Advisors','Goldpoint Corp',
  'Crossroads Digital','Milestone Partners','Cornerstone Systems','Landmark Group','Trailhead Ventures',
  'Waypoint Analytics','Basecamp Corp','Summit Digital','Zenith Labs','Altitude Partners',
  'Depth Solutions','Framework Group','Matrix Consulting','Quantum Digital','Orbital Systems',
  'Catalyst Partners','Fusion Analytics','Synergy Corp','Elevate Digital','Amplify Ventures',
  'Accelerate Group','Momentum Labs','Velocity Partners','Propel Solutions','Impact Digital',
  'Insight Consulting','Spark Ventures','Ignite Corp','Thrive Systems','Evolve Partners',
  'Adapt Analytics','Transform Group','Shift Digital','Pivot Solutions','Scale Ventures',
  'Optimize Corp','Refine Labs','Calibrate Partners','Navigate Digital','Pioneer Systems',
]

const RECOMMENDATION_TEMPLATES = [
  'I had the pleasure of working with this individual for several years. Their strategic thinking and ability to build strong relationships across teams made a significant impact on our organization. They consistently delivered results while maintaining a collaborative spirit that elevated everyone around them.',
  'An exceptional professional who brings both analytical rigor and creative problem-solving to every challenge. During our time working together, they demonstrated remarkable leadership in driving complex initiatives from concept to completion. I would enthusiastically recommend them to any organization.',
  'Working alongside this person was a highlight of my career. They have an rare ability to translate complex business problems into clear, actionable strategies. Their dedication to mentoring team members and fostering innovation made our department significantly stronger.',
  'This is someone who truly understands the intersection of technology and business strategy. They led several transformative projects during our collaboration, each time demonstrating an impressive combination of technical depth and executive presence. A trusted advisor in every sense.',
  'I was consistently impressed by their ability to navigate ambiguity and deliver clarity. They brought a unique perspective to our leadership team, combining deep industry knowledge with a forward-thinking approach to emerging challenges. A valued colleague and strategic thinker.',
  'Few professionals combine vision with execution as effectively. During our partnership, they repeatedly demonstrated the ability to identify opportunities that others missed and mobilize teams to capture them. Their impact on our organization extended well beyond their direct responsibilities.',
  'An outstanding leader who leads by example. They created an environment where innovation thrived and people felt empowered to take calculated risks. The results spoke for themselves: stronger client relationships, better team cohesion, and measurable business growth.',
  'Their expertise in driving organizational change is remarkable. They approach every challenge with empathy, strategic clarity, and a genuine commitment to helping others succeed. Working with them taught me a great deal about effective leadership in complex environments.',
]

const POST_TEMPLATES = [
  'Reflecting on the evolving landscape of professional networking and how strategic relationship management is becoming essential for career growth.',
  'Excited to share insights from a recent conversation about digital transformation and its impact on professional development.',
  'The most impactful leaders I know are those who invest consistently in their network, not just when they need something.',
  'Three lessons learned from navigating career transitions in an AI-driven economy. The rules of engagement are changing.',
  'Innovation happens at the intersection of diverse perspectives. Building a broad professional network is no longer optional.',
  'Grateful for the mentors and colleagues who have shaped my professional journey. Paying it forward is the best investment.',
  'The future of work requires a blend of technical fluency and human connection. How are you building both?',
  'Strategic networking is not about collecting connections. It is about cultivating relationships that create mutual value over time.',
  'Sharing a framework that has helped me approach professional development with more intention and less randomness.',
  'The best opportunities in my career came from relationships I maintained even when there was no immediate need. Consistency matters.',
]

// ─── Deterministic Anonymization ────────────────────────────────────────────

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const nameMap = new Map()
let nameCounter = 0

function anonymizeName(original) {
  if (!original || !original.trim()) return original
  const key = original.trim().toLowerCase()
  if (nameMap.has(key)) return nameMap.get(key)

  // Deterministic but spread across pools
  const idx = nameCounter++
  const first = FIRST_NAMES[idx % FIRST_NAMES.length]
  const last = LAST_NAMES[idx % LAST_NAMES.length]
  const result = `${first} ${last}`
  nameMap.set(key, result)
  return result
}

function anonymizeFirstLast(firstName, lastName) {
  const full = `${firstName} ${lastName}`.trim()
  if (!full) return { firstName: '', lastName: '' }
  const anon = anonymizeName(full)
  const parts = anon.split(' ')
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

const companyMap = new Map()
let companyCounter = 0

function anonymizeCompany(original) {
  if (!original || !original.trim()) return original
  const key = original.trim().toLowerCase()
  if (companyMap.has(key)) return companyMap.get(key)
  const idx = companyCounter++
  const result = COMPANY_NAMES[idx % COMPANY_NAMES.length]
  companyMap.set(key, result)
  return result
}

// ─── CSV Parsing (replicated from linkedinParser.js) ────────────────────────

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

function parseCSV(text) {
  const lines = text.split('\n')
  if (!lines.length) return []

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

function parseDate(str) {
  if (!str) return null
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const match = str.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/)
  if (match) {
    const day = parseInt(match[1])
    const month = months[match[2].toLowerCase()]
    const year = parseInt(match[3])
    if (month !== undefined) return new Date(year, month, day)
  }
  const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) return new Date(isoMatch[1], parseInt(isoMatch[2]) - 1, isoMatch[3])
  const d = new Date(str)
  return isNaN(d) ? null : d
}

// ─── ZIP Extraction ─────────────────────────────────────────────────────────

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
  shares: ['shares.csv'],
}

function getFileName(path) {
  return path.split('/').pop().toLowerCase()
}

async function extractZip(zipPath) {
  console.log(`Reading ZIP: ${zipPath}`)
  const zipBuffer = readFileSync(zipPath)
  const zip = await JSZip.loadAsync(zipBuffer)
  const zipFiles = Object.keys(zip.files)

  const rawData = {}
  for (const [dataKey, possibleNames] of Object.entries(fileMapping)) {
    const match = zipFiles.find(f => {
      const fname = getFileName(f)
      return possibleNames.some(name => fname === name.toLowerCase())
    })

    if (match && !zip.files[match].dir) {
      const content = await zip.files[match].async('text')
      rawData[dataKey] = parseCSV(content)
      console.log(`  ${dataKey}: ${rawData[dataKey].length} records`)
    } else {
      rawData[dataKey] = []
      console.log(`  ${dataKey}: not found`)
    }
  }

  return rawData
}

// ─── Anonymization ──────────────────────────────────────────────────────────

function anonymizeData(rawData) {
  console.log('\nAnonymizing data...')

  // Connections
  rawData.connections = rawData.connections.map((c, i) => {
    const { firstName, lastName } = anonymizeFirstLast(
      c['First Name'] || '', c['Last Name'] || ''
    )
    return {
      ...c,
      'First Name': firstName,
      'Last Name': lastName,
      'Company': anonymizeCompany(c['Company'] || ''),
      // Keep Position as-is (no PII, needed for category detection)
      'URL': `https://linkedin.com/in/sample-${String(i + 1).padStart(4, '0')}`,
      'Profile URL': '',
      'LinkedIn URL': '',
      'Email Address': '',
      // Keep Connected On (dates are not PII)
    }
  })
  console.log(`  Anonymized ${rawData.connections.length} connections`)

  // Messages — build index only with anonymized names, discard bodies
  const messageIndex = {}
  rawData.messages.forEach(msg => {
    const fromOrig = (msg['FROM'] || msg['From'] || '').trim()
    const toOrig = (msg['TO'] || msg['To'] || '').trim()
    const date = msg['DATE'] || msg['Date'] || ''

    ;[fromOrig, toOrig].filter(Boolean).forEach(name => {
      const anonName = anonymizeName(name)
      if (!messageIndex[anonName]) messageIndex[anonName] = { count: 0, lastDate: null }
      messageIndex[anonName].count++
      if (date && (!messageIndex[anonName].lastDate || date > messageIndex[anonName].lastDate)) {
        messageIndex[anonName].lastDate = date
      }
    })
  })
  // Replace messages with anon reconstructed records for local analysis
  const anonMessages = []
  for (const [name, data] of Object.entries(messageIndex)) {
    for (let i = 0; i < data.count; i++) {
      anonMessages.push({
        'From': i % 2 === 0 ? name : 'You',
        'To': i % 2 === 0 ? 'You' : name,
        'Date': data.lastDate || '',
      })
    }
  }
  const totalMessages = rawData.messages.length
  rawData.messages = anonMessages
  console.log(`  Anonymized messages → ${Object.keys(messageIndex).length} contacts, ${totalMessages} total`)

  // Endorsements
  rawData.endorsements = rawData.endorsements.map(e => {
    const { firstName, lastName } = anonymizeFirstLast(
      e['Endorser First Name'] || '', e['Endorser Last Name'] || ''
    )
    return {
      ...e,
      'Endorser First Name': firstName,
      'Endorser Last Name': lastName,
      // Keep Skill Name as-is
    }
  })
  console.log(`  Anonymized ${rawData.endorsements.length} endorsements`)

  // Recommendations
  rawData.recommendations = rawData.recommendations.map((r, i) => {
    const { firstName, lastName } = anonymizeFirstLast(
      r['First Name'] || r['Recommender First Name'] || '',
      r['Last Name'] || r['Recommender Last Name'] || ''
    )
    return {
      'First Name': firstName,
      'Last Name': lastName,
      'Company': anonymizeCompany(r['Company'] || ''),
      'Job Title': r['Job Title'] || r['Title'] || '',
      'Text': RECOMMENDATION_TEMPLATES[i % RECOMMENDATION_TEMPLATES.length],
      'Status': r['Status'] || 'VISIBLE',
      'Creation Date': r['Creation Date'] || '',
    }
  })
  console.log(`  Anonymized ${rawData.recommendations.length} recommendations`)

  // Shares — replace commentary
  rawData.shares = rawData.shares.map((s, i) => ({
    ...s,
    'ShareCommentary': POST_TEMPLATES[i % POST_TEMPLATES.length],
    'ShareLink': '',
  }))
  console.log(`  Anonymized ${rawData.shares.length} shares`)

  // Skills, inferences, adtargeting — keep as-is (no PII)
  console.log(`  Skills: ${rawData.skills.length} (kept as-is)`)
  console.log(`  Inferences: ${rawData.inferences.length} (kept as-is)`)
  console.log(`  Ad targeting: ${rawData.adtargeting.length} (kept as-is)`)

  return rawData
}

// ─── Local Analysis (replicates linkedinParser.js analyzeLinkedInData) ──────

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

function calcRelStrength(msgCount, connDate) {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime())
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  if (msgCount >= 3) return 'strong'
  if (msgCount >= 1) return 'warm'
  if (connDate && connDate > sixMonthsAgo) return 'new'
  return 'cold'
}

function checkDormancy(lastContact, connectedOn) {
  const lastDate = parseDate(lastContact) || parseDate(connectedOn)
  if (!lastDate) return false
  return (new Date() - lastDate) / (1000 * 60 * 60 * 24 * 30) > 12
}

function matchesCategory(position, company, keywords) {
  const text = `${position} ${company}`.toLowerCase()
  return keywords.some(kw => text.includes(kw.toLowerCase()))
}

function analyzeLinkedInData(rawData) {
  const defaultCategories = [
    { name: 'Recruiters', keywords: ['recruiter', 'talent acquisition', 'headhunter', 'staffing', 'sourcer'] },
    { name: 'Executives', keywords: ['ceo', 'cfo', 'cto', 'cio', 'coo', 'cmo', 'chief', 'president', 'founder'] },
    { name: 'Senior Leaders', keywords: ['vp', 'vice president', 'director', 'managing director', 'partner', 'svp', 'evp'] },
    { name: 'Investors', keywords: ['investor', 'venture', 'private equity', 'vc', 'portfolio', 'angel'] },
  ]

  const messageIndex = buildMessageIndex(rawData.messages)
  const endorserIndex = buildEndorserIndex(rawData.endorsements)
  const companyIndex = {}

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

    const categories = {}
    defaultCategories.forEach(cat => {
      categories[cat.name] = matchesCategory(position, company, cat.keywords)
    })

    const relStrength = calcRelStrength(msgHistory.count, connectedDate)
    const isDormant = checkDormancy(msgHistory.lastDate, connectedOn)

    return {
      id: `sample-${hashCode(name)}-${hashCode(company)}`,
      name, firstName, lastName, position, company, linkedInUrl, email,
      connectedOn, connectedDate,
      messageCount: msgHistory.count,
      lastContact: msgHistory.lastDate,
      relStrength, categories, isDormant,
      endorsedSkills: endorsed.skills,
      endorsementCount: endorsed.count,
    }
  })

  const analytics = buildAnalytics(enrichedContacts, rawData, companyIndex, endorserIndex, defaultCategories)
  return { contacts: enrichedContacts, analytics }
}

function buildAnalytics(contacts, rawData, companyIndex, endorserIndex, categories) {
  const total = contacts.length
  const messaged = contacts.filter(c => c.messageCount > 0).length
  const neverMessaged = total - messaged
  const strong = contacts.filter(c => c.relStrength === 'strong').length
  const warm = contacts.filter(c => c.relStrength === 'warm').length
  const cold = contacts.filter(c => c.relStrength === 'cold').length
  const newConn = contacts.filter(c => c.relStrength === 'new').length
  const dormant = contacts.filter(c => c.isDormant).length

  const categoryCounts = {}
  categories.forEach(cat => {
    categoryCounts[cat.name] = contacts.filter(c => c.categories?.[cat.name]).length
  })

  const topCompanies = Object.entries(companyIndex)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})

  const dates = contacts.map(c => c.connectedDate).filter(Boolean)
  const minYear = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))).getFullYear() : new Date().getFullYear()
  const yearsBuilding = new Date().getFullYear() - minYear

  const connectionsByYear = {}
  contacts.forEach(c => {
    if (c.connectedDate) {
      const y = c.connectedDate.getFullYear()
      connectionsByYear[y] = (connectionsByYear[y] || 0) + 1
    }
  })

  const skillCounts = {}
  rawData.endorsements.forEach(e => {
    const skill = e['Skill Name'] || ''
    if (skill) skillCounts[skill] = (skillCounts[skill] || 0) + 1
  })
  const topEndorsedSkills = Object.entries(skillCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const topEndorsers = Object.entries(endorserIndex).sort((a, b) => b[1].count - a[1].count).slice(0, 10)

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

  const themeKeywords = {
    'AI/GenAI': ['ai', 'genai', 'artificial intelligence', 'machine learning', 'copilot', 'chatgpt', 'llm', 'agents', 'agentic'],
    'Strategy': ['strategy', 'strategic', 'transformation', 'roadmap'],
    'Leadership': ['leadership', 'executive', 'c-suite', 'management', 'ceo', 'cfo'],
    'Innovation': ['innovation', 'innovative', 'disrupt', 'emerging'],
    'Data': ['data', 'analytics', 'insights', 'metrics'],
    'Change Management': ['change management', 'adoption', 'organizational change'],
  }
  const themeCounts = {}
  shares.forEach(s => {
    const text = (s['ShareCommentary'] || '').toLowerCase()
    Object.entries(themeKeywords).forEach(([theme, keywords]) => {
      if (keywords.some(kw => text.includes(kw))) themeCounts[theme] = (themeCounts[theme] || 0) + 1
    })
  })

  return {
    totalConnections: total, messaged, neverMessaged,
    strengthCounts: { strong, warm, cold, new: newConn },
    dormantCount: dormant, categoryCounts, topCompanies,
    yearsBuilding, connectionsByYear,
    engagementRate: total > 0 ? ((messaged / total) * 100).toFixed(1) : '0.0',
    neverMessagedPct: total > 0 ? ((neverMessaged / total) * 100).toFixed(0) : '0',
    skills: rawData.skills,
    topEndorsedSkills, topEndorsers,
    endorsementCount: rawData.endorsements.length,
    recommendationCount: rawData.recommendations.length,
    recommendations: rawData.recommendations,
    inferences: rawData.inferences,
    adtargeting: rawData.adtargeting,
    shares, postsByMonth,
    totalPosts: shares.length,
    firstPost: postDates.length ? new Date(Math.min(...postDates.map(d => d.getTime()))) : null,
    lastPost: postDates.length ? new Date(Math.max(...postDates.map(d => d.getTime()))) : null,
    themeCounts,
    messageCount: rawData.messages.length,
  }
}

// ─── AI Analysis (replicates ingestionPrompt.js logic) ──────────────────────

function prepareDataForAI(rawData) {
  const MAX_CONNECTIONS = 1500
  const MAX_SHARES = 100

  const summary = {
    data_files_present: [],
    data_files_missing: [],
  }

  const fileChecks = [
    { key: 'connections', label: 'Connections.csv' },
    { key: 'skills', label: 'Skills.csv' },
    { key: 'endorsements', label: 'Endorsement_Received_Info.csv' },
    { key: 'recommendations', label: 'Recommendations_Received.csv' },
    { key: 'adtargeting', label: 'Ad_Targeting.csv' },
    { key: 'inferences', label: 'Inferences_about_you.csv' },
    { key: 'shares', label: 'Shares.csv' },
  ]

  // Messages
  const messageIndex = {}
  ;(rawData.messages || []).forEach(msg => {
    const from = (msg['FROM'] || msg['From'] || '').trim()
    const to = (msg['TO'] || msg['To'] || '').trim()
    const date = msg['DATE'] || msg['Date'] || ''
    ;[from, to].filter(Boolean).forEach(name => {
      if (!messageIndex[name]) messageIndex[name] = { message_count: 0, last_message_date: null }
      messageIndex[name].message_count++
      if (date && (!messageIndex[name].last_message_date || date > messageIndex[name].last_message_date)) {
        messageIndex[name].last_message_date = date
      }
    })
  })

  if (Object.keys(messageIndex).length > 0) {
    summary.data_files_present.push('Messages.csv')
  } else {
    summary.data_files_missing.push('Messages.csv')
  }

  for (const { key, label } of fileChecks) {
    if (rawData[key]?.length > 0) {
      summary.data_files_present.push(label)
    } else {
      summary.data_files_missing.push(label)
    }
  }

  // Connections
  let connections = rawData.connections || []
  if (connections.length > MAX_CONNECTIONS) {
    connections = [...connections].sort((a, b) => (b['Connected On'] || '').localeCompare(a['Connected On'] || '')).slice(0, MAX_CONNECTIONS)
    summary.connections_note = { total_count: rawData.connections.length, sent_count: MAX_CONNECTIONS, note: `Network has ${rawData.connections.length} connections. Sending the ${MAX_CONNECTIONS} most recent.` }
  }
  connections = connections.map(c => {
    const { URL, 'Profile URL': _p, 'LinkedIn URL': _l, 'Email Address': _e, ...rest } = c
    return rest
  })
  summary.connections = connections

  summary.message_index = messageIndex
  summary.total_messages = rawData.messages?.length || 0
  summary.skills = rawData.skills || []
  summary.endorsements = rawData.endorsements || []
  summary.recommendations = rawData.recommendations || []

  const shares = rawData.shares || []
  summary.shares = shares.length > MAX_SHARES ? shares.slice(0, MAX_SHARES) : shares
  if (shares.length > MAX_SHARES) summary.shares_note = `Showing ${MAX_SHARES} of ${shares.length} total posts.`
  summary.total_posts = shares.length
  summary.inferences = rawData.inferences || []
  summary.adtargeting = rawData.adtargeting || []

  return summary
}

function toPipeDelimited(records, fields) {
  if (!records.length) return ''
  const header = fields.join('|')
  const rows = records.map(r => fields.map(f => (r[f] || '').toString().replace(/\|/g, '/').replace(/\n/g, ' ')).join('|'))
  return header + '\n' + rows.join('\n')
}

function buildIngestionPrompt(dataSummary, userContext) {
  let systemPrompt
  try {
    systemPrompt = readFileSync(join(ROOT, 'docs', 'LiVE_Pro_AI_Ingestion_Prompt.md'), 'utf-8')
  } catch {
    systemPrompt = 'You are the analytics engine behind LiVE Pro. Analyze the provided LinkedIn data and return structured JSON. Return only valid JSON.'
  }

  let userMessage = ''
  if (userContext) userMessage += `## About This User\n\n${userContext}\n\n---\n\n`

  userMessage += `## LinkedIn Data Export\n\n`
  userMessage += `**Files present:** ${dataSummary.data_files_present.join(', ')}\n`
  userMessage += `**Files missing:** ${dataSummary.data_files_missing.join(', ') || 'None'}\n\n`

  if (dataSummary.connections_note) userMessage += `**Note:** ${dataSummary.connections_note.note}\n\n`

  const connFields = ['First Name', 'Last Name', 'Position', 'Company', 'Connected On']
  userMessage += `### Connections (${dataSummary.connections.length} records, pipe-delimited)\n\`\`\`\n${toPipeDelimited(dataSummary.connections, connFields)}\n\`\`\`\n\n`

  const msgEntries = Object.entries(dataSummary.message_index).map(([name, d]) => ({
    Name: name, Count: d.message_count, LastDate: d.last_message_date || ''
  }))
  userMessage += `### Message Index (${msgEntries.length} unique contacts, ${dataSummary.total_messages} total messages, pipe-delimited)\n\`\`\`\n${toPipeDelimited(msgEntries, ['Name', 'Count', 'LastDate'])}\n\`\`\`\n\n`

  if (dataSummary.skills.length > 0) userMessage += `### Skills (${dataSummary.skills.length})\n\`\`\`json\n${JSON.stringify(dataSummary.skills, null, 0)}\n\`\`\`\n\n`
  if (dataSummary.endorsements.length > 0) {
    const endFields = ['Endorser First Name', 'Endorser Last Name', 'Skill Name']
    userMessage += `### Endorsements (${dataSummary.endorsements.length}, pipe-delimited)\n\`\`\`\n${toPipeDelimited(dataSummary.endorsements, endFields)}\n\`\`\`\n\n`
  }
  if (dataSummary.recommendations.length > 0) userMessage += `### Recommendations (${dataSummary.recommendations.length})\n\`\`\`json\n${JSON.stringify(dataSummary.recommendations, null, 0)}\n\`\`\`\n\n`
  if (dataSummary.shares.length > 0) userMessage += `### Posts/Shares (${dataSummary.shares.length}${dataSummary.shares_note ? ' — ' + dataSummary.shares_note : ''})\n\`\`\`json\n${JSON.stringify(dataSummary.shares, null, 0)}\n\`\`\`\n\n`
  if (dataSummary.inferences.length > 0) userMessage += `### Inferences About You (${dataSummary.inferences.length})\n\`\`\`json\n${JSON.stringify(dataSummary.inferences, null, 0)}\n\`\`\`\n\n`
  if (dataSummary.adtargeting.length > 0) userMessage += `### Ad Targeting Data (${dataSummary.adtargeting.length})\n\`\`\`json\n${JSON.stringify(dataSummary.adtargeting, null, 0)}\n\`\`\`\n\n`

  userMessage += `\n---\n\nPlease analyze all of this data and return the JSON response as specified in your instructions. For screens 1-6, return ONLY the editorial insight fields — no computed stats, hero numbers, or chart datasets (the frontend computes those locally). For screens 7-8 (Priorities + LinkedIn's View), return the full AI-generated output. Skip Screen 9 (all_contacts). IMPORTANT: All text values must be plain text — do NOT use markdown formatting (no **bold**, no *italics*, no bullet markers). Return ONLY valid JSON — no markdown, no commentary outside the JSON object.`

  return { systemPrompt, userMessage }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const zipPath = join(ROOT, 'docs', 'Complete_LinkedInDataExport_01-21-2026.zip.zip')

  // Step 1: Extract ZIP
  let rawData = await extractZip(zipPath)

  // Step 2: Anonymize
  rawData = anonymizeData(rawData)

  // Step 3: Run local analysis
  console.log('\nRunning local analysis...')
  const { contacts, analytics } = analyzeLinkedInData(rawData)
  console.log(`  ${contacts.length} enriched contacts`)
  console.log(`  ${analytics.totalConnections} total, ${analytics.dormantCount} dormant`)

  // Step 4: Call Claude Sonnet for AI analysis
  console.log('\nCalling Claude Sonnet for AI analysis...')
  const client = new Anthropic({ apiKey: API_KEY })
  const dataSummary = prepareDataForAI(rawData)
  const userContext = 'A senior professional exploring strategic networking opportunities, focused on technology leadership and business development. Looking to reactivate dormant relationships and identify high-value connections for career growth.'
  const { systemPrompt, userMessage } = buildIngestionPrompt(dataSummary, userContext)

  const analysisResponse = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  console.log(`  Tokens: ${analysisResponse.usage?.input_tokens} in, ${analysisResponse.usage?.output_tokens} out`)

  let aiText = analysisResponse.content[0].text
  // Strip code fences
  const fenceMatch = aiText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) aiText = fenceMatch[1]
  else if (aiText.startsWith('```')) aiText = aiText.replace(/^```(?:json)?\s*/, '')
  aiText = aiText.trim()

  let aiAnalysis
  try {
    aiAnalysis = JSON.parse(aiText)
  } catch (e) {
    console.error('Failed to parse AI response:', e.message)
    console.error('First 500 chars:', aiText.substring(0, 500))
    process.exit(1)
  }

  // Wrap in screens if needed
  if (!aiAnalysis.screens) {
    const screenKeys = ['summary', 'network', 'relationships', 'skills_expertise', 'your_content', 'your_advocates', 'priorities', 'linkedins_view']
    const hasScreenKeys = screenKeys.some(k => aiAnalysis[k])
    if (hasScreenKeys) {
      const screens = {}
      for (const key of screenKeys) {
        if (aiAnalysis[key]) { screens[key] = aiAnalysis[key]; delete aiAnalysis[key] }
      }
      aiAnalysis = { ...aiAnalysis, screens }
    }
  }

  console.log('  AI analysis parsed successfully')
  console.log(`  Screens: ${Object.keys(aiAnalysis.screens || {}).join(', ')}`)

  // Step 5: Generate sample outreach messages
  console.log('\nGenerating sample outreach messages...')
  const priorities = aiAnalysis.screens?.priorities?.outreach_priorities || []
  const topContact = priorities[0]

  let sampleMessages = null
  if (topContact) {
    const outreachPrompt = `You are an expert at writing LinkedIn outreach messages that get responses. Generate exactly 2 message variants for the following contact.

CONTACT:
Name: ${topContact.name}
Position: ${topContact.title || 'Unknown'}
Company: ${topContact.company || 'Unknown'}
Relationship: ${topContact.relationship_strength || 'Unknown'}
${topContact.why_prioritized ? `Why prioritized: ${topContact.why_prioritized}` : ''}

USER'S GOAL:
Exploring partnership opportunities and strengthening strategic relationships in the technology leadership space.

RULES:
- Each message should be 2-4 short paragraphs, suitable for LinkedIn messaging
- Variant A: More direct and professional
- Variant B: More warm and conversational
- Reference specific details about the contact when possible
- End each with a clear, low-pressure call to action
- Do NOT use generic templates — make each feel personal
- Keep each message under 300 words

Respond with ONLY valid JSON in this exact format:
{
  "variant_a": { "subject": "short subject line", "body": "full message text" },
  "variant_b": { "subject": "short subject line", "body": "full message text" }
}`

    const msgResponse = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [{ role: 'user', content: outreachPrompt }],
    })

    let msgText = msgResponse.content[0].text
    const msgFence = msgText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (msgFence) msgText = msgFence[1]
    else if (msgText.startsWith('```')) msgText = msgText.replace(/^```(?:json)?\s*/, '')
    msgText = msgText.trim()

    try {
      const parsedMessages = JSON.parse(msgText)
      sampleMessages = {
        contact: {
          name: topContact.name,
          position: topContact.title || '',
          company: topContact.company || '',
          relationship: topContact.relationship_strength || '',
          whyPrioritized: topContact.why_prioritized || '',
        },
        userContext: 'Exploring partnership opportunities and strengthening strategic relationships in the technology leadership space.',
        messages: parsedMessages,
      }
      console.log(`  Generated messages for ${topContact.name}`)
    } catch (e) {
      console.error('  Failed to parse outreach messages:', e.message)
    }
  } else {
    console.log('  No top contact found for outreach messages')
  }

  // Step 6: Write output
  const output = {
    contacts,
    analytics,
    aiAnalysis,
    sampleMessages,
  }

  const outPath = join(ROOT, 'frontend', 'src', 'data', 'sampleData.json')
  writeFileSync(outPath, JSON.stringify(output, null, 2))
  const sizeKB = Math.round(readFileSync(outPath).length / 1024)
  console.log(`\nWritten to ${outPath} (${sizeKB} KB)`)
  console.log('Done!')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
