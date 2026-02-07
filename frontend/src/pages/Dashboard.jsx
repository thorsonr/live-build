import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import FileUpload from '../components/FileUpload'
import NetworkAnalytics from '../components/NetworkAnalytics'
import { useData } from '../lib/DataContext'
import { api } from '../lib/api'
import { prepareDataForAPI } from '../lib/linkedinParser'

export default function Dashboard({ user, settings }) {
  const { data, setData, syncMessage, cloudLoading, loadFromCloud } = useData()
  const [activeTab, setActiveTab] = useState('summary')
  const [retrying, setRetrying] = useState(false)

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

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'network', label: 'Network' },
    { id: 'relationships', label: 'Relationships' },
    { id: 'skills', label: 'Skills & Expertise' },
    { id: 'content', label: 'Your Content' },
    { id: 'advocates', label: 'Your Advocates' },
    { id: 'priorities', label: 'Priorities' },
    { id: 'messages', label: 'Messages' },
    { id: 'inferences', label: "LinkedIn's View" },
    { id: 'contacts', label: 'All Contacts' },
  ]

  // Trial expired lockout overlay
  if (trialExpired && data) {
    return (
      <div className="relative">
        {/* Blurred background hint */}
        <div className="filter blur-sm pointer-events-none opacity-40">
          <nav className="bg-live-surface border-b border-live-border">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-3">
              <div className="flex gap-1 overflow-x-auto">
                {tabs.map((tab) => (
                  <span key={tab.id} className="px-3 py-2 rounded-lg text-sm font-medium text-live-text-secondary">
                    {tab.label}
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
            <div className="flex items-center justify-between py-3">
              {/* Tabs */}
              <div className="flex gap-1 overflow-x-auto flex-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'bg-live-accent text-[#1a1a2e]'
                        : 'text-live-text-secondary hover:bg-live-bg-warm'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

            </div>

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
            onExportCSV={handleExportCSV}
          />
        )}
      </main>
    </div>
  )
}
