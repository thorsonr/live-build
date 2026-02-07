import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../lib/ThemeContext'
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
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-live-border hover:bg-live-bg-warm transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <svg className="w-4 h-4 text-live-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-live-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <Link
              to="/signup"
              className="btn btn-primary text-sm px-6 py-2 whitespace-nowrap"
            >
              Start Trial
            </Link>
          </div>
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
          sampleTrackerEntries={data.sampleTrackerEntries}
          onNavigate={handleNavigate}
        />
      </main>
    </div>
  )
}
