import { createContext, useContext, useState, useCallback } from 'react'
import { api } from './api'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [data, setData] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [cloudLoading, setCloudLoading] = useState(false)
  const [cloudChecked, setCloudChecked] = useState(false)

  const handleSyncToCloud = async () => {
    if (!data?.contacts) return

    setSyncing(true)
    setSyncMessage('')

    try {
      await api.importData(data.contacts)
      setSyncMessage('Data synced to cloud successfully!')
      setTimeout(() => setSyncMessage(''), 3000)
    } catch (err) {
      setSyncMessage('Failed to sync: ' + err.message)
    } finally {
      setSyncing(false)
    }
  }

  // Load saved data from cloud on login
  const loadFromCloud = useCallback(async () => {
    if (cloudChecked || data) return false
    setCloudChecked(true)
    setCloudLoading(true)

    try {
      // Fetch saved connections
      const { connections } = await api.getConnections({ limit: 5000 })
      if (!connections || connections.length === 0) {
        setCloudLoading(false)
        return false
      }

      // Map from DB snake_case to frontend camelCase
      const contacts = connections.map(c => ({
        name: c.name,
        firstName: c.first_name,
        lastName: c.last_name,
        position: c.position,
        company: c.company,
        linkedInUrl: c.linkedin_url,
        connectedOn: c.connected_on,
        messageCount: c.message_count || 0,
        relStrength: c.rel_strength,
        isDormant: c.is_dormant,
        endorsementCount: c.endorsement_count || 0,
        categories: c.categories || {},
      }))

      // Fetch cached AI analysis (most recent full_analysis)
      let aiAnalysis = null
      try {
        const { insights } = await api.getInsights()
        const fullAnalysis = insights?.find(i => i.insight_type === 'full_analysis')
        if (fullAnalysis?.content) {
          aiAnalysis = typeof fullAnalysis.content === 'string'
            ? JSON.parse(fullAnalysis.content)
            : fullAnalysis.content
        }
      } catch (e) {
        // AI insights may not exist yet
      }

      // Compute basic analytics from contacts
      const analytics = computeAnalyticsFromContacts(contacts)

      // Fetch cached supplementary analytics (skills, endorsements, shares, etc.)
      try {
        const { analytics: cached } = await api.getAnalyticsCache()
        if (cached) {
          // Merge cached fields into computed analytics
          const cacheFields = [
            'skills', 'topEndorsedSkills', 'topEndorsers', 'endorsementCount',
            'recommendationCount', 'recommendations', 'inferences', 'adtargeting',
            'shares', 'postsByMonth', 'totalPosts', 'firstPost', 'lastPost',
            'themeCounts', 'messageCount',
          ]
          for (const field of cacheFields) {
            if (cached[field] !== undefined && cached[field] !== null) {
              analytics[field] = cached[field]
            }
          }
        }
      } catch (e) {
        // Analytics cache may not exist yet — computed values are fine
      }

      setData({
        contacts,
        analytics,
        rawData: null, // Not available from cloud — user must re-upload to retry AI
        aiAnalysis,
      })

      setCloudLoading(false)
      return true
    } catch (err) {
      console.error('Failed to load from cloud:', err)
      setCloudLoading(false)
      return false
    }
  }, [cloudChecked, data])

  const clearData = () => {
    setData(null)
    setCloudChecked(false)
    setSyncMessage('')
  }

  return (
    <DataContext.Provider value={{
      data,
      setData,
      syncing,
      syncMessage,
      cloudLoading,
      handleSyncToCloud,
      loadFromCloud,
      clearData
    }}>
      {children}
    </DataContext.Provider>
  )
}

// Reconstruct analytics from saved contacts (mirrors buildAnalytics output shape)
function computeAnalyticsFromContacts(contacts) {
  const total = contacts.length
  const messaged = contacts.filter(c => (c.messageCount || 0) > 0).length
  const neverMessaged = total - messaged
  const strong = contacts.filter(c => c.relStrength === 'strong').length
  const warm = contacts.filter(c => c.relStrength === 'warm').length
  const cold = contacts.filter(c => c.relStrength === 'cold').length
  const newConn = contacts.filter(c => c.relStrength === 'new').length
  const dormant = contacts.filter(c => c.isDormant).length

  // Company counts → object {company: count}
  const companyIndex = {}
  contacts.forEach(c => {
    if (c.company) companyIndex[c.company] = (companyIndex[c.company] || 0) + 1
  })
  const topCompanies = Object.entries(companyIndex)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {})

  // Category counts
  const categoryCounts = {}
  contacts.forEach(c => {
    if (c.categories) {
      Object.entries(c.categories).forEach(([cat, matched]) => {
        if (matched) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      })
    }
  })

  // Years building + connections by year
  const connectionsByYear = {}
  contacts.forEach(c => {
    if (c.connectedOn) {
      const year = new Date(c.connectedOn).getFullYear()
      if (!isNaN(year)) connectionsByYear[year] = (connectionsByYear[year] || 0) + 1
    }
  })
  const years = Object.keys(connectionsByYear).map(Number).filter(y => !isNaN(y))
  const minYear = years.length ? Math.min(...years) : new Date().getFullYear()
  const yearsBuilding = new Date().getFullYear() - minYear

  // Endorsements
  const totalEndorsements = contacts.reduce((s, c) => s + (c.endorsementCount || 0), 0)

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
    skills: [],
    topEndorsedSkills: [],
    topEndorsers: [],
    endorsementCount: totalEndorsements,
    recommendationCount: 0,
    recommendations: [],
    inferences: [],
    adtargeting: [],
    shares: [],
    postsByMonth: {},
    totalPosts: 0,
    firstPost: null,
    lastPost: null,
    themeCounts: {},
    messageCount: 0,
  }
}

export function useData() {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useData must be used within a DataProvider')
  }
  return context
}
