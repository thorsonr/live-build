import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4', input: '$3.00', output: '$15.00' },
  { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', input: '$0.80', output: '$4.00' },
  { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5', input: '$3.00', output: '$15.00' },
]

export default function Admin({ user }) {
  const [activeTab, setActiveTab] = useState('ai')
  const [analytics, setAnalytics] = useState(null)
  const [users, setUsers] = useState([])
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [generating, setGenerating] = useState(false)
  const [codeConfig, setCodeConfig] = useState({ count: 5, max_uses: 1, expires_days: 30, prefix: 'LIVE', bonus_analyses: 0 })

  // Users tab state
  const [userSearch, setUserSearch] = useState('')
  const [userSearchInput, setUserSearchInput] = useState('')
  const [updatingUser, setUpdatingUser] = useState(null)
  const [expandedUser, setExpandedUser] = useState(null)

  // AI tab state
  const [aiUsage, setAiUsage] = useState(null)
  const [aiConfig, setAiConfig] = useState({})
  const [savingModel, setSavingModel] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'codes') {
        const data = await api.getAdminCodes()
        if (data.codes) setCodes(data.codes)
      } else if (activeTab === 'users') {
        const data = await api.getAdminUsers(userSearch)
        if (data.users) setUsers(data.users)
      } else if (activeTab === 'analytics') {
        const data = await api.getAdminAnalytics()
        setAnalytics(data)
      } else if (activeTab === 'ai') {
        const [usageData, configData] = await Promise.all([
          api.getAdminAIUsage(),
          api.getAdminAIConfig(),
        ])
        setAiUsage(usageData)
        setAiConfig(configData.config || {})
      }
    } catch (err) {
      setError('Failed to load data. Make sure you have admin access.')
    } finally {
      setLoading(false)
    }
  }

  const generateCodes = async () => {
    setGenerating(true)
    try {
      const data = await api.createAdminCodes(codeConfig)
      if (data.codes) {
        setCodes([...data.codes, ...codes])
      }
    } catch (err) {
      setError('Failed to generate codes')
    } finally {
      setGenerating(false)
    }
  }

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
  }

  const handleModelChange = async (newModel) => {
    setSavingModel(true)
    try {
      await api.updateAdminAIConfig({ key: 'ai_model', value: newModel })
      setAiConfig(prev => ({ ...prev, ai_model: newModel }))
    } catch (err) {
      setError('Failed to update model')
    } finally {
      setSavingModel(false)
    }
  }

  const handleUserSearch = (e) => {
    e.preventDefault()
    setUserSearch(userSearchInput)
  }

  // Trigger reload when search changes
  useEffect(() => {
    if (activeTab === 'users') loadData()
  }, [userSearch])

  const handleUserUpdate = async (userId, updates) => {
    setUpdatingUser(userId)
    try {
      const { user: updated } = await api.updateAdminUser(userId, updates)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u))
    } catch (err) {
      setError(`Failed to update user: ${err.message}`)
    } finally {
      setUpdatingUser(null)
    }
  }

  const tabs = [
    { id: 'ai', label: 'AI' },
    { id: 'users', label: 'Users' },
    { id: 'codes', label: 'Invite Codes' },
    { id: 'analytics', label: 'Analytics' },
  ]

  const formatCost = (cost) => {
    if (!cost && cost !== 0) return '$0.00'
    return `$${cost.toFixed(4)}`
  }

  const formatTokens = (tokens) => {
    if (!tokens) return '0'
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`
    if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`
    return tokens.toString()
  }

  const currentModel = aiConfig.ai_model || 'claude-sonnet-4-20250514'
  const currentModelLabel = MODEL_OPTIONS.find(m => m.value === currentModel)?.label || currentModel

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-live-text-secondary">Manage invite codes, users, and view analytics</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab.id
                ? 'bg-live-accent text-[#1a1a2e] font-semibold'
                : 'bg-live-surface border border-live-border text-live-text hover:bg-live-bg-warm'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <p className="text-live-text-secondary">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Invite Codes Tab */}
          {activeTab === 'codes' && (
            <div>
              {/* Generate Codes Form */}
              <div className="card mb-6">
                <div className="card-header">Generate Invite Codes</div>
                <div className="card-body">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <label className="label">Count</label>
                      <input
                        type="number"
                        className="input"
                        value={codeConfig.count}
                        onChange={(e) => setCodeConfig({ ...codeConfig, count: parseInt(e.target.value) || 1 })}
                        min="1"
                        max="100"
                      />
                    </div>
                    <div>
                      <label className="label">Max Uses</label>
                      <input
                        type="number"
                        className="input"
                        value={codeConfig.max_uses}
                        onChange={(e) => setCodeConfig({ ...codeConfig, max_uses: parseInt(e.target.value) || 1 })}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="label">Expires (days)</label>
                      <input
                        type="number"
                        className="input"
                        value={codeConfig.expires_days}
                        onChange={(e) => setCodeConfig({ ...codeConfig, expires_days: parseInt(e.target.value) || 30 })}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="label">Prefix</label>
                      <input
                        type="text"
                        className="input"
                        value={codeConfig.prefix}
                        onChange={(e) => setCodeConfig({ ...codeConfig, prefix: e.target.value.toUpperCase() })}
                        maxLength="10"
                      />
                    </div>
                    <div>
                      <label className="label">Bonus Analyses</label>
                      <input
                        type="number"
                        className="input"
                        value={codeConfig.bonus_analyses}
                        onChange={(e) => setCodeConfig({ ...codeConfig, bonus_analyses: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                  <button
                    onClick={generateCodes}
                    disabled={generating}
                    className="btn btn-primary"
                  >
                    {generating ? 'Generating...' : `Generate ${codeConfig.count} Code${codeConfig.count > 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>

              {/* Codes List */}
              <div className="card">
                <div className="card-header">Existing Codes ({codes.length})</div>
                <div className="card-body overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                        <th className="pb-3 pr-4">Code</th>
                        <th className="pb-3 pr-4">Uses</th>
                        <th className="pb-3 pr-4">Bonus</th>
                        <th className="pb-3 pr-4">Expires</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codes.map(code => {
                        const isExpired = new Date(code.expires_at) < new Date()
                        const isFullyUsed = code.use_count >= code.max_uses
                        return (
                          <tr key={code.id} className="border-b border-live-border">
                            <td className="py-3 pr-4 font-mono text-sm">{code.code}</td>
                            <td className="py-3 pr-4">{code.use_count} / {code.max_uses}</td>
                            <td className="py-3 pr-4 text-sm">
                              {code.bonus_analyses > 0 ? (
                                <span className="badge badge-accent">+{code.bonus_analyses}</span>
                              ) : (
                                <span className="text-live-text-secondary">0</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-sm">{new Date(code.expires_at).toLocaleDateString()}</td>
                            <td className="py-3 pr-4">
                              {isExpired ? (
                                <span className="badge badge-danger">Expired</span>
                              ) : isFullyUsed ? (
                                <span className="badge badge-info">Used</span>
                              ) : (
                                <span className="badge badge-success">Active</span>
                              )}
                            </td>
                            <td className="py-3">
                              <button
                                onClick={() => copyCode(code.code)}
                                className="text-xs text-live-info hover:underline"
                              >
                                Copy
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div>
              {/* Search */}
              <form onSubmit={handleUserSearch} className="mb-4 flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Search by email or name..."
                  value={userSearchInput}
                  onChange={(e) => setUserSearchInput(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Search</button>
                {userSearch && (
                  <button
                    type="button"
                    className="btn bg-live-surface border border-live-border text-live-text"
                    onClick={() => { setUserSearchInput(''); setUserSearch('') }}
                  >
                    Clear
                  </button>
                )}
              </form>

              <div className="card">
                <div className="card-header">
                  Users ({users.length}){userSearch && ` matching "${userSearch}"`}
                </div>
                <div className="card-body overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                        <th className="pb-3 pr-4">Email</th>
                        <th className="pb-3 pr-4">Name</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">AI Calls</th>
                        <th className="pb-3 pr-4">BYOK</th>
                        <th className="pb-3 pr-4">Joined</th>
                        <th className="pb-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => {
                        const isUpdating = updatingUser === u.id
                        const isExpanded = expandedUser === u.id
                        return (
                          <UserRow
                            key={u.id}
                            u={u}
                            isUpdating={isUpdating}
                            isExpanded={isExpanded}
                            onToggleExpand={() => setExpandedUser(isExpanded ? null : u.id)}
                            onUpdate={handleUserUpdate}
                          />
                        )
                      })}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-live-text-secondary">
                            {userSearch ? 'No users match your search.' : 'No users found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && analytics && (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card">
                <div className="card-body text-center py-6">
                  <div className="text-3xl font-light text-live-accent">{analytics.totalUsers}</div>
                  <div className="text-sm text-live-text-secondary">Total Users</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center py-6">
                  <div className="text-3xl font-light text-live-success">{analytics.activeSubscriptions}</div>
                  <div className="text-sm text-live-text-secondary">Active Subscriptions</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center py-6">
                  <div className="text-3xl font-light">{analytics.usersThisMonth}</div>
                  <div className="text-sm text-live-text-secondary">New This Month</div>
                </div>
              </div>
              <div className="card">
                <div className="card-body text-center py-6">
                  <div className="text-3xl font-light text-live-info">{analytics.aiCallsThisMonth}</div>
                  <div className="text-sm text-live-text-secondary">AI Calls This Month</div>
                </div>
              </div>
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && aiUsage && (
            <div>
              {/* Summary Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                <div className="card">
                  <div className="card-body text-center py-5">
                    <div className="text-2xl font-light text-live-accent">{formatTokens(aiUsage.summary?.total_tokens_in)}</div>
                    <div className="text-xs text-live-text-secondary">Tokens In</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center py-5">
                    <div className="text-2xl font-light text-live-accent">{formatTokens(aiUsage.summary?.total_tokens_out)}</div>
                    <div className="text-xs text-live-text-secondary">Tokens Out</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center py-5">
                    <div className="text-2xl font-light text-live-success">{formatCost(aiUsage.summary?.total_cost)}</div>
                    <div className="text-xs text-live-text-secondary">Total Cost</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center py-5">
                    <div className="text-2xl font-light">{formatCost(aiUsage.summary?.avg_cost_per_call)}</div>
                    <div className="text-xs text-live-text-secondary">Avg Cost/Call</div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-body text-center py-5">
                    <div className="text-2xl font-light text-live-info">{currentModelLabel}</div>
                    <div className="text-xs text-live-text-secondary">Current Model</div>
                  </div>
                </div>
              </div>

              {/* Model Selector + Pricing Reference */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="card">
                  <div className="card-header">Model Configuration</div>
                  <div className="card-body">
                    <label className="label mb-2">Active Model</label>
                    <select
                      className="input w-full"
                      value={currentModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      disabled={savingModel}
                    >
                      {MODEL_OPTIONS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    {savingModel && <p className="text-xs text-live-text-secondary mt-2">Saving...</p>}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header">Pricing Reference (per 1M tokens)</div>
                  <div className="card-body overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                          <th className="pb-2 pr-4">Model</th>
                          <th className="pb-2 pr-4">Input</th>
                          <th className="pb-2">Output</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MODEL_OPTIONS.map(m => (
                          <tr key={m.value} className={`border-b border-live-border ${m.value === currentModel ? 'font-semibold' : ''}`}>
                            <td className="py-2 pr-4">{m.label}</td>
                            <td className="py-2 pr-4">{m.input}</td>
                            <td className="py-2">{m.output}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Recent AI Calls Table */}
              <div className="card">
                <div className="card-header">Recent AI Calls ({aiUsage.logs?.length || 0})</div>
                <div className="card-body overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">User</th>
                        <th className="pb-3 pr-4">Feature</th>
                        <th className="pb-3 pr-4">Model</th>
                        <th className="pb-3 pr-4 text-right">Tokens In</th>
                        <th className="pb-3 pr-4 text-right">Tokens Out</th>
                        <th className="pb-3 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(aiUsage.logs || []).map(log => (
                        <tr key={log.id} className="border-b border-live-border">
                          <td className="py-2 pr-4 whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="py-2 pr-4 text-xs">{log.user_email}</td>
                          <td className="py-2 pr-4">
                            <span className="badge badge-info">{log.feature}</span>
                          </td>
                          <td className="py-2 pr-4 text-xs font-mono">
                            {MODEL_OPTIONS.find(m => m.value === log.model)?.label || log.model?.split('-').slice(1, 3).join(' ') || '—'}
                          </td>
                          <td className="py-2 pr-4 text-right font-mono">{formatTokens(log.tokens_in)}</td>
                          <td className="py-2 pr-4 text-right font-mono">{formatTokens(log.tokens_out)}</td>
                          <td className="py-2 text-right font-mono">{formatCost(log.cost)}</td>
                        </tr>
                      ))}
                      {(!aiUsage.logs || aiUsage.logs.length === 0) && (
                        <tr>
                          <td colSpan="7" className="py-8 text-center text-live-text-secondary">
                            No AI calls recorded yet. Token tracking starts with the next analysis.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  )
}

function UserRow({ u, isUpdating, isExpanded, onToggleExpand, onUpdate }) {
  const [overrides, setOverrides] = useState({
    analysis_limit_override: u.analysis_limit_override ?? '',
    chat_limit_override: u.chat_limit_override ?? '',
    forced_model: u.forced_model || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSaveOverrides = async () => {
    setSaving(true)
    try {
      await onUpdate(u.id, {
        analysis_limit_override: overrides.analysis_limit_override === '' ? null : parseInt(overrides.analysis_limit_override),
        chat_limit_override: overrides.chat_limit_override === '' ? null : parseInt(overrides.chat_limit_override),
        forced_model: overrides.forced_model || null,
      })
    } finally {
      setSaving(false)
    }
  }

  const tierLabel = u.has_api_key ? 'BYOK' : u.subscription_status === 'max' ? 'Max' : u.subscription_status === 'active' ? 'Pro' : 'Trial'
  const trialExpired = u.subscription_status === 'trial' && u.trial_ends_at && new Date(u.trial_ends_at) < new Date()

  return (
    <>
      <tr className={`border-b border-live-border cursor-pointer hover:bg-live-bg-warm ${isExpanded ? 'bg-live-bg-warm' : ''}`} onClick={onToggleExpand}>
        <td className="py-3 pr-4 text-sm">{u.email}</td>
        <td className="py-3 pr-4">{u.name || '—'}</td>
        <td className="py-3 pr-4">
          <select
            className="text-xs bg-live-surface border border-live-border rounded px-2 py-1"
            value={u.subscription_status}
            onChange={(e) => { e.stopPropagation(); onUpdate(u.id, { subscription_status: e.target.value }) }}
            onClick={(e) => e.stopPropagation()}
            disabled={isUpdating}
          >
            <option value="trial">Free</option>
            <option value="active">Active</option>
            <option value="max">Max</option>
            <option value="suspended">Suspended</option>
          </select>
        </td>
        <td className="py-3 pr-4 text-sm text-center">{u.ai_calls}</td>
        <td className="py-3 pr-4 text-sm">
          {u.has_api_key ? (
            <span className="badge badge-success">Yes</span>
          ) : (
            <span className="text-live-text-secondary">No</span>
          )}
        </td>
        <td className="py-3 pr-4 text-sm whitespace-nowrap">{new Date(u.created_at).toLocaleDateString()}</td>
        <td className="py-3">
          <div className="flex items-center gap-2">
            {u.is_admin ? (
              <span className="badge badge-danger">Admin</span>
            ) : (
              <button
                className="text-xs text-live-info hover:underline"
                onClick={(e) => { e.stopPropagation(); onUpdate(u.id, { is_admin: true }) }}
                disabled={isUpdating}
              >
                Make Admin
              </button>
            )}
            <span className="text-xs text-live-text-secondary">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {isExpanded && (
        <tr>
          <td colSpan="7" className="bg-live-bg-warm px-4 py-4 border-b border-live-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-2 bg-live-surface rounded-lg">
                <div className="text-sm font-medium text-live-accent">{tierLabel}</div>
                <div className="text-xs text-live-text-secondary">Tier</div>
              </div>
              <div className="text-center p-2 bg-live-surface rounded-lg">
                <div className="text-sm font-medium">{u.preferred_model?.split('-').slice(1, 3).join(' ') || 'Default'}</div>
                <div className="text-xs text-live-text-secondary">Model</div>
              </div>
              <div className="text-center p-2 bg-live-surface rounded-lg">
                <div className="text-sm font-medium">{u.ai_calls}</div>
                <div className="text-xs text-live-text-secondary">Total AI Calls</div>
              </div>
              <div className="text-center p-2 bg-live-surface rounded-lg">
                <div className={`text-sm font-medium ${trialExpired ? 'text-live-danger' : ''}`}>
                  {u.trial_ends_at ? new Date(u.trial_ends_at).toLocaleDateString() : '—'}
                </div>
                <div className="text-xs text-live-text-secondary">
                  {trialExpired ? 'Trial Expired' : 'Trial Ends'}
                </div>
              </div>
            </div>

            {/* Override controls */}
            <div className="bg-live-surface rounded-lg p-4">
              <p className="text-xs font-semibold uppercase text-live-text-secondary mb-3">Admin Overrides</p>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <label className="label">Analysis Limit</label>
                  <input
                    type="number"
                    className="input"
                    value={overrides.analysis_limit_override}
                    onChange={(e) => setOverrides({ ...overrides, analysis_limit_override: e.target.value })}
                    placeholder="Default"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Chat Limit</label>
                  <input
                    type="number"
                    className="input"
                    value={overrides.chat_limit_override}
                    onChange={(e) => setOverrides({ ...overrides, chat_limit_override: e.target.value })}
                    placeholder="Default"
                    min="0"
                  />
                </div>
                <div>
                  <label className="label">Force Model</label>
                  <select
                    className="input"
                    value={overrides.forced_model}
                    onChange={(e) => setOverrides({ ...overrides, forced_model: e.target.value })}
                  >
                    <option value="">Default (tier-based)</option>
                    {[
                      { value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
                      { value: 'claude-sonnet-4-20250514', label: 'Sonnet 4' },
                      { value: 'claude-sonnet-4-5-20250929', label: 'Sonnet 4.5' },
                    ].map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveOverrides}
                  disabled={saving}
                  className="btn btn-primary text-xs"
                >
                  {saving ? 'Saving...' : 'Save Overrides'}
                </button>
                {(overrides.analysis_limit_override !== '' || overrides.chat_limit_override !== '' || overrides.forced_model !== '') && (
                  <button
                    onClick={() => {
                      setOverrides({ analysis_limit_override: '', chat_limit_override: '', forced_model: '' })
                      setSaving(true)
                      onUpdate(u.id, { analysis_limit_override: null, chat_limit_override: null, forced_model: null })
                        .finally(() => setSaving(false))
                    }}
                    disabled={saving}
                    className="btn bg-live-surface border border-live-border text-live-text-secondary text-xs hover:bg-live-bg-warm"
                  >
                    Reset to Default
                  </button>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
