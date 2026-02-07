import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../lib/ThemeContext'
import { useData } from '../lib/DataContext'
import { api } from '../lib/api'

const BYOK_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (Fast, low cost)' },
  { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4 (Balanced)' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5 (Most capable)' },
]

const TIER_LABELS = {
  trial: 'Free Trial',
  active: 'Pro',
  max: 'Max',
  byok: 'BYOK',
}

const TIER_BADGE_CLASSES = {
  trial: 'badge badge-accent',
  active: 'badge badge-success',
  max: 'badge badge-success',
  byok: 'badge badge-info',
}

export default function Settings({ user, settings, onSettingsChange }) {
  const { theme, setTheme } = useTheme()
  const { clearData } = useData()
  const navigate = useNavigate()
  const [storageMode, setStorageMode] = useState('cloud')
  const [apiKey, setApiKey] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [preferredModel, setPreferredModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [archives, setArchives] = useState([])
  const [archivesLoading, setArchivesLoading] = useState(true)
  const [selectedArchive, setSelectedArchive] = useState(null)
  const [archiving, setArchiving] = useState(false)
  const [showAllArchives, setShowAllArchives] = useState(false)
  const [quota, setQuota] = useState(null)

  const tier = settings?.tier || 'trial'
  const showByok = settings?.show_byok !== false
  const trialExpired = settings?.trial_expired === true

  useEffect(() => {
    api.getSettings().then(s => {
      setHasApiKey(s.has_api_key || false)
      setPreferredModel(s.preferred_model || '')
      if (s.storage_mode) setStorageMode(s.storage_mode)
      if (onSettingsChange) onSettingsChange(s)
    }).catch(() => {})

    api.getArchives().then(res => {
      setArchives(res.archives || [])
    }).catch(() => {}).finally(() => setArchivesLoading(false))

    api.getUsageQuota().then(q => setQuota(q)).catch(() => {})
  }, [])

  const handleSaveApiKey = async () => {
    setSaving(true)
    setMessage('')

    try {
      await api.updateSettings({ api_key: apiKey })
      setHasApiKey(true)
      setApiKey('')
      setMessage('API key saved successfully')
      // Refresh settings to update tier
      const s = await api.getSettings()
      if (onSettingsChange) onSettingsChange(s)
    } catch (err) {
      setMessage(err.message || 'Failed to save API key')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveApiKey = async () => {
    setSaving(true)
    setMessage('')

    try {
      await api.updateSettings({ api_key: null })
      setHasApiKey(false)
      setPreferredModel('')
      setMessage('API key removed')
      const s = await api.getSettings()
      if (onSettingsChange) onSettingsChange(s)
    } catch (err) {
      setMessage(err.message || 'Failed to remove API key')
    } finally {
      setSaving(false)
    }
  }

  const handleModelChange = async (model) => {
    setPreferredModel(model)
    try {
      await api.updateSettings({ preferred_model: model || null })
    } catch (err) {
      setMessage(err.message || 'Failed to save model preference')
    }
  }

  const handleArchiveAndReset = async () => {
    if (!confirm('Archive your current analysis and start fresh? Your analysis history will be preserved.')) {
      return
    }

    setArchiving(true)
    try {
      await api.archiveAndReset()
      localStorage.removeItem('live_contacts')
      clearData()
      navigate('/dashboard')
    } catch (err) {
      setMessage('Failed to archive data: ' + (err.message || 'Unknown error'))
      setArchiving(false)
    }
  }

  const handleDeleteAllCloud = async () => {
    if (!confirm('PERMANENTLY delete all cloud data including analysis history? This cannot be undone.')) {
      return
    }
    if (!confirm('Are you absolutely sure? All archived analyses will be lost forever.')) {
      return
    }

    try {
      await api.deleteAllData()
      localStorage.removeItem('live_contacts')
      clearData()
      setArchives([])
      setMessage('All cloud data permanently deleted.')
    } catch (err) {
      setMessage('Failed to delete data: ' + (err.message || 'Unknown error'))
    }
  }

  // Trial countdown
  const trialDaysLeft = settings?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(settings.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)))
    : null

  const tierDescription = {
    trial: trialExpired
      ? 'Your free trial has ended'
      : `${trialDaysLeft != null ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left` : '5-day free trial'} with 1 AI analysis and 2 AI chat questions`,
    active: '4 AI analyses per month with Sonnet',
    max: 'Unlimited chat & Custom Message Generator',
    byok: 'Unlimited analyses with your own API key',
  }

  return (
    <main className="max-w-2xl mx-auto px-8 py-8">
      <h1 className="font-display text-2xl font-semibold mb-8 text-live-text">Settings</h1>

      {message && (
        <div className="mb-6 p-3 rounded-lg bg-live-accent-soft border border-live-accent text-live-text text-sm">
          {message}
        </div>
      )}

      {/* Account Info */}
      <div className="card mb-6">
        <div className="card-header">Account</div>
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="font-medium text-live-text">{user?.email}</p>
              <p className="text-sm text-live-text-secondary">{tierDescription[tier]}</p>
            </div>
            <span className={TIER_BADGE_CLASSES[tier] || 'badge badge-accent'}>
              {TIER_LABELS[tier] || 'Free Trial'}
            </span>
          </div>

          {/* Inline usage counts */}
          {quota && (
            <div className="text-sm text-live-text-secondary mb-3">
              {quota.analysis_used} / {(tier === 'byok' || tier === 'max') ? '\u221E' : quota.analysis_limit} analyses
              {' \u00B7 '}
              {quota.chat_used} / {(tier === 'byok' || tier === 'max') ? '\u221E' : quota.chat_limit} messages this month
            </div>
          )}

          {/* Upgrade link for non-max/byok users */}
          {(tier === 'trial' || tier === 'active') && (
            <a href="#upgrade" className="text-sm text-live-accent hover:underline">
              Upgrade for Unlimited AI Messaging
            </a>
          )}

          {tier === 'trial' && !trialExpired && trialDaysLeft != null && (
            <div className="p-3 bg-live-bg-warm rounded-lg text-sm mt-3 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-live-text-secondary">Trial expires</span>
                <span className="font-medium text-live-text">
                  {trialDaysLeft === 0 ? 'Today' : `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}`}
                </span>
              </div>
            </div>
          )}

          {trialExpired && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mt-3 mb-3">
              Your free trial has ended. Upgrade to Pro or add your own API key to continue.
            </div>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="card mb-6">
        <div className="card-header">Appearance</div>
        <div className="card-body space-y-4">
          <p className="text-sm text-live-text-secondary">
            Choose your preferred color theme.
          </p>

          <div className="flex gap-3">
            {[
              { value: 'light', label: 'Light', icon: '☀️' },
              { value: 'dark', label: 'Dark', icon: '🌙' },
              { value: 'system', label: 'System', icon: '💻' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`flex-1 p-4 rounded-lg border text-center transition-colors ${
                  theme === option.value
                    ? 'border-live-accent bg-live-accent-soft'
                    : 'border-live-border hover:bg-live-bg-warm'
                }`}
              >
                <div className="text-2xl mb-1">{option.icon}</div>
                <div className={`text-sm font-medium ${theme === option.value ? 'text-live-accent' : 'text-live-text'}`}>
                  {option.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Storage Mode */}
      <div className="card mb-6">
        <div className="card-header">Data Storage</div>
        <div className="card-body space-y-4">
          <p className="text-sm text-live-text-secondary">
            Choose how your LinkedIn data is stored.
          </p>

          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-live-border cursor-pointer hover:bg-live-bg-warm transition-colors">
              <input
                type="radio"
                name="storage"
                value="cloud"
                checked={storageMode === 'cloud'}
                onChange={(e) => setStorageMode(e.target.value)}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-live-text">Cloud Sync</p>
                <p className="text-sm text-live-text-secondary">
                  Data synced securely. Access from any device. Faster experience on return visits.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 rounded-lg border border-live-border cursor-pointer hover:bg-live-bg-warm transition-colors">
              <input
                type="radio"
                name="storage"
                value="local"
                checked={storageMode === 'local'}
                onChange={(e) => setStorageMode(e.target.value)}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-live-text">Local Only</p>
                <p className="text-sm text-live-text-secondary">
                  Data stays in your browser. Re-upload each session. Requires your own Claude API key.
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* BYOK API Key — hidden for free tier unless show_byok is true */}
      {showByok && (
        <div className="card mb-6">
          <div className="card-header">
            Bring Your Own API Key
            <span className="badge badge-info ml-2 text-xs">Optional</span>
          </div>
          <div className="card-body space-y-4">
            <p className="text-sm text-live-text-secondary">
              Already have a Claude API key? Connect it to use your own AI quota instead of ours.
              This is ideal if you want unlimited AI features or prefer to use a specific AI model.
            </p>

            <div className="p-3 bg-live-bg-warm rounded-lg text-sm">
              <p className="font-medium mb-1 text-live-text">When to use BYOK:</p>
              <ul className="text-live-text-secondary space-y-1">
                <li>- You want unlimited AI analyses</li>
                <li>- You want to use your existing Anthropic account</li>
                <li>- You prefer local-only data storage</li>
              </ul>
            </div>

            {hasApiKey ? (
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-live-text">API key saved</p>
                    <p className="text-xs text-live-text-secondary">Your key is encrypted and stored securely.</p>
                  </div>
                  <button
                    onClick={handleRemoveApiKey}
                    className="text-xs text-live-danger hover:underline"
                    disabled={saving}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="label">Your Claude API Key</label>
                  <input
                    type="password"
                    className="input"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-ant-..."
                  />
                </div>

                <button
                  onClick={handleSaveApiKey}
                  className="btn btn-primary"
                  disabled={saving || !apiKey}
                >
                  {saving ? 'Saving...' : 'Save API Key'}
                </button>
              </>
            )}

            {hasApiKey && (
              <div>
                <label className="label">Preferred AI Model</label>
                <select
                  className="input"
                  value={preferredModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                >
                  <option value="">Platform default</option>
                  {BYOK_MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <p className="text-xs text-live-text-secondary mt-1">
                  Choose which Claude model to use with your API key. More capable models cost more per call.
                </p>
              </div>
            )}

            <p className="text-xs text-live-text-secondary">
              Get your API key from{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-live-info hover:underline"
              >
                console.anthropic.com
              </a>
              . Your key is encrypted and never shared.
            </p>
          </div>
        </div>
      )}

      {/* Analysis History */}
      <div className="card mb-6">
        <div className="card-header">Analysis History</div>
        <div className="card-body">
          {archivesLoading ? (
            <p className="text-sm text-live-text-secondary">Loading history...</p>
          ) : archives.length === 0 ? (
            <p className="text-sm text-live-text-secondary">
              No past analyses yet. When you archive and upload new data, previous analyses will appear here.
            </p>
          ) : (
            <div className="space-y-3">
              {(showAllArchives ? archives : archives.slice(0, 3)).map((archive) => {
                const date = new Date(archive.archived_at)
                // Handle both parsed objects and double-encoded strings from older archives
                let aiData = archive.ai_analysis
                if (typeof aiData === 'string') {
                  try { aiData = JSON.parse(aiData) } catch { aiData = null }
                }
                const screens = aiData?.screens || aiData || {}
                const headline = screens?.summary?.executive_summary?.report_headline
                  || aiData?.executive_summary?.report_headline
                const hasAI = !!aiData && Object.keys(screens).length > 0

                return (
                  <button
                    key={archive.id}
                    onClick={() => setSelectedArchive({ ...archive, _parsed: aiData })}
                    className="w-full text-left p-3 rounded-lg border border-live-border hover:bg-live-bg-warm transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-live-text truncate">
                          {headline || `Analysis — ${archive.connection_count || 0} connections`}
                        </p>
                        <p className="text-xs text-live-text-secondary mt-0.5">
                          {date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' · '}{archive.connection_count || 0} connections
                          {hasAI && ' · AI analysis included'}
                        </p>
                      </div>
                      <span className="text-xs text-live-text-secondary ml-2 flex-shrink-0">View</span>
                    </div>
                    {archive.analytics_summary && (
                      <div className="mt-2 flex gap-3 text-xs text-live-text-secondary">
                        {archive.analytics_summary.strength_breakdown && (
                          <>
                            <span>Strong: {archive.analytics_summary.strength_breakdown.strong || 0}</span>
                            <span>Warm: {archive.analytics_summary.strength_breakdown.warm || 0}</span>
                            <span>Cold: {archive.analytics_summary.strength_breakdown.cold || 0}</span>
                          </>
                        )}
                        {archive.analytics_summary.engagement_rate != null && (
                          <span>Engagement: {archive.analytics_summary.engagement_rate}%</span>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
              {archives.length > 3 && (
                <button
                  onClick={() => setShowAllArchives(!showAllArchives)}
                  className="w-full text-center py-2 text-sm text-live-accent hover:underline"
                >
                  {showAllArchives ? 'Show less' : `Show ${archives.length - 3} more`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-live-danger">
        <div className="card-header text-live-danger">Danger Zone</div>
        <div className="card-body space-y-4">
          <div>
            <p className="text-sm font-medium text-live-text mb-1">Archive & Upload New Data</p>
            <p className="text-sm text-live-text-secondary mb-3">
              Save your current analysis to history and start fresh with a new LinkedIn export.
            </p>
            <button
              onClick={handleArchiveAndReset}
              disabled={archiving}
              className="btn btn-primary"
            >
              {archiving ? 'Archiving...' : 'Archive & Start Fresh'}
            </button>
          </div>

          <hr className="border-live-border" />

          <div>
            <p className="text-sm font-medium text-live-text mb-1">Delete All Cloud Data</p>
            <p className="text-sm text-live-text-secondary mb-3">
              Permanently delete all data including active analysis, connections, and archived history. This cannot be undone.
            </p>
            <button
              onClick={handleDeleteAllCloud}
              className="btn btn-danger"
            >
              Delete Everything Permanently
            </button>
          </div>
        </div>
      </div>
      {/* Analysis Slide-Out Panel */}
      {selectedArchive && (
        <ArchiveSlideOut
          archive={selectedArchive}
          onClose={() => setSelectedArchive(null)}
        />
      )}
    </main>
  )
}

function ArchiveSlideOut({ archive, onClose }) {
  const date = new Date(archive.archived_at)
  const aiData = archive._parsed
  const screens = aiData?.screens || aiData || {}

  const stripMd = (text) => {
    if (!text) return text
    return text
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/^[\s]*[-*\u2022]\s+/gm, '')
      .replace(/^#+\s+/gm, '')
  }

  // Build all insight sections
  const sections = []
  const exec = screens?.summary?.executive_summary
  if (exec?.report_headline) sections.push({ label: 'Headline', text: exec.report_headline })
  if (exec?.report_body) sections.push({ label: 'Executive Summary', text: exec.report_body })
  if (exec?.key_insight) sections.push({ label: 'Key Insight', text: exec.key_insight })
  if (screens?.network?.network_shape_insight)
    sections.push({ label: 'Network Shape', text: screens.network.network_shape_insight })
  if (screens?.relationships?.opportunity_insight)
    sections.push({ label: 'Relationships', text: screens.relationships.opportunity_insight })
  if (screens?.skills_expertise?.expertise_insight)
    sections.push({ label: 'Skills & Expertise', text: screens.skills_expertise.expertise_insight })
  if (screens?.your_content?.content_strategy_insight)
    sections.push({ label: 'Content Strategy', text: screens.your_content.content_strategy_insight })
  if (screens?.your_advocates?.advocate_insight)
    sections.push({ label: 'Advocates', text: screens.your_advocates.advocate_insight })

  // Priorities
  const priorities = screens?.priorities?.outreach_priorities
  const playbooks = screens?.priorities?.revival_playbooks

  // Inferences
  if (screens?.linkedins_view?.reality_check_insight)
    sections.push({ label: 'Reality Check', text: screens.linkedins_view.reality_check_insight })
  const absurd = screens?.linkedins_view?.absurd_inferences
  const mismatches = screens?.linkedins_view?.mismatches

  const hasContent = sections.length > 0 || priorities || playbooks

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-live-bg overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-live-bg border-b border-live-border px-6 py-4 flex justify-between items-start z-10">
          <div>
            <h2 className="font-display text-lg font-semibold text-live-text">
              {exec?.report_headline || `Analysis — ${archive.connection_count || 0} connections`}
            </h2>
            <p className="text-xs text-live-text-secondary mt-1">
              {date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              {' · '}{archive.connection_count || 0} connections
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-live-text-secondary hover:text-live-text text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Stats */}
          {archive.analytics_summary && (
            <div className="grid grid-cols-4 gap-3">
              {archive.analytics_summary.strength_breakdown && (
                <>
                  <div className="text-center p-3 rounded-lg bg-live-bg-warm">
                    <div className="text-lg font-light text-live-success">{archive.analytics_summary.strength_breakdown.strong || 0}</div>
                    <div className="text-xs text-live-text-secondary">Strong</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-live-bg-warm">
                    <div className="text-lg font-light text-live-accent">{archive.analytics_summary.strength_breakdown.warm || 0}</div>
                    <div className="text-xs text-live-text-secondary">Warm</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-live-bg-warm">
                    <div className="text-lg font-light text-live-info">{archive.analytics_summary.strength_breakdown.cold || 0}</div>
                    <div className="text-xs text-live-text-secondary">Cold</div>
                  </div>
                </>
              )}
              {archive.analytics_summary.engagement_rate != null && (
                <div className="text-center p-3 rounded-lg bg-live-bg-warm">
                  <div className="text-lg font-light">{archive.analytics_summary.engagement_rate}%</div>
                  <div className="text-xs text-live-text-secondary">Engagement</div>
                </div>
              )}
            </div>
          )}

          {/* AI Insight Sections */}
          {hasContent ? (
            <>
              {sections.map((section, i) => (
                <div key={i} className="border-l-4 border-live-accent bg-live-accent-soft rounded-r-lg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-live-accent mb-2">
                    {section.label}
                  </p>
                  <p className="text-sm text-live-text leading-relaxed whitespace-pre-line">
                    {stripMd(section.text)}
                  </p>
                </div>
              ))}

              {/* Outreach Priorities */}
              {priorities && priorities.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-live-text">Outreach Priorities</h3>
                  <div className="space-y-2">
                    {priorities.slice(0, 10).map((p, i) => (
                      <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-live-bg-warm">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${i < 2 ? 'bg-red-100 text-red-700' : i < 5 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                          {p.rank || i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-live-text">{p.name}</p>
                          <p className="text-xs text-live-text-secondary">{p.title} at {p.company}</p>
                          {p.why_prioritized && (
                            <p className="text-xs text-live-text-secondary mt-1">{stripMd(p.why_prioritized)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Revival Playbooks */}
              {playbooks && playbooks.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-live-text">Revival Playbooks</h3>
                  <div className="space-y-3">
                    {playbooks.map((p, i) => (
                      <div key={i} className="p-4 rounded-lg border border-live-border">
                        <p className="font-medium text-sm text-live-text">{p.name}</p>
                        <p className="text-xs text-live-text-secondary mb-2">{p.title}</p>
                        {p.context_hook && (
                          <p className="text-xs text-live-accent mb-2">{stripMd(p.context_hook)}</p>
                        )}
                        <div className="text-sm bg-live-bg-warm p-3 rounded-lg leading-relaxed">
                          {stripMd(p.message_template)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Absurd Inferences */}
              {absurd && absurd.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-live-text">Absurd Inferences</h3>
                  <div className="flex flex-wrap gap-2">
                    {absurd.map((item, i) => (
                      <span key={i} className="text-xs px-3 py-1 rounded-full bg-live-bg-warm text-live-text-secondary">
                        {typeof item === 'string' ? item : item.inference || JSON.stringify(item)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mismatches */}
              {mismatches && mismatches.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm mb-3 text-live-text">Concerning Mismatches</h3>
                  <div className="space-y-2">
                    {mismatches.map((m, i) => (
                      <div key={i} className="text-sm p-3 bg-red-50 border-l-4 border-red-400 rounded-r-lg text-live-text">
                        {stripMd(typeof m === 'string' ? m : m.description || m.mismatch || JSON.stringify(m))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-live-text-secondary text-center py-8">
              No AI analysis was generated for this archive. Only local analytics were captured.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
