import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

const STATUS_OPTIONS = [
  { id: 'saved', label: 'Saved' },
  { id: 'applied', label: 'Applied' },
  { id: 'screen', label: 'Screen' },
  { id: 'interview', label: 'Interview' },
  { id: 'final', label: 'Final' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'withdrawn', label: 'Withdrawn' },
  { id: 'closed', label: 'Closed' },
]

const SOURCE_OPTIONS = [
  { id: 'linkedin_export', label: 'LinkedIn export' },
  { id: 'external_url', label: 'External URL' },
  { id: 'external_manual', label: 'Manual' },
]

const STAGE_RANK = STATUS_OPTIONS.reduce((acc, s, idx) => {
  acc[s.id] = idx
  return acc
}, {})

function parseLooseDate(value) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDate(value) {
  const d = parseLooseDate(value)
  if (!d) return 'Unknown'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusBadgeClass(status) {
  if (status === 'offer') return 'badge-success'
  if (status === 'rejected' || status === 'withdrawn' || status === 'closed') return 'badge-danger'
  if (status === 'interview' || status === 'final') return 'badge-accent'
  return 'badge-info'
}

function normalizeRawDataEntries(rawData = {}) {
  const apps = (rawData.jobApplications || []).map((row, index) => ({
    id: `raw-app-${index}`,
    source: 'linkedin_export',
    company_name: row['Company Name'] || row.Company || 'Unknown company',
    job_title: row['Job Title'] || row.Title || 'Unknown role',
    job_url: row['Job Url'] || row['Job URL'] || '',
    application_date: row['Application Date'] || row['Applied On'] || row['Date Applied'] || null,
    saved_date: null,
    status: 'applied',
    hiring_manager: row['Hiring Manager'] || null,
    recruiter_name: row['Recruiter Name'] || null,
    resume_name: row['Resume Name'] || null,
    screening_summary: row['Question And Answers'] || null,
    question_count: row['Question And Answers'] ? String(row['Question And Answers']).split('|').filter(Boolean).length : null,
    notes: null,
    follow_up_date: null,
    created_at: new Date().toISOString(),
  }))

  const saved = (rawData.savedJobs || []).map((row, index) => ({
    id: `raw-saved-${index}`,
    source: 'linkedin_export',
    company_name: row['Company Name'] || row.Company || 'Unknown company',
    job_title: row['Job Title'] || row.Title || 'Unknown role',
    job_url: row['Job Url'] || row['Job URL'] || '',
    application_date: null,
    saved_date: row['Saved Date'] || row['Date Saved'] || null,
    status: 'saved',
    hiring_manager: null,
    recruiter_name: null,
    resume_name: null,
    screening_summary: null,
    question_count: null,
    notes: null,
    follow_up_date: null,
    created_at: new Date().toISOString(),
  }))

  return [...apps, ...saved]
}

export default function ApplicationsTab({ rawData = {}, sampleMode = false }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parseLoading, setParseLoading] = useState(false)
  const [error, setError] = useState('')

  const [filters, setFilters] = useState({
    q: '',
    status: 'all',
    source: 'all',
    dateFrom: '',
    dateTo: '',
    followUpDue: false,
  })

  const [form, setForm] = useState({
    source: 'external_url',
    url: '',
    company_name: '',
    company_website: '',
    job_title: '',
    location: '',
    status: 'applied',
    applied_via: 'Company site',
    application_date: new Date().toISOString().slice(0, 10),
    follow_up_date: '',
    hiring_manager: '',
    recruiter_name: '',
    recruiter_contact: '',
    notes: '',
  })

  const hasRawLinkedInData = (rawData.jobApplications?.length || 0) > 0 || (rawData.savedJobs?.length || 0) > 0
  const openStagesCount = entries.filter(e => ['screen', 'interview', 'final'].includes(e.status)).length

  const loadEntries = async () => {
    if (sampleMode) {
      setEntries(normalizeRawDataEntries(rawData))
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const res = await api.getJobApplications({ limit: 1000 })
      const remoteEntries = res.entries || []
      setEntries(remoteEntries)
      if (remoteEntries.length === 0 && hasRawLinkedInData) {
        await handleImportFromLinkedIn(true)
      }
    } catch (err) {
      console.error('Failed to load applications:', err)
      setError('Could not load saved application history. Showing local LinkedIn data only.')
      setEntries(normalizeRawDataEntries(rawData))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEntries()
  }, [sampleMode])

  const handleImportFromLinkedIn = async (silent = false) => {
    if (sampleMode || !hasRawLinkedInData) return
    try {
      setImporting(true)
      await api.importJobApplications({
        jobApplications: rawData.jobApplications || [],
        savedJobs: rawData.savedJobs || [],
      })
      const res = await api.getJobApplications({ limit: 1000 })
      setEntries(res.entries || [])
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to import LinkedIn applications.')
    } finally {
      setImporting(false)
    }
  }

  const handleParseUrl = async () => {
    if (!form.url.trim() || sampleMode) return
    try {
      setParseLoading(true)
      const res = await api.parseJobApplicationUrl(form.url.trim())
      const parsed = res.parsed || {}
      setForm(prev => ({
        ...prev,
        job_title: prev.job_title || parsed.inferredTitle || '',
        company_name: prev.company_name || parsed.inferredCompany || '',
        company_website: prev.company_website || parsed.companyWebsite || '',
      }))
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to parse the job URL.')
    } finally {
      setParseLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!form.company_name.trim() || !form.job_title.trim()) {
      setError('Company and job title are required.')
      return
    }

    const payload = {
      source: form.source,
      job_url: form.url || null,
      company_name: form.company_name,
      company_website: form.company_website || null,
      job_title: form.job_title,
      location: form.location || null,
      status: form.status,
      applied_via: form.applied_via || null,
      application_date: form.application_date || null,
      follow_up_date: form.follow_up_date || null,
      hiring_manager: form.hiring_manager || null,
      recruiter_name: form.recruiter_name || null,
      recruiter_contact: form.recruiter_contact || null,
      notes: form.notes || null,
    }

    if (sampleMode) {
      const entry = {
        ...payload,
        id: `sample-manual-${Date.now()}`,
        created_at: new Date().toISOString(),
      }
      setEntries(prev => [entry, ...prev])
      setShowAdd(false)
      setError('')
      return
    }

    try {
      setSaving(true)
      const res = await api.createJobApplication(payload)
      setEntries(prev => [res.entry, ...prev])
      setShowAdd(false)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to add application.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    setEntries(prev => prev.map(entry => (entry.id === id ? { ...entry, ...updates } : entry)))
    if (sampleMode) return
    try {
      const res = await api.updateJobApplication(id, updates)
      setEntries(prev => prev.map(entry => (entry.id === id ? res.entry : entry)))
    } catch (err) {
      setError(err.message || 'Failed to update application.')
      await loadEntries()
    }
  }

  const handleDelete = async (id) => {
    if (sampleMode) {
      setEntries(prev => prev.filter(entry => entry.id !== id))
      return
    }
    try {
      await api.removeJobApplication(id)
      setEntries(prev => prev.filter(entry => entry.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to remove application.')
    }
  }

  const filteredEntries = useMemo(() => {
    const nowDate = new Date().toISOString().slice(0, 10)
    return entries
      .filter(entry => {
        if (filters.status !== 'all' && entry.status !== filters.status) return false
        if (filters.source !== 'all' && entry.source !== filters.source) return false
        if (filters.q) {
          const text = `${entry.company_name || ''} ${entry.job_title || ''} ${entry.notes || ''}`.toLowerCase()
          if (!text.includes(filters.q.toLowerCase())) return false
        }
        const primaryDate = entry.application_date || entry.saved_date
        if (filters.dateFrom && primaryDate && parseLooseDate(primaryDate) < parseLooseDate(filters.dateFrom)) return false
        if (filters.dateTo && primaryDate && parseLooseDate(primaryDate) > parseLooseDate(filters.dateTo)) return false
        if (filters.followUpDue && (!entry.follow_up_date || entry.follow_up_date > nowDate)) return false
        return true
      })
      .sort((a, b) => {
        const aDate = parseLooseDate(a.application_date || a.saved_date || a.created_at)?.getTime() || 0
        const bDate = parseLooseDate(b.application_date || b.saved_date || b.created_at)?.getTime() || 0
        if (aDate !== bDate) return bDate - aDate
        return (STAGE_RANK[b.status] || 0) - (STAGE_RANK[a.status] || 0)
      })
  }, [entries, filters])

  const stats = useMemo(() => {
    const total = entries.length
    const active = entries.filter(e => !['rejected', 'withdrawn', 'closed'].includes(e.status)).length
    const interviews = entries.filter(e => ['interview', 'final', 'offer'].includes(e.status)).length
    const offers = entries.filter(e => e.status === 'offer').length
    const dueFollowUps = entries.filter(e => {
      if (!e.follow_up_date) return false
      return e.follow_up_date <= new Date().toISOString().slice(0, 10)
    }).length
    return { total, active, interviews, offers, dueFollowUps }
  }, [entries])

  const clearFilters = () => {
    setFilters({
      q: '',
      status: 'all',
      source: 'all',
      dateFrom: '',
      dateTo: '',
      followUpDue: false,
    })
  }

  if (loading) {
    return (
      <div>
        <div className="section-label">Application History</div>
        <h2 className="section-title mb-2">Jobs You Applied To</h2>
        <p className="text-live-text-secondary">Loading application workspace...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="section-label">Application Workspace</div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="section-title mb-1">Jobs You Applied To</h2>
          <p className="text-live-text-secondary text-sm">
            Unified tracker across LinkedIn export and externally applied roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasRawLinkedInData && !sampleMode && (
            <button
              onClick={() => handleImportFromLinkedIn(false)}
              disabled={importing}
              className="btn text-sm px-3 py-2 border border-live-border"
            >
              {importing ? 'Importing...' : 'Import LinkedIn Jobs'}
            </button>
          )}
          <button
            onClick={() => setShowAdd(v => !v)}
            className="btn btn-primary text-sm px-4 py-2"
          >
            {showAdd ? 'Close' : '+ Add Application'}
          </button>
        </div>
      </div>

      {error && (
        <div className="card mb-4 border-live-warning">
          <div className="card-body py-3 text-sm text-live-warning">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="card"><div className="card-body py-4"><div className="text-2xl font-light">{stats.total}</div><div className="text-xs text-live-text-secondary">Total tracked</div></div></div>
        <div className="card"><div className="card-body py-4"><div className="text-2xl font-light">{stats.active}</div><div className="text-xs text-live-text-secondary">Active pipeline</div></div></div>
        <div className="card"><div className="card-body py-4"><div className="text-2xl font-light">{stats.interviews}</div><div className="text-xs text-live-text-secondary">Interview+</div></div></div>
        <div className="card"><div className="card-body py-4"><div className="text-2xl font-light text-live-success">{stats.offers}</div><div className="text-xs text-live-text-secondary">Offers</div></div></div>
        <div className="card"><div className="card-body py-4"><div className="text-2xl font-light text-live-warning">{stats.dueFollowUps}</div><div className="text-xs text-live-text-secondary">Follow-up due</div></div></div>
      </div>
      <p className="text-xs text-live-text-secondary mb-4">
        Pipeline snapshot: <span className="text-live-text">{openStagesCount}</span> roles in interview stages (`screen`, `interview`, `final`).
      </p>

      {showAdd && (
        <div className="card mb-4">
          <div className="card-header">Add external application</div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <select
                className="input"
                value={form.source}
                onChange={(e) => setForm(prev => ({ ...prev, source: e.target.value }))}
              >
                {SOURCE_OPTIONS.filter(s => s.id !== 'linkedin_export').map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <input
                className="input md:col-span-2"
                placeholder="Job posting URL"
                value={form.url}
                onChange={(e) => setForm(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="flex justify-end mb-3">
              <button
                onClick={handleParseUrl}
                disabled={parseLoading || !form.url.trim() || sampleMode}
                className="btn text-sm px-3 py-2 border border-live-border disabled:opacity-50"
              >
                {parseLoading ? 'Parsing...' : 'Parse URL'}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input className="input" placeholder="Company *" value={form.company_name} onChange={(e) => setForm(prev => ({ ...prev, company_name: e.target.value }))} />
              <input className="input" placeholder="Company website" value={form.company_website} onChange={(e) => setForm(prev => ({ ...prev, company_website: e.target.value }))} />
              <input className="input" placeholder="Job title *" value={form.job_title} onChange={(e) => setForm(prev => ({ ...prev, job_title: e.target.value }))} />
              <input className="input" placeholder="Location" value={form.location} onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <select className="input" value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))}>
                {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <input className="input" placeholder="Applied via" value={form.applied_via} onChange={(e) => setForm(prev => ({ ...prev, applied_via: e.target.value }))} />
              <input type="date" className="input" value={form.application_date} onChange={(e) => setForm(prev => ({ ...prev, application_date: e.target.value }))} />
              <input type="date" className="input" value={form.follow_up_date} onChange={(e) => setForm(prev => ({ ...prev, follow_up_date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input className="input" placeholder="Hiring manager" value={form.hiring_manager} onChange={(e) => setForm(prev => ({ ...prev, hiring_manager: e.target.value }))} />
              <input className="input" placeholder="Recruiter name" value={form.recruiter_name} onChange={(e) => setForm(prev => ({ ...prev, recruiter_name: e.target.value }))} />
              <input className="input" placeholder="Recruiter contact" value={form.recruiter_contact} onChange={(e) => setForm(prev => ({ ...prev, recruiter_contact: e.target.value }))} />
            </div>
            <textarea
              rows={2}
              className="input w-full mb-3"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            />
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={saving} className="btn btn-primary text-sm px-4 py-2">{saving ? 'Saving...' : 'Save application'}</button>
              <button onClick={() => setShowAdd(false)} className="btn text-sm px-4 py-2 border border-live-border">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">Filters</div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="label text-xs">Search</label>
              <input className="input" placeholder="Company, role, notes" value={filters.q} onChange={(e) => setFilters(prev => ({ ...prev, q: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Status</label>
              <select className="input" value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}>
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Source</label>
              <select className="input" value={filters.source} onChange={(e) => setFilters(prev => ({ ...prev, source: e.target.value }))}>
                <option value="all">All sources</option>
                {SOURCE_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Date from</label>
              <input type="date" className="input" value={filters.dateFrom} onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Date to</label>
              <input type="date" className="input" value={filters.dateTo} onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-live-text-secondary">
              <input
                type="checkbox"
                checked={filters.followUpDue}
                onChange={(e) => setFilters(prev => ({ ...prev, followUpDue: e.target.checked }))}
              />
              Show follow-up due only
            </label>
            <button onClick={clearFilters} className="text-xs text-live-info hover:underline">Reset filters</button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Applications ({filteredEntries.length})</div>
        <div className="card-body">
          {filteredEntries.length === 0 ? (
            <p className="text-sm text-live-text-secondary">No applications match your filters.</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                      <th className="pb-3 pr-3">Date</th>
                      <th className="pb-3 pr-3">Company</th>
                      <th className="pb-3 pr-3">Role</th>
                      <th className="pb-3 pr-3">Source</th>
                      <th className="pb-3 pr-3">Status</th>
                      <th className="pb-3 pr-3">Follow-up</th>
                      <th className="pb-3 pr-3">Hiring manager / recruiter</th>
                      <th className="pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => {
                      const primaryDate = entry.application_date || entry.saved_date || entry.created_at
                      const companyHref = entry.company_website || entry.job_url || null

                      return (
                        <tr key={entry.id} className="border-b border-live-border align-top hover:bg-live-bg-warm/40">
                          <td className="py-3 pr-3 text-sm whitespace-nowrap">{formatDate(primaryDate)}</td>
                          <td className="py-3 pr-3 text-sm">
                            {companyHref ? (
                              <a href={companyHref} target="_blank" rel="noreferrer" className="font-medium text-live-info hover:underline">
                                {entry.company_name}
                              </a>
                            ) : (
                              <span className="font-medium">{entry.company_name}</span>
                            )}
                          </td>
                          <td className="py-3 pr-3 text-sm min-w-[240px]">
                            <div>{entry.job_title}</div>
                            {entry.location && <div className="text-xs text-live-text-secondary mt-1">{entry.location}</div>}
                            {entry.resume_name && <div className="text-xs text-live-text-secondary mt-1">Resume: {entry.resume_name}</div>}
                            {entry.question_count ? <div className="text-xs text-live-text-secondary mt-1">Screening questions: {entry.question_count}</div> : null}
                          </td>
                          <td className="py-3 pr-3 text-sm">
                            <span className={`badge ${entry.source === 'linkedin_export' ? 'badge-info' : 'badge-accent'}`}>
                              {SOURCE_OPTIONS.find(s => s.id === entry.source)?.label || entry.source}
                            </span>
                          </td>
                          <td className="py-3 pr-3 text-sm">
                            <select
                              className="input text-xs min-w-[130px]"
                              value={entry.status}
                              onChange={(e) => handleUpdate(entry.id, { status: e.target.value })}
                            >
                              {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                          </td>
                          <td className="py-3 pr-3 text-sm">
                            <input
                              type="date"
                              className="input text-xs min-w-[130px]"
                              value={entry.follow_up_date || ''}
                              onChange={(e) => handleUpdate(entry.id, { follow_up_date: e.target.value || null })}
                            />
                          </td>
                          <td className="py-3 pr-3 text-xs text-live-text-secondary min-w-[220px]">
                            {entry.hiring_manager && <div>HM: {entry.hiring_manager}</div>}
                            {entry.recruiter_name && <div>Recruiter: {entry.recruiter_name}</div>}
                            {entry.recruiter_contact && <div>{entry.recruiter_contact}</div>}
                            {!entry.hiring_manager && !entry.recruiter_name && <span>—</span>}
                          </td>
                          <td className="py-3 text-xs whitespace-nowrap">
                            <div className="flex flex-col gap-1">
                              {entry.job_url && (
                                <a href={entry.job_url} target="_blank" rel="noreferrer" className="text-live-info hover:underline">
                                  Open job
                                </a>
                              )}
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-live-danger hover:underline text-left"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {filteredEntries.map((entry) => {
                  const primaryDate = entry.application_date || entry.saved_date || entry.created_at
                  const companyHref = entry.company_website || entry.job_url || null
                  return (
                    <div key={entry.id} className="card border border-live-border">
                      <div className="card-body py-3">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            {companyHref ? (
                              <a href={companyHref} target="_blank" rel="noreferrer" className="font-semibold text-live-info hover:underline text-sm">
                                {entry.company_name}
                              </a>
                            ) : (
                              <div className="font-semibold text-sm">{entry.company_name}</div>
                            )}
                            <div className="text-xs text-live-text-secondary">{entry.job_title}</div>
                          </div>
                          <span className={`badge ${statusBadgeClass(entry.status)}`}>
                            {STATUS_OPTIONS.find(s => s.id === entry.status)?.label || entry.status}
                          </span>
                        </div>
                        <div className="text-xs text-live-text-secondary mb-2">
                          {formatDate(primaryDate)} • {SOURCE_OPTIONS.find(s => s.id === entry.source)?.label || entry.source}
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <select
                            className="input text-xs"
                            value={entry.status}
                            onChange={(e) => handleUpdate(entry.id, { status: e.target.value })}
                          >
                            {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                          <input
                            type="date"
                            className="input text-xs"
                            value={entry.follow_up_date || ''}
                            onChange={(e) => handleUpdate(entry.id, { follow_up_date: e.target.value || null })}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          {entry.job_url ? (
                            <a href={entry.job_url} target="_blank" rel="noreferrer" className="text-live-info hover:underline">
                              Open job
                            </a>
                          ) : <span />}
                          <button onClick={() => handleDelete(entry.id)} className="text-live-danger hover:underline">
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
