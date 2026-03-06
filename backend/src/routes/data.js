import { Router } from 'express'
import { createUserClient, supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'
import { getUserTier } from '../services/usage.js'

const router = Router()

// Import connections (for cloud sync users)
router.post('/import', requireAuth, async (req, res, next) => {
  try {
    const { connections } = req.body
    const userId = req.user.id

    if (!connections || !Array.isArray(connections)) {
      return res.status(400).json({ error: 'Connections array required' })
    }

    // Delete existing connections for this user
    await supabaseAdmin
      .from('connections')
      .delete()
      .eq('user_id', userId)

    // Insert new connections in batches
    const batchSize = 100
    for (let i = 0; i < connections.length; i += batchSize) {
      const batch = connections.slice(i, i + batchSize).map(c => ({
        user_id: userId,
        name: c.name,
        first_name: c.firstName,
        last_name: c.lastName,
        position: c.position,
        company: c.company,
        linkedin_url: c.linkedInUrl,
        connected_on: c.connectedOn,
        message_count: c.messageCount || 0,
        rel_strength: c.relStrength,
        is_dormant: c.isDormant,
        endorsement_count: c.endorsementCount || 0,
        categories: c.categories || {},
      }))

      const { error } = await supabaseAdmin
        .from('connections')
        .insert(batch)

      if (error) {
        console.error('Batch insert error:', error)
      }
    }

    // Update network analysis
    await updateNetworkAnalysis(userId, connections)

    res.json({
      success: true,
      imported: connections.length,
    })
  } catch (err) {
    next(err)
  }
})

// Get connections
// Supabase caps results at 1000 rows per request, so we paginate
// internally when more are requested.
router.get('/connections', requireAuth, async (req, res, next) => {
  try {
    const { search, strength } = req.query
    const limit = parseInt(req.query.limit) || 100
    const offset = parseInt(req.query.offset) || 0
    const supabase = createUserClient(req.accessToken)

    const PAGE_SIZE = 1000
    let allData = []
    let fetched = 0
    let currentOffset = offset

    while (fetched < limit) {
      const batchSize = Math.min(PAGE_SIZE, limit - fetched)
      let query = supabase
        .from('connections')
        .select('*')
        .eq('user_id', req.user.id)
        .range(currentOffset, currentOffset + batchSize - 1)

      if (search) {
        const sanitized = search.replace(/[,.()"\\%_]/g, '')
        query = query.or(`name.ilike.%${sanitized}%,company.ilike.%${sanitized}%,position.ilike.%${sanitized}%`)
      }

      if (strength) {
        query = query.eq('rel_strength', strength)
      }

      const { data, error } = await query

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      allData = allData.concat(data || [])
      fetched += (data || []).length
      currentOffset += batchSize

      // If we got fewer rows than requested, there are no more
      if (!data || data.length < batchSize) break
    }

    res.json({ connections: allData })
  } catch (err) {
    next(err)
  }
})

// Get network stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const supabase = createUserClient(req.accessToken)

    const { data: analysis, error } = await supabase
      .from('network_analysis')
      .select('*')
      .eq('user_id', req.user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      return res.status(400).json({ error: error.message })
    }

    res.json({ stats: analysis || null })
  } catch (err) {
    next(err)
  }
})

// Archive current analysis, then delete active data
router.post('/archive', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id

    // Get current AI analysis
    const { data: insights } = await supabaseAdmin
      .from('ai_insights')
      .select('content')
      .eq('user_id', userId)
      .eq('insight_type', 'full_analysis')
      .order('created_at', { ascending: false })
      .limit(1)

    // Get current network analysis
    const { data: networkAnalysis } = await supabaseAdmin
      .from('network_analysis')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(r => r)
      .catch(() => ({ data: null }))

    // ai_insights.content is stored as JSON.stringify(obj), so parse it back
    let aiAnalysis = null
    if (insights?.[0]?.content) {
      try {
        aiAnalysis = typeof insights[0].content === 'string'
          ? JSON.parse(insights[0].content)
          : insights[0].content
      } catch {
        aiAnalysis = insights[0].content
      }
    }
    const connectionCount = networkAnalysis?.total_connections || 0
    const analyticsSummary = networkAnalysis ? {
      total_connections: networkAnalysis.total_connections,
      strength_breakdown: networkAnalysis.strength_breakdown,
      dormant_count: networkAnalysis.dormant_count,
      engagement_rate: networkAnalysis.engagement_rate,
      years_building: networkAnalysis.years_building,
    } : null

    // Only archive if there's something to archive
    if (aiAnalysis || connectionCount > 0) {
      await supabaseAdmin.from('analysis_archives').insert({
        user_id: userId,
        connection_count: connectionCount,
        ai_analysis: aiAnalysis,
        analytics_summary: analyticsSummary,
      })
    }

    // Delete active data
    await supabaseAdmin.from('ai_insights').delete().eq('user_id', userId)
    await supabaseAdmin.from('connections').delete().eq('user_id', userId)
    await supabaseAdmin.from('network_analysis').delete().eq('user_id', userId)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// Get analysis archives
router.get('/archives', requireAuth, async (req, res, next) => {
  try {
    const { data: archives, error } = await supabaseAdmin
      .from('analysis_archives')
      .select('id, connection_count, ai_analysis, analytics_summary, archived_at')
      .eq('user_id', req.user.id)
      .order('archived_at', { ascending: false })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ archives: archives || [] })
  } catch (err) {
    next(err)
  }
})

// Delete all user data (active + archives — permanent)
router.delete('/all', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id

    // Delete in order due to foreign keys
    await supabaseAdmin.from('ai_insights').delete().eq('user_id', userId)
    await supabaseAdmin.from('connections').delete().eq('user_id', userId)
    await supabaseAdmin.from('network_analysis').delete().eq('user_id', userId)
    await supabaseAdmin.from('usage_quotas').delete().eq('user_id', userId)
    await supabaseAdmin.from('custom_categories').delete().eq('user_id', userId)
    await supabaseAdmin.from('job_applications').delete().eq('user_id', userId)
    await supabaseAdmin.from('engagement_tracker').delete().eq('user_id', userId)
    await supabaseAdmin.from('analysis_archives').delete().eq('user_id', userId)

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// =============================================
// ANALYTICS CACHE — persist supplementary data
// (skills, endorsements, recommendations, shares,
//  inferences, adtargeting) so reload doesn't lose them
// =============================================

// Save analytics cache
router.post('/analytics-cache', requireAuth, async (req, res, next) => {
  try {
    const { analytics } = req.body
    const userId = req.user.id

    if (!analytics || typeof analytics !== 'object') {
      return res.status(400).json({ error: 'Analytics object required' })
    }

    // Delete any existing analytics cache for this user
    await supabaseAdmin
      .from('ai_insights')
      .delete()
      .eq('user_id', userId)
      .eq('insight_type', 'analytics_cache')

    // Insert new cache
    const { error } = await supabaseAdmin
      .from('ai_insights')
      .insert({
        user_id: userId,
        insight_type: 'analytics_cache',
        content: JSON.stringify(analytics),
        metadata: { cached_at: new Date().toISOString() },
      })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// Get analytics cache
router.get('/analytics-cache', requireAuth, async (req, res, next) => {
  try {
    const { data: row, error } = await supabaseAdmin
      .from('ai_insights')
      .select('content')
      .eq('user_id', req.user.id)
      .eq('insight_type', 'analytics_cache')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code === 'PGRST116') {
      return res.json({ analytics: null })
    }
    if (error) {
      return res.status(400).json({ error: error.message })
    }

    let analytics = null
    if (row?.content) {
      analytics = typeof row.content === 'string'
        ? JSON.parse(row.content)
        : row.content
    }

    res.json({ analytics })
  } catch (err) {
    next(err)
  }
})

// =============================================
// JOB APPLICATIONS WORKSPACE
// =============================================

const APPLICATION_STATUSES = ['saved', 'applied', 'screen', 'interview', 'final', 'offer', 'rejected', 'withdrawn', 'closed']
const APPLICATION_SOURCES = ['linkedin_export', 'external_manual', 'external_url']

function parseDateLoose(value) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function toSlug(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeCompanyName(name) {
  return (name || '').trim()
}

function sanitizeText(value, max = 5000) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (!text) return null
  return text.slice(0, max)
}

function createExternalKey({ source, jobUrl, companyName, jobTitle, applicationDate, savedDate }) {
  const canonicalUrl = sanitizeText(jobUrl, 1000)?.toLowerCase()
  if (canonicalUrl) return `${source}|url|${canonicalUrl}`
  return `${source}|${toSlug(companyName)}|${toSlug(jobTitle)}|${applicationDate || savedDate || 'unknown'}`
}

function parseScreeningSummary(questionAndAnswers) {
  const raw = sanitizeText(questionAndAnswers, 10000)
  if (!raw) return { questionCount: null, screeningSummary: null }
  const segments = raw.split('|').map(s => s.trim()).filter(Boolean)
  const preview = segments.slice(0, 3).join(' | ')
  return {
    questionCount: segments.length || null,
    screeningSummary: preview || null,
  }
}

function parseJobUrl(inputUrl) {
  try {
    const parsed = new URL(inputUrl)
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase()
    const pathname = parsed.pathname || ''
    const segments = pathname.split('/').filter(Boolean)
    const siteName = hostname.split('.').slice(0, -1).join('.') || hostname.split('.')[0]
    const inferredCompany = siteName
      ? siteName.split(/[-_.]/).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
      : null

    let inferredTitle = null
    const lastSegment = segments[segments.length - 1] || ''
    if (lastSegment && !/^\d+$/.test(lastSegment)) {
      inferredTitle = decodeURIComponent(lastSegment)
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const isLinkedIn = hostname.includes('linkedin.com')
    return {
      jobUrl: parsed.toString(),
      companyWebsite: isLinkedIn ? null : `${parsed.protocol}//${parsed.hostname}`,
      inferredCompany: isLinkedIn ? null : inferredCompany,
      inferredTitle: inferredTitle || null,
      confidence: isLinkedIn ? 'low' : 'medium',
      note: isLinkedIn
        ? 'LinkedIn job links usually do not include a reliable company website. Add company website manually if needed.'
        : 'Parsed from URL structure. Please confirm before saving.',
    }
  } catch {
    return null
  }
}

function mapLinkedInApplicationRow(row) {
  const source = 'linkedin_export'
  const companyName = normalizeCompanyName(row['Company Name'] || row.Company || '')
  const jobTitle = sanitizeText(row['Job Title'] || row.Title || '', 500) || 'Unknown role'
  const jobUrl = sanitizeText(row['Job Url'] || row['Job URL'] || row.url || '', 1000)
  const applicationDate = parseDateLoose(row['Application Date'] || row['Applied On'] || row['Date Applied'])
  const resumeName = sanitizeText(row['Resume Name'] || row['Resume'], 500)
  const { questionCount, screeningSummary } = parseScreeningSummary(row['Question And Answers'])

  return {
    source,
    company_name: companyName || 'Unknown company',
    job_title: jobTitle,
    job_url: jobUrl,
    status: 'applied',
    application_date: applicationDate,
    resume_name: resumeName,
    question_count: questionCount,
    screening_summary: screeningSummary,
    external_key: createExternalKey({
      source,
      jobUrl,
      companyName,
      jobTitle,
      applicationDate,
      savedDate: null,
    }),
    metadata: { imported_from: 'linkedin_job_applications' },
  }
}

function mapLinkedInSavedJobRow(row) {
  const source = 'linkedin_export'
  const companyName = normalizeCompanyName(row['Company Name'] || row.Company || '')
  const jobTitle = sanitizeText(row['Job Title'] || row.Title || '', 500) || 'Unknown role'
  const jobUrl = sanitizeText(row['Job Url'] || row['Job URL'] || row.url || '', 1000)
  const savedDate = parseDateLoose(row['Saved Date'] || row['Date Saved'])

  return {
    source,
    company_name: companyName || 'Unknown company',
    job_title: jobTitle,
    job_url: jobUrl,
    status: 'saved',
    saved_date: savedDate,
    external_key: createExternalKey({
      source,
      jobUrl,
      companyName,
      jobTitle,
      applicationDate: null,
      savedDate,
    }),
    metadata: { imported_from: 'linkedin_saved_jobs' },
  }
}

router.get('/job-applications', requireAuth, async (req, res, next) => {
  try {
    const { status, source, q, follow_up_due, date_from, date_to, limit } = req.query
    let query = supabaseAdmin
      .from('job_applications')
      .select('*')
      .eq('user_id', req.user.id)
      .order('application_date', { ascending: false, nullsFirst: false })
      .order('saved_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (status && APPLICATION_STATUSES.includes(status)) query = query.eq('status', status)
    if (source && APPLICATION_SOURCES.includes(source)) query = query.eq('source', source)
    if (q) {
      const sanitized = String(q).replace(/[,.()"\\%_]/g, '')
      query = query.or(`company_name.ilike.%${sanitized}%,job_title.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`)
    }
    if (follow_up_due === 'true') query = query.lte('follow_up_date', new Date().toISOString().slice(0, 10))
    if (date_from) query = query.gte('application_date', date_from)
    if (date_to) query = query.lte('application_date', date_to)
    if (limit) query = query.limit(Math.min(parseInt(limit, 10) || 200, 1000))

    const { data, error } = await query
    if (error) return res.status(400).json({ error: error.message })
    res.json({ entries: data || [] })
  } catch (err) {
    next(err)
  }
})

router.post('/job-applications/import', requireAuth, async (req, res, next) => {
  try {
    const jobApplications = Array.isArray(req.body?.jobApplications) ? req.body.jobApplications : []
    const savedJobs = Array.isArray(req.body?.savedJobs) ? req.body.savedJobs : []
    const userId = req.user.id

    const rows = [
      ...jobApplications.map(mapLinkedInApplicationRow),
      ...savedJobs.map(mapLinkedInSavedJobRow),
    ].map(row => ({ ...row, user_id: userId }))

    if (rows.length === 0) return res.json({ imported: 0, entries: [] })

    const { data, error } = await supabaseAdmin
      .from('job_applications')
      .upsert(rows, { onConflict: 'user_id,external_key' })
      .select('id')

    if (error) return res.status(400).json({ error: error.message })
    res.json({ imported: data?.length || rows.length, entries: data || [] })
  } catch (err) {
    next(err)
  }
})

router.post('/job-applications/parse-url', requireAuth, async (req, res, next) => {
  try {
    const url = sanitizeText(req.body?.url, 1500)
    if (!url) return res.status(400).json({ error: 'url is required' })
    const parsed = parseJobUrl(url)
    if (!parsed) return res.status(400).json({ error: 'Unable to parse URL' })
    res.json({ parsed })
  } catch (err) {
    next(err)
  }
})

router.post('/job-applications', requireAuth, async (req, res, next) => {
  try {
    const source = APPLICATION_SOURCES.includes(req.body?.source) ? req.body.source : 'external_manual'
    const companyName = normalizeCompanyName(req.body?.company_name || req.body?.companyName || '')
    const jobTitle = sanitizeText(req.body?.job_title || req.body?.jobTitle || '', 500)
    const jobUrl = sanitizeText(req.body?.job_url || req.body?.jobUrl, 1000)
    const status = APPLICATION_STATUSES.includes(req.body?.status) ? req.body.status : 'applied'
    const appliedVia = sanitizeText(req.body?.applied_via || req.body?.appliedVia, 200)
    const applicationDate = parseDateLoose(req.body?.application_date || req.body?.applicationDate)
    const savedDate = parseDateLoose(req.body?.saved_date || req.body?.savedDate)

    if (!companyName || !jobTitle) {
      return res.status(400).json({ error: 'company_name and job_title are required' })
    }

    const payload = {
      user_id: req.user.id,
      source,
      company_name: companyName,
      company_website: sanitizeText(req.body?.company_website || req.body?.companyWebsite, 500),
      job_title: jobTitle,
      job_url: jobUrl,
      location: sanitizeText(req.body?.location, 200),
      status,
      applied_via: appliedVia,
      application_date: applicationDate,
      saved_date: savedDate,
      follow_up_date: sanitizeText(req.body?.follow_up_date || req.body?.followUpDate, 20),
      hiring_manager: sanitizeText(req.body?.hiring_manager || req.body?.hiringManager, 200),
      recruiter_name: sanitizeText(req.body?.recruiter_name || req.body?.recruiterName, 200),
      recruiter_contact: sanitizeText(req.body?.recruiter_contact || req.body?.recruiterContact, 200),
      resume_name: sanitizeText(req.body?.resume_name || req.body?.resumeName, 500),
      question_count: Number.isFinite(req.body?.question_count) ? req.body.question_count : null,
      screening_summary: sanitizeText(req.body?.screening_summary || req.body?.screeningSummary, 1000),
      notes: sanitizeText(req.body?.notes, 3000),
      metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {},
      external_key: createExternalKey({
        source,
        jobUrl,
        companyName,
        jobTitle,
        applicationDate,
        savedDate,
      }),
      last_action_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabaseAdmin
      .from('job_applications')
      .upsert(payload, { onConflict: 'user_id,external_key' })
      .select('*')
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ entry: data })
  } catch (err) {
    next(err)
  }
})

router.patch('/job-applications/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const updates = {
      updated_at: new Date().toISOString(),
      last_action_at: new Date().toISOString(),
    }

    if (req.body?.status && APPLICATION_STATUSES.includes(req.body.status)) updates.status = req.body.status
    if (req.body?.company_name !== undefined) updates.company_name = sanitizeText(req.body.company_name, 500)
    if (req.body?.company_website !== undefined) updates.company_website = sanitizeText(req.body.company_website, 500)
    if (req.body?.job_title !== undefined) updates.job_title = sanitizeText(req.body.job_title, 500)
    if (req.body?.job_url !== undefined) updates.job_url = sanitizeText(req.body.job_url, 1000)
    if (req.body?.location !== undefined) updates.location = sanitizeText(req.body.location, 200)
    if (req.body?.applied_via !== undefined) updates.applied_via = sanitizeText(req.body.applied_via, 200)
    if (req.body?.application_date !== undefined) updates.application_date = parseDateLoose(req.body.application_date)
    if (req.body?.saved_date !== undefined) updates.saved_date = parseDateLoose(req.body.saved_date)
    if (req.body?.follow_up_date !== undefined) updates.follow_up_date = sanitizeText(req.body.follow_up_date, 20)
    if (req.body?.hiring_manager !== undefined) updates.hiring_manager = sanitizeText(req.body.hiring_manager, 200)
    if (req.body?.recruiter_name !== undefined) updates.recruiter_name = sanitizeText(req.body.recruiter_name, 200)
    if (req.body?.recruiter_contact !== undefined) updates.recruiter_contact = sanitizeText(req.body.recruiter_contact, 200)
    if (req.body?.resume_name !== undefined) updates.resume_name = sanitizeText(req.body.resume_name, 500)
    if (req.body?.question_count !== undefined) updates.question_count = Number.isFinite(req.body.question_count) ? req.body.question_count : null
    if (req.body?.screening_summary !== undefined) updates.screening_summary = sanitizeText(req.body.screening_summary, 1000)
    if (req.body?.notes !== undefined) updates.notes = sanitizeText(req.body.notes, 3000)

    const { data, error } = await supabaseAdmin
      .from('job_applications')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select('*')
      .single()

    if (error) return res.status(400).json({ error: error.message })
    res.json({ entry: data })
  } catch (err) {
    next(err)
  }
})

router.delete('/job-applications/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params
    const { error } = await supabaseAdmin
      .from('job_applications')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)

    if (error) return res.status(400).json({ error: error.message })
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// =============================================
// ENGAGEMENT TRACKER ENDPOINTS
// =============================================

// Middleware to check tracker access (Max/BYOK only)
async function requireTracker(req, res, next) {
  try {
    const tier = await getUserTier(req.user.id)
    if (!tier.show_tracker) {
      return res.status(403).json({ error: 'Upgrade to Max to use the Engagement Tracker.' })
    }
    next()
  } catch (err) {
    next(err)
  }
}

// GET /api/data/tracker — list user's tracker entries
router.get('/tracker', requireAuth, requireTracker, async (req, res, next) => {
  try {
    const { data: entries, error } = await supabaseAdmin
      .from('engagement_tracker')
      .select('*')
      .eq('user_id', req.user.id)
      .order('last_action_at', { ascending: false })

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ entries: entries || [] })
  } catch (err) {
    next(err)
  }
})

// POST /api/data/tracker — create tracker entry
router.post('/tracker', requireAuth, requireTracker, async (req, res, next) => {
  try {
    const { contact_name, contact_company, contact_position, contact_email, contact_phone, status, notes } = req.body

    if (!contact_name) {
      return res.status(400).json({ error: 'contact_name is required' })
    }

    const validStatuses = ['identified', 'contacted', 'replied', 'meeting', 'closed', 'parked']
    const entryStatus = validStatuses.includes(status) ? status : 'identified'

    const { data: entry, error } = await supabaseAdmin
      .from('engagement_tracker')
      .insert({
        user_id: req.user.id,
        contact_name,
        contact_company: contact_company || null,
        contact_position: contact_position || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        status: entryStatus,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ entry })
  } catch (err) {
    next(err)
  }
})

// PATCH /api/data/tracker/:id — update tracker entry
router.patch('/tracker/:id', requireAuth, requireTracker, async (req, res, next) => {
  try {
    const { id } = req.params
    const { status, notes, contact_name, contact_company, contact_position, contact_email, contact_phone, engagement_log } = req.body
    const updates = { last_action_at: new Date().toISOString() }

    const validStatuses = ['identified', 'contacted', 'replied', 'meeting', 'closed', 'parked']
    if (status && validStatuses.includes(status)) {
      updates.status = status
    }
    if (notes !== undefined) updates.notes = notes
    if (contact_name) updates.contact_name = contact_name
    if (contact_company !== undefined) updates.contact_company = contact_company
    if (contact_position !== undefined) updates.contact_position = contact_position
    if (contact_email !== undefined) updates.contact_email = contact_email
    if (contact_phone !== undefined) updates.contact_phone = contact_phone

    // Validate and update engagement log
    if (engagement_log !== undefined) {
      const validTypes = ['Email', 'Call', 'Text', 'In-Person', 'LinkedIn', 'Other']
      if (!Array.isArray(engagement_log)) {
        return res.status(400).json({ error: 'engagement_log must be an array' })
      }
      for (const entry of engagement_log) {
        if (!entry.date || !entry.type || !validTypes.includes(entry.type)) {
          return res.status(400).json({ error: 'Each log entry requires a date and valid type' })
        }
      }
      updates.engagement_log = engagement_log
      // Update last_action_at to most recent log entry
      if (engagement_log.length > 0) {
        const sorted = [...engagement_log].sort((a, b) => b.date.localeCompare(a.date))
        updates.last_action_at = sorted[0].date
      }
    }

    const { data: entry, error } = await supabaseAdmin
      .from('engagement_tracker')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single()

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ entry })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/data/tracker/:id — remove tracker entry
router.delete('/tracker/:id', requireAuth, requireTracker, async (req, res, next) => {
  try {
    const { id } = req.params

    const { error } = await supabaseAdmin
      .from('engagement_tracker')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)

    if (error) {
      return res.status(400).json({ error: error.message })
    }

    res.json({ success: true })
  } catch (err) {
    next(err)
  }
})

// Helper function to update network analysis
async function updateNetworkAnalysis(userId, connections) {
  const totalConnections = connections.length

  // Category counts
  const categoryCounts = {}
  connections.forEach(c => {
    if (c.categories) {
      Object.entries(c.categories).forEach(([cat, matched]) => {
        if (matched) {
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
        }
      })
    }
  })

  // Company counts
  const companyCounts = {}
  connections.forEach(c => {
    if (c.company) {
      companyCounts[c.company] = (companyCounts[c.company] || 0) + 1
    }
  })
  const topCompanies = Object.entries(companyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})

  // Strength breakdown
  const strengthBreakdown = { strong: 0, warm: 0, cold: 0, new: 0 }
  connections.forEach(c => {
    if (c.relStrength) {
      strengthBreakdown[c.relStrength] = (strengthBreakdown[c.relStrength] || 0) + 1
    }
  })

  // Dormant count
  const dormantCount = connections.filter(c => c.isDormant).length

  // Engagement rate
  const engagedCount = connections.filter(c => (c.messageCount || 0) > 0 || (c.endorsementCount || 0) > 0).length
  const engagementRate = totalConnections > 0 ? (engagedCount / totalConnections * 100) : 0

  // Years building
  const dates = connections.map(c => c.connectedOn).filter(Boolean).map(d => new Date(d))
  const oldest = dates.length > 0 ? Math.min(...dates) : Date.now()
  const yearsBuilding = Math.floor((Date.now() - oldest) / (1000 * 60 * 60 * 24 * 365))

  // Upsert analysis
  await supabaseAdmin
    .from('network_analysis')
    .upsert({
      user_id: userId,
      total_connections: totalConnections,
      category_counts: categoryCounts,
      company_counts: topCompanies,
      strength_breakdown: strengthBreakdown,
      dormant_count: dormantCount,
      engagement_rate: engagementRate,
      years_building: yearsBuilding,
      analyzed_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    })
}

export default router
