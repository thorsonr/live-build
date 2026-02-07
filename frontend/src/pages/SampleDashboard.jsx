import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import NetworkAnalytics from '../components/NetworkAnalytics'
import sampleDataRaw from '../data/sampleData.json'

// Rehydrate Date fields from JSON (they come as strings/null)
function rehydrateDates(data) {
  const contacts = data.contacts.map(c => ({
    ...c,
    connectedDate: c.connectedDate ? new Date(c.connectedDate) : null,
  }))

  const analytics = {
    ...data.analytics,
    firstPost: data.analytics.firstPost ? new Date(data.analytics.firstPost) : null,
    lastPost: data.analytics.lastPost ? new Date(data.analytics.lastPost) : null,
  }

  return { ...data, contacts, analytics }
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

export default function SampleDashboard() {
  const [activeTab, setActiveTab] = useState('summary')
  const data = useMemo(() => rehydrateDates(sampleDataRaw), [])

  return (
    <div>
      {/* Sample Mode Banner */}
      <div className="bg-live-accent/10 border-b border-live-accent/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-live-text">
            <span className="font-semibold">Sample Dashboard</span>
            <span className="text-live-text-secondary ml-2">This is anonymized demo data showing what LiVE Pro can do with your LinkedIn export.</span>
          </p>
          <Link
            to="/signup"
            className="btn btn-primary text-sm px-6 py-2 whitespace-nowrap"
          >
            Start Free Trial
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <nav className="bg-live-surface border-b border-live-border sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between py-3">
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
        </div>
      </nav>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <NetworkAnalytics
          data={data}
          activeTab={activeTab}
          user={null}
          settings={{ show_outreach: true }}
          onExportCSV={null}
          sampleMode={true}
          sampleMessages={data.sampleMessages}
        />
      </main>
    </div>
  )
}
