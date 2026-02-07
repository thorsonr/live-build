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
      { id: 'tracker', label: 'Tracker' },
    ]
  },
]

export default function SampleDashboard() {
  const [activeSection, setActiveSection] = useState('summary')
  const [activeSubTab, setActiveSubTab] = useState(null)
  const data = useMemo(() => rehydrateDates(sampleDataRaw), [])

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
        </div>
      </nav>

      {/* Dashboard Content */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <NetworkAnalytics
          data={data}
          activeTab={activeTab}
          user={null}
          settings={{ show_outreach: true, show_tracker: true }}
          onExportCSV={null}
          sampleMode={true}
          sampleMessages={data.sampleMessages}
          onNavigate={handleNavigate}
        />
      </main>
    </div>
  )
}
