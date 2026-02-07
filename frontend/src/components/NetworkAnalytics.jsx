import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Chart from 'chart.js/auto'
import ContactGrid from './ContactGrid'
import StrategyAnalysis from './StrategyAnalysis'
import AIInsightCard, { stripMarkdown } from './AIInsightCard'
import MessageGenerator from './MessageGenerator'
import TrackerTab from './TrackerTab'
import { api } from '../lib/api'

/**
 * StructuredInsightCard — renders a 3-part AI insight (key_insight, why_it_matters, suggested_action).
 * Falls back to plain string rendering for backward compatibility with old analyses.
 */
function StructuredInsightCard({ insight, label }) {
  if (!insight) return null

  // Backward compat: if insight is a plain string, render via AIInsightCard
  if (typeof insight === 'string') {
    return <AIInsightCard insight={insight} label={label} />
  }

  // Structured 3-part object
  const { key_insight, why_it_matters, suggested_action } = insight
  if (!key_insight) return <AIInsightCard insight={JSON.stringify(insight)} label={label} />

  return (
    <div className="ai-insight-card">
      <div className="text-xs font-semibold tracking-wider uppercase text-live-accent mb-3">
        {label || 'AI INSIGHT'}
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs font-semibold uppercase text-live-text-secondary mb-1">Key Insight</div>
          <p className="text-sm font-medium leading-relaxed text-live-text">{stripMarkdown(key_insight)}</p>
        </div>
        {why_it_matters && (
          <div>
            <div className="text-xs font-semibold uppercase text-live-text-secondary mb-1">Why It Matters</div>
            <p className="text-sm leading-relaxed text-live-text-secondary">{stripMarkdown(why_it_matters)}</p>
          </div>
        )}
        {suggested_action && (
          <div className="p-3 rounded-lg bg-live-accent/10 border-l-4 border-live-accent">
            <div className="text-xs font-semibold uppercase text-live-accent mb-1">Suggested Action</div>
            <p className="text-sm leading-relaxed text-live-text">{stripMarkdown(suggested_action)}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SampleCTAModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="card max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="card-body text-center py-8 px-6">
          <div className="text-4xl mb-4">&#9993;</div>
          <h3 className="font-display text-lg font-semibold mb-3 text-live-text">
            Generate Personalized Outreach
          </h3>
          <p className="text-sm text-live-text-secondary mb-6">
            Sign up for LiVE Pro to generate AI-powered outreach messages tailored to your own contacts.
          </p>
          <Link to="/signup" className="btn btn-primary inline-block mb-3">
            Start Free Trial
          </Link>
          <button onClick={onClose} className="block mx-auto text-sm text-live-text-secondary hover:text-live-text mt-2">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function NetworkAnalytics({ data, activeTab, user, settings, profile, onExportCSV, sampleMode = false, sampleMessages = null, sampleTrackerEntries = null, onNavigate }) {
  const { contacts, analytics, aiAnalysis } = data
  const [selectedContact, setSelectedContact] = useState(null)
  const [preselectedContact, setPreselectedContact] = useState(null)
  const [showStrategy, setShowStrategy] = useState(false)

  // Navigate to Messages tab with a pre-selected contact
  const handleDraftOutreach = (contact) => {
    if (sampleMode) {
      setSelectedContact(contact)
      return
    }
    setPreselectedContact({
      name: contact.name || '',
      position: contact.position || '',
      company: contact.company || '',
      relationship: contact.relStrength || 'unknown',
      isDormant: contact.isDormant || false,
      messageCount: contact.messageCount || 0,
    })
    if (onNavigate) onNavigate('messages')
  }

  // Helper to safely access AI screen data
  const ai = (screenKey) => aiAnalysis?.screens?.[screenKey] || null

  return (
    <div>
      {activeTab === 'summary' && (
        <SummaryTab analytics={analytics} aiScreen={ai('summary')} onNavigate={onNavigate} settings={settings} />
      )}
      {activeTab === 'network' && (
        <NetworkTab analytics={analytics} aiScreen={ai('network')} />
      )}
      {activeTab === 'relationships' && (
        <RelationshipsTab analytics={analytics} contacts={contacts} aiScreen={ai('relationships')} />
      )}
      {activeTab === 'skills' && (
        <SkillsTab analytics={analytics} aiScreen={ai('skills_expertise')} />
      )}
      {activeTab === 'content' && (
        <ContentTab analytics={analytics} aiScreen={ai('your_content')} />
      )}
      {activeTab === 'advocates' && (
        <AdvocatesTab analytics={analytics} aiScreen={ai('your_advocates')} />
      )}
      {activeTab === 'priorities' && (
        <PrioritiesTab analytics={analytics} contacts={contacts} aiScreen={ai('priorities')} settings={settings} />
      )}
      {activeTab === 'messages' && (
        <MessageGenerator
          data={data}
          settings={settings}
          profile={profile}
          preselectedContact={preselectedContact}
          onPreselectedConsumed={() => setPreselectedContact(null)}
          sampleMode={sampleMode}
          sampleMessages={sampleMessages}
        />
      )}
      {activeTab === 'tracker' && (
        settings?.show_tracker ? (
          <TrackerTab sampleMode={sampleMode} sampleTrackerEntries={sampleTrackerEntries} contacts={contacts} />
        ) : (
          <div>
            <div className="section-label">Engagement Tracker</div>
            <h2 className="section-title mb-2">Track Your Outreach</h2>
            <p className="text-live-text-secondary mb-6">Keep track of your outreach pipeline from first contact to meeting.</p>
            <div className="card">
              <div className="card-body text-center py-12 px-8">
                <div className="text-4xl mb-4">&#128202;</div>
                <h3 className="font-display text-lg font-semibold mb-3 text-live-text">
                  Unlock the Engagement Tracker
                </h3>
                <p className="text-sm text-live-text-secondary mb-6 max-w-md mx-auto">
                  Upgrade to Max to track your outreach pipeline with a mini-CRM.
                  Manage contacts from identification through to meetings and closed deals.
                </p>
                <a href="#upgrade" className="btn btn-primary inline-block">
                  Upgrade to Max
                </a>
              </div>
            </div>
          </div>
        )
      )}
      {activeTab === 'inferences' && (
        <InferencesTab analytics={analytics} aiScreen={ai('linkedins_view')} />
      )}
      {activeTab === 'contacts' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-live-text">All Contacts</h2>
            {onExportCSV && (
              <button
                onClick={onExportCSV}
                className="px-4 py-2 text-sm font-medium text-live-text-secondary hover:text-live-text bg-live-surface hover:bg-live-bg-warm border border-live-border rounded-lg transition-colors"
              >
                &darr; Export Contacts
              </button>
            )}
          </div>
          <ContactGrid contacts={contacts} onSelectContact={handleDraftOutreach} settings={settings} />
        </div>
      )}

      {selectedContact && sampleMode && (
        <SampleCTAModal onClose={() => setSelectedContact(null)} />
      )}
      {showStrategy && (
        <StrategyAnalysis analytics={analytics} onClose={() => setShowStrategy(false)} />
      )}
    </div>
  )
}

// ============================================
// SUMMARY TAB
// ============================================
function SummaryTab({ analytics, aiScreen, onNavigate, settings }) {
  const categoryChartRef = useRef(null)
  const timelineChartRef = useRef(null)
  const chartInstances = useRef({})

  useEffect(() => {
    // Destroy existing charts
    Object.values(chartInstances.current).forEach(c => c?.destroy())
    chartInstances.current = {}

    const catNames = Object.keys(analytics.categoryCounts)
    const catData = catNames.map(cat => analytics.categoryCounts[cat])
    const otherCount = Math.max(0, analytics.totalConnections - catData.reduce((a, b) => a + b, 0))
    const chartColors = ['#c94a4a', '#2d8a6e', '#667eea', '#c9a227', '#636e72']

    // Category Chart
    if (categoryChartRef.current) {
      chartInstances.current.category = new Chart(categoryChartRef.current, {
        type: 'doughnut',
        data: {
          labels: [...catNames, 'Other'],
          datasets: [{
            data: [...catData, otherCount],
            backgroundColor: [...chartColors.slice(0, catNames.length), '#d4d4d4'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      })
    }

    // Timeline Chart
    if (timelineChartRef.current) {
      const years = Object.keys(analytics.connectionsByYear).sort()
      chartInstances.current.timeline = new Chart(timelineChartRef.current, {
        type: 'bar',
        data: {
          labels: years,
          datasets: [{
            data: years.map(y => analytics.connectionsByYear[y]),
            backgroundColor: '#c9a227',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      })
    }

    return () => {
      Object.values(chartInstances.current).forEach(c => c?.destroy())
    }
  }, [analytics])

  const catNames = Object.keys(analytics.categoryCounts)
  const topCat = catNames[0] || 'Contacts'
  const topCatCount = catNames.length ? analytics.categoryCounts[catNames[0]] : 0
  const catSummary = catNames.map(cat => `${analytics.categoryCounts[cat]} ${cat.toLowerCase()}`).join(', ')

  // AI-powered executive summary or local fallback
  const execSummary = aiScreen?.executive_summary
  const headline = stripMarkdown(execSummary?.report_headline) || 'Your Network Intelligence Report'
  const body = stripMarkdown(execSummary?.report_body) || `You've built a network of ${analytics.totalConnections.toLocaleString()} connections over ${analytics.yearsBuilding} years. Your network includes: ${catSummary || 'various professionals'}, and ${analytics.recommendationCount} written recommendations.`
  const keyInsight = stripMarkdown(execSummary?.key_insight) || `You've messaged only ${analytics.engagementRate}% of connections. ${analytics.dormantCount} contacts have gone dormant. Reactivating these relationships is your highest-leverage move.`

  return (
    <div>
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="hero-stat">
          <div className="value">{analytics.totalConnections.toLocaleString()}</div>
          <div className="label">Connections</div>
        </div>
        <div className="hero-stat">
          <div className="value">{topCatCount}</div>
          <div className="label">{topCat}</div>
        </div>
        <div className="hero-stat">
          <div className="value">{analytics.neverMessagedPct}%</div>
          <div className="label">Never Messaged</div>
        </div>
        <div className="hero-stat">
          <div className="value">{analytics.recommendationCount}</div>
          <div className="label">Recommendations</div>
        </div>
        <div className="hero-stat">
          <div className="value">{analytics.totalPosts > 0 ? analytics.totalPosts : analytics.yearsBuilding}</div>
          <div className="label">{analytics.totalPosts > 0 ? 'Posts' : 'Years Building'}</div>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="section-label">Executive Summary</div>
          <h2 className="section-title">{headline}</h2>
          <p className="text-live-text-secondary mb-4">
            {body}
          </p>

          {/* AI Insight replaces hardcoded key insight */}
          {aiScreen ? (
            <AIInsightCard insight={keyInsight} label="KEY INSIGHT" />
          ) : (
            <div className="p-4 rounded-lg bg-live-accent/10 border-l-4 border-live-accent mb-4">
              <strong>Key insight:</strong> {keyInsight}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {catNames.slice(0, 3).map((cat, i) => (
          <div key={cat} className={`card border-l-4 ${i === 0 ? 'border-l-live-accent' : i === 1 ? 'border-l-live-success' : 'border-l-live-info'}`}>
            <div className="card-body py-4">
              <div className="text-2xl font-light">{analytics.categoryCounts[cat]}</div>
              <div className="text-sm text-live-text-secondary">{cat}</div>
            </div>
          </div>
        ))}
        <div className="card border-l-4 border-l-live-danger">
          <div className="card-body py-4">
            <div className="text-2xl font-light text-live-danger">{analytics.dormantCount}</div>
            <div className="text-sm text-live-text-secondary">Dormant</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">Network Categories</div>
          <div className="card-body">
            <div className="h-64"><canvas ref={categoryChartRef}></canvas></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Connection Timeline</div>
          <div className="card-body">
            <div className="h-64"><canvas ref={timelineChartRef}></canvas></div>
          </div>
        </div>
      </div>

      {/* Do Next Items */}
      {aiScreen?.do_next_items?.length > 0 && (
        <div className="card mt-6">
          <div className="card-header">Do Next</div>
          <div className="card-body">
            <div className="space-y-3">
              {aiScreen.do_next_items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-live-bg-warm transition-colors">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-live-accent/20 text-live-accent flex items-center justify-center text-xs font-bold mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-live-text">{stripMarkdown(item.action)}</p>
                    {item.why && (
                      <p className="text-xs text-live-text-secondary mt-0.5">{stripMarkdown(item.why)}</p>
                    )}
                  </div>
                  {item.target_tab && onNavigate && (
                    <button
                      onClick={() => onNavigate(item.target_tab)}
                      className="flex-shrink-0 text-live-accent hover:text-live-text text-sm px-2 py-1 rounded hover:bg-live-accent/10 transition-colors"
                      title={`Go to ${item.target_tab}`}
                    >
                      &rarr;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Opportunities */}
      {aiScreen?.top_opportunities?.length > 0 && (
        <div className="mt-6">
          <div className="section-label">Top Opportunities</div>
          <div className="grid md:grid-cols-3 gap-4">
            {aiScreen.top_opportunities.map((opp, i) => (
              <div key={i} className="card border-l-4 border-l-live-accent">
                <div className="card-body">
                  <p className="font-semibold text-sm text-live-text">{opp.name}</p>
                  <p className="text-xs text-live-text-secondary">
                    {opp.role}{opp.company ? ` at ${opp.company}` : ''}
                  </p>
                  <p className="text-sm text-live-text-secondary mt-2">{stripMarkdown(opp.reason)}</p>
                  <p className="text-xs text-live-accent mt-2 font-medium">{stripMarkdown(opp.suggested_action)}</p>
                  {settings?.show_outreach && onNavigate && (
                    <button
                      onClick={() => onNavigate('messages')}
                      className="mt-3 text-xs px-3 py-1 border border-live-accent text-live-accent rounded-lg hover:bg-live-accent/10 transition-colors"
                    >
                      Draft Outreach
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// NETWORK TAB
// ============================================
function NetworkTab({ analytics, aiScreen }) {
  const companyChartRef = useRef(null)
  const seniorityChartRef = useRef(null)
  const chartInstances = useRef({})

  useEffect(() => {
    Object.values(chartInstances.current).forEach(c => c?.destroy())
    chartInstances.current = {}

    const topCompanies = Object.entries(analytics.topCompanies).slice(0, 10)
    const catNames = Object.keys(analytics.categoryCounts)
    const catData = catNames.map(cat => analytics.categoryCounts[cat])
    const otherCount = Math.max(0, analytics.totalConnections - catData.reduce((a, b) => a + b, 0))
    const chartColors = ['#667eea', '#c9a227', '#2d8a6e', '#c94a4a', '#636e72']

    if (companyChartRef.current && topCompanies.length) {
      chartInstances.current.company = new Chart(companyChartRef.current, {
        type: 'bar',
        data: {
          labels: topCompanies.map(c => c[0].substring(0, 18)),
          datasets: [{
            data: topCompanies.map(c => c[1]),
            backgroundColor: '#c9a227',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      })
    }

    if (seniorityChartRef.current) {
      chartInstances.current.seniority = new Chart(seniorityChartRef.current, {
        type: 'doughnut',
        data: {
          labels: [...catNames, 'Other'],
          datasets: [{
            data: [...catData, otherCount],
            backgroundColor: [...chartColors.slice(0, catNames.length), '#d4d4d4'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      })
    }

    return () => Object.values(chartInstances.current).forEach(c => c?.destroy())
  }, [analytics])

  const topCompanies = Object.entries(analytics.topCompanies).slice(0, 10)
  const topCompany = topCompanies[0] || ['N/A', 0]
  const catNames = Object.keys(analytics.categoryCounts)

  return (
    <div>
      <div className="section-label">Network Shape</div>
      <h2 className="section-title mb-2">What You've Built</h2>
      <p className="text-live-text-secondary mb-6">Understanding your network's composition, concentration, and strategic gaps.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card border-l-4 border-l-live-accent">
          <div className="card-body py-4">
            <div className="text-2xl font-light">{topCompany[1]}</div>
            <div className="text-sm text-live-text-secondary truncate">{topCompany[0]}</div>
            <div className="text-xs text-live-text-secondary opacity-70">Largest cluster</div>
          </div>
        </div>
        {catNames.slice(0, 2).map(cat => (
          <div key={cat} className="card">
            <div className="card-body py-4">
              <div className="text-2xl font-light">{analytics.categoryCounts[cat]}</div>
              <div className="text-sm text-live-text-secondary">{cat}</div>
            </div>
          </div>
        ))}
        <div className="card">
          <div className="card-body py-4">
            <div className="text-2xl font-light">{((topCompany[1] / analytics.totalConnections) * 100).toFixed(0)}%</div>
            <div className="text-sm text-live-text-secondary">Top Concentration</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">Top Companies</div>
          <div className="card-body">
            <div className="h-72"><canvas ref={companyChartRef}></canvas></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Category Distribution</div>
          <div className="card-body">
            <div className="h-72"><canvas ref={seniorityChartRef}></canvas></div>
          </div>
        </div>
      </div>

      {/* AI Insight Card */}
      {aiScreen?.network_shape_insight && (
        <StructuredInsightCard insight={aiScreen.network_shape_insight} label="NETWORK SHAPE INSIGHT" />
      )}

      {/* Concentration Analysis */}
      <div className="card">
        <div className="card-header">Network Concentration</div>
        <div className="card-body">
          {topCompanies.slice(0, 5).map(([company, count]) => (
            <div key={company} className="mb-3">
              <div className="flex justify-between text-sm mb-1">
                <span>{company}</span>
                <span className="text-live-text-secondary">{((count / analytics.totalConnections) * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-live-border rounded-full overflow-hidden">
                <div className="h-full bg-live-accent rounded-full" style={{ width: `${(count / analytics.totalConnections) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================
// RELATIONSHIPS TAB
// ============================================
function RelationshipsTab({ analytics, contacts, aiScreen }) {
  const relationshipChartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    chartInstance.current?.destroy()

    if (relationshipChartRef.current) {
      chartInstance.current = new Chart(relationshipChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Strong', 'Warm', 'Cold'],
          datasets: [{
            data: [analytics.strengthCounts.strong, analytics.strengthCounts.warm, analytics.strengthCounts.cold],
            backgroundColor: ['#2d8a6e', '#667eea', '#d4d4d4'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } }
        }
      })
    }

    return () => chartInstance.current?.destroy()
  }, [analytics])

  const strongPct = ((analytics.strengthCounts.strong / analytics.totalConnections) * 100).toFixed(1)
  const warmPct = ((analytics.strengthCounts.warm / analytics.totalConnections) * 100).toFixed(1)
  const coldPct = ((analytics.strengthCounts.cold / analytics.totalConnections) * 100).toFixed(1)

  const catNames = Object.keys(analytics.categoryCounts)
  const firstCat = catNames[0]
  const dormantInCat = firstCat ? contacts.filter(c => c.categories?.[firstCat] && c.isDormant).length : 0
  const catTotal = firstCat ? analytics.categoryCounts[firstCat] : 0

  // AI or local "The Opportunity" insight
  const opportunityInsight = aiScreen?.opportunity_insight || null

  return (
    <div>
      <div className="section-label">Relationship Depth</div>
      <h2 className="section-title mb-2">How Your Network Behaves</h2>
      <p className="text-live-text-secondary mb-6">The truth about engagement—and the opportunities it reveals.</p>

      {/* Depth Bar */}
      <div className="card mb-6">
        <div className="card-body">
          <h4 className="font-semibold mb-3">Engagement Analysis</h4>
          <div className="flex h-11 rounded-lg overflow-hidden mb-3">
            <div className="flex items-center justify-center text-white text-xs font-medium" style={{ width: `${strongPct}%`, background: '#2d8a6e', minWidth: strongPct > 3 ? 'auto' : '0' }}>
              {strongPct > 3 ? `${strongPct}%` : ''}
            </div>
            <div className="flex items-center justify-center text-white text-xs font-medium" style={{ width: `${warmPct}%`, background: '#667eea', minWidth: warmPct > 3 ? 'auto' : '0' }}>
              {warmPct > 3 ? `${warmPct}%` : ''}
            </div>
            <div className="flex items-center justify-center text-gray-600 text-xs font-medium" style={{ width: `${coldPct}%`, background: '#d4d4d4' }}>
              {analytics.neverMessagedPct}% Never Messaged
            </div>
          </div>
          <div className="flex gap-4 text-sm text-live-text-secondary">
            <span>● Strong ({analytics.strengthCounts.strong})</span>
            <span style={{ color: '#667eea' }}>● Warm ({analytics.strengthCounts.warm})</span>
            <span style={{ color: '#d4d4d4' }}>● Cold ({analytics.strengthCounts.cold})</span>
          </div>
        </div>
      </div>

      {/* Big Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="card-body text-center py-6">
            <div className="text-3xl font-light text-live-accent">{analytics.messaged}</div>
            <div className="text-sm text-live-text-secondary">Ever Messaged</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center py-6">
            <div className="text-3xl font-light text-live-danger">{analytics.neverMessaged}</div>
            <div className="text-sm text-live-text-secondary">Never Messaged</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center py-6">
            <div className="text-3xl font-light">{analytics.engagementRate}%</div>
            <div className="text-sm text-live-text-secondary">Engagement Rate</div>
            <div className="text-xs text-live-text-secondary mt-1">messaged / total</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center py-6">
            <div className="text-3xl font-light text-live-warning">{analytics.dormantCount.toLocaleString()}</div>
            <div className="text-sm text-live-text-secondary">Dormant</div>
            <div className="text-xs text-live-text-secondary mt-1">no contact in 12+ months</div>
          </div>
        </div>
      </div>

      {/* Editorial — AI replaces hardcoded "The Opportunity" block */}
      {opportunityInsight ? (
        <StructuredInsightCard insight={opportunityInsight} label="THE OPPORTUNITY" />
      ) : (
        <div className="bg-live-primary text-white p-6 rounded-xl mb-6">
          <div className="text-xs font-semibold tracking-wider uppercase text-live-accent mb-2">The Opportunity</div>
          <p className="text-sm opacity-90 leading-relaxed">
            Most professionals never message 90% of their connections. In that {analytics.neverMessagedPct}% are dormant relationships
            with executives, former colleagues in buying roles, and potential clients who already know your name.
            The network is built—now it needs to be worked.
          </p>
        </div>
      )}

      {/* Charts & Analysis */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">Relationship Strength</div>
          <div className="card-body">
            <p className="text-xs text-live-text-secondary mb-4">
              Based on your messaging history. <strong>Strong</strong> = messaged in the last 6 months.
              {' '}<strong>Warm</strong> = messaged, but not recently.
              {' '}<strong>Cold</strong> = connected but never messaged.
            </p>
            <div className="h-56"><canvas ref={relationshipChartRef}></canvas></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Dormancy Analysis</div>
          <div className="card-body">
            <p className="text-xs text-live-text-secondary mb-4">
              Dormant connections haven't had any message exchange with you in 12+ months. These are people who already know you — reactivation is often easier than cold outreach.
            </p>
            {firstCat && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span>Dormant {firstCat}</span>
                  <span className="text-live-danger">{dormantInCat} <span className="text-live-text-secondary text-xs">of {catTotal}</span></span>
                </div>
                <div className="h-2 bg-live-border rounded-full overflow-hidden">
                  <div className="h-full bg-live-danger rounded-full" style={{ width: catTotal ? `${(dormantInCat / catTotal) * 100}%` : '0%' }}></div>
                </div>
              </div>
            )}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Total Dormant</span>
                <span>{analytics.dormantCount} <span className="text-live-text-secondary text-xs">of {analytics.totalConnections}</span></span>
              </div>
              <div className="h-2 bg-live-border rounded-full overflow-hidden">
                <div className="h-full bg-live-warning rounded-full" style={{ width: `${(analytics.dormantCount / analytics.totalConnections) * 100}%` }}></div>
              </div>
            </div>

            {dormantInCat > 0 && firstCat && (
              <div className="mt-6 p-4 bg-live-bg-warm rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Dormant {firstCat} Opportunity</h4>
                <p className="text-sm text-live-text-secondary mb-3">
                  {dormantInCat} {firstCat.toLowerCase()} haven't heard from you in 12+ months.
                </p>
                <div className="flex flex-wrap gap-2">
                  {contacts.filter(c => c.categories?.[firstCat] && c.isDormant).slice(0, 4).map(c => (
                    <a
                      key={c.id}
                      href={c.linkedInUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-white border border-live-border rounded-full text-xs hover:border-live-accent"
                    >
                      {c.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SKILLS TAB
// ============================================
function SkillsTab({ analytics, aiScreen }) {
  const endorsementChartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    chartInstance.current?.destroy()

    if (endorsementChartRef.current && analytics.topEndorsedSkills?.length) {
      chartInstance.current = new Chart(endorsementChartRef.current, {
        type: 'bar',
        data: {
          labels: analytics.topEndorsedSkills.map(s => s[0].substring(0, 20)),
          datasets: [{
            data: analytics.topEndorsedSkills.map(s => s[1]),
            backgroundColor: '#667eea',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      })
    }

    return () => chartInstance.current?.destroy()
  }, [analytics])

  const skills = analytics.skills?.map(s => s['Name'] || s['name'] || s).filter(Boolean) || []

  return (
    <div>
      <div className="section-label">Expertise Profile</div>
      <h2 className="section-title mb-2">Your Skills & Endorsements</h2>
      <p className="text-live-text-secondary mb-6">What you claim vs. what others validate.</p>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">Your Listed Skills</div>
          <div className="card-body">
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                {skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-live-bg-warm border border-live-border rounded-full text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-live-text-secondary">Upload Skills.csv to see your listed skills.</p>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header">Most Endorsed Skills</div>
          <div className="card-body">
            {analytics.topEndorsedSkills?.length > 0 ? (
              <div className="h-64"><canvas ref={endorsementChartRef}></canvas></div>
            ) : (
              <p className="text-live-text-secondary">Upload Endorsement_Received_Info.csv to see endorsement data.</p>
            )}
          </div>
        </div>
      </div>

      {/* AI Insight Card — below endorsers */}
      {aiScreen?.expertise_insight && (
        <StructuredInsightCard insight={aiScreen.expertise_insight} label="EXPERTISE INSIGHT" />
      )}

      {/* Top Endorsers */}
      <div className="card">
        <div className="card-header">Top Endorsers</div>
        <div className="card-body">
          <p className="text-sm text-live-text-secondary mb-4">People who validate your expertise most frequently.</p>
          {analytics.topEndorsers?.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Skills Endorsed</th>
                  <th className="pb-3">LinkedIn</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topEndorsers.map(([name, data]) => {
                  const capitalized = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                  return (
                    <tr key={name} className="border-b border-live-border">
                      <td className="py-3 font-medium">{capitalized}</td>
                      <td className="py-3 text-sm text-live-text-secondary">
                        {data.count} ({data.skills.slice(0, 3).join(', ')}{data.skills.length > 3 ? '...' : ''})
                      </td>
                      <td className="py-3">
                        <a
                          href={`https://linkedin.com/search/results/all/?keywords=${encodeURIComponent(capitalized)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1 border border-live-border rounded hover:bg-live-bg-warm"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-live-text-secondary">Upload Endorsement_Received_Info.csv to see your endorsers.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// CONTENT TAB
// ============================================
function ContentTab({ analytics, aiScreen }) {
  const postingChartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    chartInstance.current?.destroy()

    if (postingChartRef.current && Object.keys(analytics.postsByMonth || {}).length > 0) {
      const months = Object.keys(analytics.postsByMonth).sort().slice(-12)
      chartInstance.current = new Chart(postingChartRef.current, {
        type: 'bar',
        data: {
          labels: months.map(m => {
            const [y, mo] = m.split('-')
            return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(mo) - 1] + ' ' + y.slice(2)
          }),
          datasets: [{
            data: months.map(m => analytics.postsByMonth[m]),
            backgroundColor: '#c9a227',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      })
    }

    return () => chartInstance.current?.destroy()
  }, [analytics])

  if (!analytics.shares || analytics.shares.length === 0) {
    return (
      <div>
        <div className="section-label">Thought Leadership</div>
        <h2 className="section-title mb-6">Your Content Activity</h2>
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-live-text-secondary mb-2">No content data found.</p>
            <p className="text-sm text-live-text-secondary">Upload Shares.csv from your LinkedIn export to analyze your posting patterns.</p>
          </div>
        </div>
      </div>
    )
  }

  const monthsSinceFirst = analytics.firstPost ? Math.max(1, Math.ceil((new Date() - analytics.firstPost) / (1000 * 60 * 60 * 24 * 30))) : 1
  const postsPerMonth = (analytics.totalPosts / monthsSinceFirst).toFixed(1)
  const daysSinceLast = analytics.lastPost ? Math.floor((new Date() - analytics.lastPost) / (1000 * 60 * 60 * 24)) : 0
  const sortedThemes = Object.entries(analytics.themeCounts || {}).sort((a, b) => b[1] - a[1])
  const topTheme = sortedThemes[0]?.[0] || 'various topics'
  const activityLevel = postsPerMonth >= 2 ? 'active' : postsPerMonth >= 0.5 ? 'moderate' : 'light'

  // AI or local content strategy insight
  const contentInsight = aiScreen?.content_strategy_insight || null

  return (
    <div>
      <div className="section-label">Thought Leadership</div>
      <h2 className="section-title mb-2">Your Content Activity</h2>
      <p className="text-live-text-secondary mb-6">Posting patterns, themes, and engagement opportunities.</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card border-l-4 border-l-live-accent">
          <div className="card-body py-4">
            <div className="text-2xl font-light">{analytics.totalPosts}</div>
            <div className="text-sm text-live-text-secondary">Total Posts</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-4">
            <div className="text-2xl font-light">{postsPerMonth}</div>
            <div className="text-sm text-live-text-secondary">Posts/Month</div>
          </div>
        </div>
        <div className={`card border-l-4 ${daysSinceLast > 30 ? 'border-l-live-danger' : 'border-l-live-success'}`}>
          <div className="card-body py-4">
            <div className="text-2xl font-light">{daysSinceLast}</div>
            <div className="text-sm text-live-text-secondary">Days Since Last</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-4">
            <div className="text-2xl font-light">{Object.keys(analytics.themeCounts || {}).length}</div>
            <div className="text-sm text-live-text-secondary">Themes Covered</div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <div className="card-header">Posting Timeline</div>
          <div className="card-body">
            <div className="h-64"><canvas ref={postingChartRef}></canvas></div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">Content Themes</div>
          <div className="card-body">
            {sortedThemes.length > 0 ? (
              sortedThemes.map(([theme, count]) => (
                <div key={theme} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{theme}</span>
                    <span className="text-live-text-secondary">{count} posts</span>
                  </div>
                  <div className="h-2 bg-live-border rounded-full overflow-hidden">
                    <div className="h-full bg-live-accent rounded-full" style={{ width: `${(count / analytics.totalPosts) * 100}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-live-text-secondary">Post commentary needed to detect themes.</p>
            )}
          </div>
        </div>
      </div>

      {/* Editorial — AI replaces hardcoded content strategy block */}
      {contentInsight ? (
        <StructuredInsightCard insight={contentInsight} label="CONTENT STRATEGY INSIGHT" />
      ) : (
        <div className="bg-live-primary text-white p-6 rounded-xl">
          <div className="text-xs font-semibold tracking-wider uppercase text-live-accent mb-2">Content Strategy Insight</div>
          <p className="text-sm opacity-90 leading-relaxed">
            You're a <strong>{activityLevel} content creator</strong> with {analytics.totalPosts} posts, primarily focused on <strong>{topTheme}</strong>.
            {daysSinceLast > 30
              ? ` It's been ${daysSinceLast} days since your last post—consider re-engaging your network with fresh insights.`
              : ' Your recent activity keeps you visible to your network.'}
            {' '}Consistent posting builds thought leadership and keeps you top-of-mind for opportunities.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================
// ADVOCATES TAB
// ============================================
function AdvocatesTab({ analytics, aiScreen }) {
  const recommendations = analytics.recommendations || []

  return (
    <div>
      <div className="section-label">Your Champions</div>
      <h2 className="section-title mb-2">People Who Advocate for You</h2>
      <p className="text-live-text-secondary mb-6">Written recommendations are the strongest form of professional validation.</p>

      {/* AI Insight Card — above recommendations */}
      {aiScreen?.advocate_insight && (
        <StructuredInsightCard insight={aiScreen.advocate_insight} label="ADVOCATE INSIGHT" />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card border-l-4 border-l-live-accent">
          <div className="card-body py-6 text-center">
            <div className="text-3xl font-light text-live-accent">{recommendations.length}</div>
            <div className="text-sm text-live-text-secondary">Written Recommendations</div>
          </div>
        </div>
        <div className="card">
          <div className="card-body py-6 text-center">
            <div className="text-3xl font-light">{new Set(recommendations.map(r => r['Company'])).size}</div>
            <div className="text-sm text-live-text-secondary">Companies Represented</div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="flex justify-between mb-3">
                  <div>
                    <p className="font-semibold">{rec['First Name'] || ''} {rec['Last Name'] || ''}</p>
                    <p className="text-sm text-live-text-secondary">{rec['Job Title'] || ''} at {rec['Company'] || ''}</p>
                  </div>
                  <span className="badge badge-success">Visible</span>
                </div>
                <p className="text-sm italic leading-relaxed text-live-text">
                  "{(rec['Text'] || '').substring(0, 400)}{(rec['Text'] || '').length > 400 ? '...' : ''}"
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-live-text-secondary mb-2">No recommendations found.</p>
            <p className="text-sm text-live-text-secondary">Upload Recommendations_Received.csv to see your advocates.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// PRIORITIES TAB
// ============================================
function PrioritiesTab({ analytics, contacts, aiScreen, settings }) {
  const [trackerAdded, setTrackerAdded] = useState({})

  const handleAddToTracker = async (contact) => {
    if (!settings?.show_tracker) return
    try {
      await api.addToTracker({
        contact_name: contact.name,
        contact_company: contact.company || '',
        contact_position: contact.title || contact.position || '',
      })
      setTrackerAdded(prev => ({ ...prev, [contact.name]: true }))
    } catch (err) {
      console.error('Failed to add to tracker:', err)
    }
  }
  const catNames = Object.keys(analytics.categoryCounts)

  // Use AI priorities if available, otherwise fall back to local scoring
  const aiPriorities = aiScreen?.outreach_priorities || null
  const aiPlaybooks = aiScreen?.revival_playbooks || null

  // Local scoring fallback
  const scored = contacts.map(c => {
    let score = 0
    let matchedCat = null
    if (c.categories) {
      catNames.forEach((cat, i) => {
        if (c.categories[cat]) {
          score += (30 - i * 5)
          if (!matchedCat) matchedCat = cat
        }
      })
    }
    if (c.isDormant && c.messageCount > 0) score += 15
    if (c.endorsementCount > 0) score += 10
    return { ...c, score, matchedCat }
  }).sort((a, b) => b.score - a.score)

  const dormantPriority = contacts.filter(c => c.isDormant && c.messageCount > 0).slice(0, 4)

  return (
    <div>
      <div className="section-label">Strategic Action</div>
      <h2 className="section-title mb-2">Where the Leverage Is</h2>
      <p className="text-live-text-secondary mb-6">Prioritized contacts based on strategic value and relationship status.</p>

      {/* Priority Table */}
      <div className="card mb-6">
        <div className="card-header">Strategic Outreach Priorities</div>
        <div className="card-body overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Name</th>
                <th className="pb-3 pr-4">Company / Title</th>
                <th className="pb-3 pr-4">Why</th>
                <th className="pb-3 pr-4">Strength</th>
                {settings?.show_tracker && <th className="pb-3"></th>}
              </tr>
            </thead>
            <tbody>
              {aiPriorities ? (
                aiPriorities.slice(0, 10).map((p, i) => (
                  <tr key={i} className="border-b border-live-border">
                    <td className="py-3 pr-4">
                      <span className={`badge ${i < 2 ? 'badge-danger' : i < 5 ? 'badge-accent' : 'badge-info'}`}>
                        {p.rank || i + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium">{p.name}</td>
                    <td className="py-3 pr-4">
                      <div className="text-sm">{p.title || 'N/A'}</div>
                      <div className="text-xs text-live-text-secondary">{p.company}</div>
                    </td>
                    <td className="py-3 pr-4 text-sm">{stripMarkdown(p.why_prioritized || p.category || '')}</td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${p.relationship_strength === 'strong' ? 'badge-success' : p.relationship_strength === 'warm' ? 'badge-accent' : 'badge-info'}`}>
                        {p.relationship_strength || 'cold'}
                      </span>
                    </td>
                    {settings?.show_tracker && (
                      <td className="py-3">
                        <button
                          onClick={() => handleAddToTracker(p)}
                          disabled={trackerAdded[p.name]}
                          className="text-xs px-2 py-1 border border-live-border rounded hover:bg-live-bg-warm disabled:opacity-50 transition-colors"
                        >
                          {trackerAdded[p.name] ? 'Added' : '+ Track'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                scored.slice(0, 10).map((c, i) => (
                  <tr key={c.id} className="border-b border-live-border">
                    <td className="py-3 pr-4">
                      <span className={`badge ${i < 2 ? 'badge-danger' : i < 5 ? 'badge-accent' : 'badge-info'}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="py-3 pr-4 font-medium">{c.name}</td>
                    <td className="py-3 pr-4">
                      <div className="text-sm">{c.position || 'N/A'}</div>
                      <div className="text-xs text-live-text-secondary">{c.company}</div>
                    </td>
                    <td className="py-3 pr-4 text-sm">{c.matchedCat || (c.isDormant ? 'Gone dormant' : 'Strategic')}</td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${c.relStrength === 'strong' ? 'badge-success' : c.relStrength === 'warm' ? 'badge-accent' : 'badge-info'}`}>
                        {c.relStrength}
                      </span>
                    </td>
                    {settings?.show_tracker && (
                      <td className="py-3">
                        <button
                          onClick={() => handleAddToTracker(c)}
                          disabled={trackerAdded[c.name]}
                          className="text-xs px-2 py-1 border border-live-border rounded hover:bg-live-bg-warm disabled:opacity-50 transition-colors"
                        >
                          {trackerAdded[c.name] ? 'Added' : '+ Track'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revival Playbooks */}
      <h3 className="section-title text-lg mb-4">Revival Playbooks</h3>
      <p className="text-live-text-secondary mb-4">
        {aiPlaybooks ? 'AI-crafted personalized messages for high-value dormant relationships.' : 'Copy-paste openers for high-value dormant relationships.'}
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {aiPlaybooks ? (
          aiPlaybooks.map((p, i) => (
            <div key={i} className="card">
              <div className="card-body">
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-live-text-secondary mb-2">{p.title}</div>
                {p.context_hook && (
                  <div className="text-xs text-live-accent mb-2">{stripMarkdown(p.context_hook)}</div>
                )}
                <div className="text-sm bg-live-bg-warm p-4 rounded-lg leading-relaxed">
                  {stripMarkdown(p.message_template)}
                </div>
              </div>
            </div>
          ))
        ) : dormantPriority.length > 0 ? (
          dormantPriority.map(c => (
            <div key={c.id} className="card">
              <div className="card-body">
                <div className="font-semibold">{c.name}</div>
                <div className="text-sm text-live-text-secondary mb-3">{c.position} at {c.company}</div>
                <div className="text-sm bg-live-bg-warm p-4 rounded-lg italic leading-relaxed">
                  "Hi {c.firstName || c.name.split(' ')[0]}, hope you're doing well! It's been a while since we connected.
                  I've been focused on [your focus] and would love to catch up. Any chance for a brief call?"
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 card">
            <div className="card-body text-center text-live-text-secondary">
              Upload messages.csv to identify dormant relationships with history.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// INFERENCES TAB
// ============================================
function InferencesTab({ analytics, aiScreen }) {
  const inferences = analytics.inferences || []
  const adtargeting = analytics.adtargeting || []

  if (inferences.length === 0 && adtargeting.length === 0) {
    return (
      <div>
        <div className="section-label">Reality Check</div>
        <h2 className="section-title mb-6">How LinkedIn Sees You</h2>
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-live-text-secondary mb-2">No inference data found.</p>
            <p className="text-sm text-live-text-secondary">Upload Inferences_about_you.csv and/or Ad_Targeting.csv to see how LinkedIn perceives you.</p>
          </div>
        </div>
      </div>
    )
  }

  const adData = adtargeting[0] || {}
  const inferredSkills = (adData['Member Skills'] || '').split(';').slice(0, 50)

  // Use AI absurd inferences or local detection
  const absurdSkills = aiScreen?.absurd_inferences || inferredSkills.filter(s =>
    ['Nuclear Engineering', 'Agricultural Production', 'Flight Training', 'Scripture', 'Knee', 'Mosaics', 'Celestial Navigation'].some(a => s.includes(a))
  )

  // AI mismatches
  const mismatches = aiScreen?.mismatches || null

  return (
    <div>
      <div className="section-label">Reality Check</div>
      <h2 className="section-title mb-2">How LinkedIn Sees You</h2>
      <p className="text-live-text-secondary mb-6">What LinkedIn infers about you for ad targeting—often wrong, sometimes amusing.</p>

      {/* AI Insight Card */}
      {aiScreen?.reality_check_insight && (
        <AIInsightCard insight={aiScreen.reality_check_insight} label="REALITY CHECK" />
      )}

      {inferences.length > 0 && (
        <div className="card mb-6">
          <div className="card-header">LinkedIn's Inferences About You</div>
          <div className="card-body overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                  <th className="pb-3 pr-4">Category</th>
                  <th className="pb-3 pr-4">Inference</th>
                  <th className="pb-3">Value</th>
                </tr>
              </thead>
              <tbody>
                {inferences.map((inf, i) => (
                  <tr key={i} className="border-b border-live-border">
                    <td className="py-3 pr-4 text-sm">{inf['Category'] || ''}</td>
                    <td className="py-3 pr-4 text-sm">{inf['Type of inference'] || inf['Description'] || ''}</td>
                    <td className="py-3">
                      <span className={`badge ${inf['Inference'] === 'true' || inf['Inference'] === 'Yes' ? 'badge-success' : 'badge-info'}`}>
                        {inf['Inference'] || ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adData['Member Skills'] && (
        <div className="card mb-6">
          <div className="card-header">Ad Targeting Data (What LinkedIn Sells)</div>
          <div className="card-body">
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="text-sm font-semibold mb-2">Seniority</h4>
                <span className={`badge ${adData['Job Seniorities']?.includes('Entry') ? 'badge-danger' : 'badge-success'}`}>
                  {adData['Job Seniorities'] || 'N/A'}
                </span>
                {adData['Job Seniorities']?.includes('Entry') && (
                  <span className="text-live-danger text-sm ml-2">Wrong!</span>
                )}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Experience</h4>
                <span className="badge badge-success">{adData['Years of Experience'] || 'N/A'}</span>
              </div>
            </div>

            {absurdSkills.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Absurd Inferred Skills</h4>
                <div className="flex flex-wrap gap-2 mb-2">
                  {absurdSkills.map((s, i) => (
                    <span key={i} className="px-3 py-1 bg-live-bg-warm border border-live-border rounded-full text-sm">
                      {typeof s === 'string' ? s.trim() : s}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-live-text-secondary">LinkedIn infers 800+ skills for ad targeting. Many are... creative.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Mismatches */}
      {mismatches && mismatches.length > 0 && (
        <div className="card">
          <div className="card-header">Concerning Mismatches</div>
          <div className="card-body">
            <p className="text-sm text-live-text-secondary mb-3">These inferences are wrong in ways that could affect your visibility to recruiters and job recommendations.</p>
            <ul className="space-y-2">
              {mismatches.map((m, i) => {
                if (typeof m === 'string') {
                  return (
                    <li key={i} className="text-sm p-3 bg-live-danger/10 border-l-4 border-live-danger rounded-r-lg">
                      {stripMarkdown(m)}
                    </li>
                  )
                }
                // Structured object: {category, issue, impact} or {description/mismatch}
                const text = m.description || m.mismatch || m.issue || ''
                const category = m.category || ''
                const impact = m.impact || ''
                return (
                  <li key={i} className="text-sm p-3 bg-live-danger/10 border-l-4 border-live-danger rounded-r-lg">
                    {category && <span className="font-semibold">{stripMarkdown(category)}: </span>}
                    {stripMarkdown(text)}
                    {impact && <span className="block text-xs text-live-text-secondary mt-1">Impact: {stripMarkdown(impact)}</span>}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
