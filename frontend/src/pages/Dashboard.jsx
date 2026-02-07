import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import NetworkAnalytics from '../components/NetworkAnalytics'
import { useData } from '../lib/DataContext'
import { api } from '../lib/api'
import { prepareDataForAPI } from '../lib/linkedinParser'

export default function Dashboard({ user, settings, profile }) {
  const { data, setData, syncMessage, cloudLoading, loadFromCloud } = useData()
  const [activeSection, setActiveSection] = useState('summary')
  const [activeSubTab, setActiveSubTab] = useState(null)
  const [retrying, setRetrying] = useState(false)

  const sections = [
    { id: 'summary', label: 'Summary', subTabs: [] },
    {
      id: 'analytics', label: 'Analytics',
      subTabs: [
        { id: 'network', label: 'Network' },
        { id: 'relationships', label: 'Relationships' },
        { id: 'skills', label: 'Skills & Expertise' },
        { id: 'content', label: 'Your Content' },
        { id: 'advocates', label: 'Your Advocates' },
        { id: 'inferences', label: "LinkedIn's View" },
        { id: 'contacts', label: 'Contacts' },
      ]
    },
    {
      id: 'engagement', label: 'Engagement',
      subTabs: [
        { id: 'priorities', label: 'Priorities' },
        { id: 'messages', label: 'Messages' },
        { id: 'tracker', label: 'Tracker', gated: true },
      ]
    },
  ]

  const handleSectionClick = (sectionId) => {
    setActiveSection(sectionId)
    const section = sections.find(s => s.id === sectionId)
    setActiveSubTab(section?.subTabs?.length ? section.subTabs[0].id : null)
  }

  const currentSection = sections.find(s => s.id === activeSection)
  const activeTab = activeSection === 'summary' ? 'summary' : activeSubTab

  const handleNavigate = (targetTab) => {
    for (const section of sections) {
      if (section.id === targetTab) {
        handleSectionClick(section.id)
        return
      }
      const sub = section.subTabs?.find(st => st.id === targetTab)
      if (sub) {
        setActiveSection(section.id)
        setActiveSubTab(sub.id)
        return
      }
    }
  }

  const trialExpired = settings?.trial_expired === true

  // Auto-load saved data from cloud on first visit (or after clear)
  useEffect(() => {
    if (!data && user) {
      loadFromCloud()
    }
  }, [user, data])

  const handleDataLoaded = (result) => {
    setData(result)

    // Auto-sync contacts to cloud so they load on next login
    if (result?.contacts?.length) {
      api.importData(result.contacts).catch(err => {
        console.warn('Cloud sync failed:', err.message)
      })
    }

    // Save supplementary analytics (skills, endorsements, recommendations,
    // shares, inferences, adtargeting) so they persist across sessions
    if (result?.analytics) {
      const { skills, topEndorsedSkills, topEndorsers, endorsementCount,
        recommendationCount, recommendations, inferences, adtargeting,
        shares, postsByMonth, totalPosts, firstPost, lastPost,
        themeCounts, messageCount } = result.analytics
      api.saveAnalyticsCache({
        skills, topEndorsedSkills, topEndorsers, endorsementCount,
        recommendationCount, recommendations, inferences, adtargeting,
        shares, postsByMonth, totalPosts, firstPost, lastPost,
        themeCounts, messageCount,
      }).catch(err => {
        console.warn('Analytics cache sync failed:', err.message)
      })
    }
  }

  const handleRetryAI = async () => {
    if (!data?.rawData) return
    setRetrying(true)

    try {
      const response = await api.analyzeNetwork({
        rawData: prepareDataForAPI(data.rawData),
        userContext: '',
      })

      setData({
        ...data,
        aiAnalysis: response.analysis,
      })
    } catch (err) {
      console.error('AI retry failed:', err)
    } finally {
      setRetrying(false)
    }
  }

  const handleExportCSV = () => {
    if (!data?.contacts) return

    // CSV headers
    const headers = ['Name', 'First Name', 'Last Name', 'Position', 'Company', 'LinkedIn URL', 'Email', 'Connected On', 'Messages', 'Relationship', 'Dormant']

    // CSV rows
    const rows = data.contacts.map(c => [
      c.name,
      c.firstName,
      c.lastName,
      c.position,
      c.company,
      c.linkedInUrl,
      c.email,
      c.connectedOn,
      c.messageCount,
      c.relStrength,
      c.isDormant ? 'Yes' : 'No'
    ])

    // Build CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `live_contacts_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Trial expired lockout overlay
  if (trialExpired && data) {
    return (
      <div className="relative">
        {/* Blurred background hint */}
        <div className="filter blur-sm pointer-events-none opacity-40">
          <nav className="bg-live-surface border-b border-live-border">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
              <div className="flex gap-1 overflow-x-auto">
                {sections.map((s) => (
                  <span key={s.id} className="px-3 py-2 rounded-lg text-sm font-medium text-live-text-secondary">
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </nav>
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
            <div className="h-64 bg-live-bg-warm rounded-xl" />
          </div>
        </div>

        {/* Lockout overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="card max-w-md mx-4">
            <div className="card-body text-center py-10 px-8">
              <div className="text-5xl mb-4">&#128274;</div>
              <h2 className="font-display text-xl font-semibold mb-3 text-live-text">
                Your Free Trial Has Ended
              </h2>
              <p className="text-sm text-live-text-secondary mb-6">
                Upgrade to Pro to continue accessing your analysis, unlock AI chat,
                and get 4 AI analyses per month with Sonnet.
              </p>
              <a
                href="#upgrade"
                className="btn btn-primary inline-block mb-3"
              >
                Upgrade to Pro
              </a>
              <p className="text-xs text-live-text-secondary">
                Or <Link to="/settings" className="text-live-info hover:underline">add your own API key</Link> for unlimited access
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Navigation */}
      {data && (
        <nav className="bg-live-surface border-b border-live-border sticky top-0 z-50 transition-colors">
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            {/* Section tabs (row 1) */}
            <div className="flex gap-1 overflow-x-auto py-3">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                    activeSection === section.id
                      ? 'bg-live-accent text-[#1a1a2e]'
                      : 'text-live-text-secondary hover:bg-live-bg-warm'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>

            {/* Sub-tabs (row 2) */}
            {currentSection?.subTabs?.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-3 -mt-1">
                {currentSection.subTabs.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubTab(sub.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                      activeSubTab === sub.id
                        ? 'bg-live-bg-warm text-live-text border border-live-border'
                        : 'text-live-text-secondary hover:bg-live-bg-warm/50'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}

            {/* Sync Message */}
            {syncMessage && (
              <div className={`pb-3 text-sm ${syncMessage.includes('Failed') ? 'text-live-danger' : 'text-live-success'}`}>
                {syncMessage}
              </div>
            )}
          </div>
        </nav>
      )}

      {/* AI Analysis Banner — shows if data loaded but AI analysis failed/skipped */}
      {data && !data.aiAnalysis && (
        <div className="bg-live-bg-warm border-b border-live-border">
          <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex items-center justify-between">
            <p className="text-xs text-live-text-secondary">
              Viewing local analytics only. AI insights are not loaded.
            </p>
            <button
              onClick={handleRetryAI}
              disabled={retrying}
              className="text-xs text-live-accent hover:underline disabled:opacity-50"
            >
              {retrying ? 'Analyzing...' : 'Run AI Analysis'}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        {cloudLoading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">&#x2601;&#xFE0F;</div>
            <p className="text-live-text-secondary">Loading your saved data...</p>
          </div>
        ) : !data ? (
          <FileUpload onDataLoaded={handleDataLoaded} />
        ) : (
          <NetworkAnalytics
            data={data}
            activeTab={activeTab}
            user={user}
            settings={settings}
            profile={profile}
            onExportCSV={handleExportCSV}
            onNavigate={handleNavigate}
          />
        )}
      </main>
    </div>
  )
}
