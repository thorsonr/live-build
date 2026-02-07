import { Router } from 'express'
import { createUserClient, supabaseAdmin } from '../lib/supabase.js'
import { requireAuth } from '../middleware/auth.js'

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
    await supabaseAdmin.from('analysis_archives').delete().eq('user_id', userId)

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
