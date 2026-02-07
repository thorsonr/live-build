import { useState } from 'react'
import { api } from '../lib/api'

export default function StrategyAnalysis({ analytics, onClose }) {
  const [focus, setFocus] = useState('all')
  const [strategy, setStrategy] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generateStrategy = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.generateStrategy({ focus })
      setStrategy(response.strategy)
    } catch (err) {
      // Fallback for demo when API unavailable
      setStrategy(generateLocalStrategy(analytics, focus))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-live-border flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">Network Strategy Analysis</h2>
            <p className="text-sm text-live-text-secondary mt-1">
              Get AI-powered insights on how to grow and maintain your network
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-live-text-secondary hover:text-live-text text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Network Summary */}
          <div className="mb-6 p-4 bg-live-bg-warm rounded-lg">
            <h3 className="font-semibold mb-3">Your Network at a Glance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-live-text-secondary">Total:</span>
                <span className="ml-2 font-medium">{analytics.totalConnections}</span>
              </div>
              <div>
                <span className="text-live-text-secondary">Dormant:</span>
                <span className="ml-2 font-medium text-live-warning">{analytics.dormantCount}</span>
              </div>
              <div>
                <span className="text-live-text-secondary">Engagement:</span>
                <span className="ml-2 font-medium">{analytics.engagementRate}%</span>
              </div>
              <div>
                <span className="text-live-text-secondary">Years:</span>
                <span className="ml-2 font-medium">{analytics.yearsBuilding}</span>
              </div>
            </div>
          </div>

          {/* Focus Selection */}
          <div className="mb-6">
            <label className="label">Analysis Focus</label>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'Full Network' },
                { id: 'dormant', label: 'Dormant Contacts' },
                { id: 'executives', label: 'Executives' },
                { id: 'growth', label: 'Growth Opportunities' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFocus(opt.id)}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    focus === opt.id
                      ? 'bg-live-primary text-white'
                      : 'bg-live-bg-warm text-live-text-secondary hover:bg-live-border'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          {!strategy && (
            <button
              onClick={generateStrategy}
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Analyzing your network...' : 'Generate Strategy Analysis'}
            </button>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Strategy Output */}
          {strategy && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Your Network Strategy</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(strategy)}
                  className="text-sm text-live-info hover:underline"
                >
                  Copy to clipboard
                </button>
              </div>
              <div className="prose prose-sm max-w-none bg-live-bg-warm p-6 rounded-lg">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {strategy}
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => { setStrategy(''); generateStrategy(); }}
                  disabled={loading}
                  className="btn btn-secondary flex-1"
                >
                  {loading ? 'Generating...' : 'Regenerate'}
                </button>
                <button onClick={onClose} className="btn btn-primary flex-1">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Fallback local strategy generation
function generateLocalStrategy(analytics, focus) {
  const dormantPct = analytics.totalConnections > 0
    ? ((analytics.dormantCount / analytics.totalConnections) * 100).toFixed(1)
    : 0

  return `## Network Analysis Summary

### Key Observations
• Your network of ${analytics.totalConnections.toLocaleString()} connections has been built over ${analytics.yearsBuilding} years
• Current engagement rate is ${analytics.engagementRate}% - ${analytics.engagementRate > 15 ? 'above average for professionals' : 'there\'s room for improvement'}
• ${analytics.dormantCount} contacts (${dormantPct}%) are dormant (2+ years, low engagement)

### Top Categories in Your Network
${Object.entries(analytics.categoryCounts || {}).map(([cat, count]) => `• ${cat}: ${count} connections`).join('\n')}

### Identified Opportunities

1. **Dormant Relationship Revival**
   You have ${analytics.dormantCount} dormant contacts who haven't been engaged recently. These represent significant untapped potential - many may have changed roles, gained influence, or moved to companies of interest.

2. **Engagement Improvement**
   With an ${analytics.engagementRate}% engagement rate, focusing on even 10% of your dormant contacts could significantly expand your active network.

3. **Strategic Categories**
   ${analytics.categoryCounts?.['Executives'] ? `You have ${analytics.categoryCounts['Executives']} executive-level connections - consider nurturing these high-value relationships.` : 'Consider connecting with more executive-level professionals to expand your influence.'}

### Recommended Actions (Next 30 Days)

1. **Week 1**: Reach out to 5 dormant contacts who are in your target industry or companies
2. **Week 2**: Engage with posts from 10 connections you haven't interacted with recently
3. **Week 3**: Schedule virtual coffee chats with 3 warm connections
4. **Week 4**: Request introductions to 2-3 second-degree connections through your strongest relationships

### Priority Contacts to Reconnect

Based on your network composition, focus on:
• Dormant executives at companies you're interested in
• Former colleagues who have changed companies
• Contacts in your strongest category who you haven't engaged recently

---

*This analysis is based on your uploaded LinkedIn data. For more personalized AI-powered insights, ensure your API connection is configured.*`
}
