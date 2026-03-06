import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import SampleModePromptModal from './SampleModePromptModal'

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

function sourceLabel(source) {
  return SOURCE_OPTIONS.find((s) => s.id === source)?.label || source
}

function normalizeRawDataEntries(rawData = {}) {
  const apps = (rawData.jobApplications || []).map((row, index) => ({
    id: `raw-app-${index}`,
    source: 'linkedin_export',
    company_name: row['Company Name'] || row.Company || 'Unknown company',
    company_website: null,
    job_title: row['Job Title'] || row.Title || 'Unknown role',
    job_url: row['Job Url'] || row['Job URL'] || '',
    location: null,
    application_date: row['Application Date'] || row['Applied On'] || row['Date Applied'] || null,
    saved_date: null,
    status: 'applied',
    hiring_manager: row['Hiring Manager'] || null,
    recruiter_name: row['Recruiter Name'] || null,
    recruiter_contact: null,
    resume_name: row['Resume Name'] || null,
    screening_summary: row['Question And Answers'] || null,
    question_count: row['Question And Answers'] ? String(row['Question And Answers']).split('|').filter(Boolean).length : null,
    notes: null,
    follow_up_date: null,
    metadata: {},
    created_at: new Date().toISOString(),
  }))

  const saved = (rawData.savedJobs || []).map((row, index) => ({
    id: `raw-saved-${index}`,
    source: 'linkedin_export',
    company_name: row['Company Name'] || row.Company || 'Unknown company',
    company_website: null,
    job_title: row['Job Title'] || row.Title || 'Unknown role',
    job_url: row['Job Url'] || row['Job URL'] || '',
    location: null,
    application_date: null,
    saved_date: row['Saved Date'] || row['Date Saved'] || null,
    status: 'saved',
    hiring_manager: null,
    recruiter_name: null,
    recruiter_contact: null,
    resume_name: null,
    screening_summary: null,
    question_count: null,
    notes: null,
    follow_up_date: null,
    metadata: {},
    created_at: new Date().toISOString(),
  }))

  return [...apps, ...saved]
}

function InfoPopover({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-live-border text-[10px] text-live-text-secondary hover:text-live-text hover:border-live-accent"
      >
        i
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-40 w-72 card shadow-xl">
          <div className="card-body py-3 px-3 text-xs text-live-text-secondary">{text}</div>
        </div>
      )}
    </span>
  )
}

function ApplicationDetailModal({ entry, sampleMode, onClose, onSave }) {
  const [saving, setSaving] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState({
    company_name: entry.company_name || '',
    company_website: entry.company_website || '',
    job_title: entry.job_title || '',
    job_url: entry.job_url || '',
    location: entry.location || '',
    status: entry.status || 'applied',
    application_date: entry.application_date ? entry.application_date.slice(0, 10) : '',
    follow_up_date: entry.follow_up_date || '',
    hiring_manager: entry.hiring_manager || '',
    recruiter_name: entry.recruiter_name || '',
    recruiter_contact: entry.recruiter_contact || '',
    notes: entry.notes || '',
    metadata: {
      contact_name: entry.metadata?.contact_name || '',
      contact_role: entry.metadata?.contact_role || '',
      contact_channel: entry.metadata?.contact_channel || '',
      prep_focus: entry.metadata?.prep_focus || '',
      prep_notes: entry.metadata?.prep_notes || '',
      next_step: entry.metadata?.next_step || '',
      interview_date: entry.metadata?.interview_date || '',
    },
  })

  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }))
  const setMeta = (key, value) => setDraft((prev) => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }))

  const handleEnrich = async () => {
    if (!draft.job_url || sampleMode) return
    try {
      setEnriching(true)
      const res = await api.parseJobApplicationUrl(draft.job_url)
      const parsed = res.parsed || {}
      setDraft((prev) => ({
        ...prev,
        company_name: prev.company_name || parsed.inferredCompany || '',
        company_website: prev.company_website || parsed.companyWebsite || '',
        job_title: prev.job_title || parsed.inferredTitle || '',
      }))
      setError('')
    } catch (err) {
      setError(err.message || 'Unable to enrich from this URL.')
    } finally {
      setEnriching(false)
    }
  }

  const handleSave = async () => {
    if (sampleMode) {
      await onSave(null, true)
      return
    }
    try {
      setSaving(true)
      await onSave({
        company_name: draft.company_name || null,
        company_website: draft.company_website || null,
        job_title: draft.job_title || null,
        job_url: draft.job_url || null,
        location: draft.location || null,
        status: draft.status,
        application_date: draft.application_date || null,
        follow_up_date: draft.follow_up_date || null,
        hiring_manager: draft.hiring_manager || null,
        recruiter_name: draft.recruiter_name || null,
        recruiter_contact: draft.recruiter_contact || null,
        notes: draft.notes || null,
        metadata: draft.metadata,
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to save details.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto bg-live-bg rounded-xl border border-live-border shadow-2xl">
        <div className="sticky top-0 z-30 bg-live-bg border-b border-live-border px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-live-text">{entry.company_name} - {entry.job_title}</h3>
            <p className="text-xs text-live-text-secondary">{formatDate(entry.application_date || entry.saved_date || entry.created_at)} • {sourceLabel(entry.source)}</p>
          </div>
          <button onClick={onClose} className="relative z-40 text-live-text-secondary hover:text-live-text text-xl">&times;</button>
        </div>
        <div className="p-5 space-y-5">
          {error && <div className="text-sm text-live-warning">{error}</div>}

          <div>
            <h4 className="text-sm font-semibold text-live-text mb-2">Application details</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input className="input" value={draft.company_name} onChange={(e) => setField('company_name', e.target.value)} placeholder="Company" />
              <input className="input" value={draft.company_website} onChange={(e) => setField('company_website', e.target.value)} placeholder="Company website" />
              <input className="input" value={draft.job_title} onChange={(e) => setField('job_title', e.target.value)} placeholder="Job title" />
              <input className="input" value={draft.location} onChange={(e) => setField('location', e.target.value)} placeholder="Location" />
              <input className="input md:col-span-2" value={draft.job_url} onChange={(e) => setField('job_url', e.target.value)} placeholder="Job URL" />
            </div>
            <div className="mt-2 flex justify-end">
              <button onClick={handleEnrich} disabled={!draft.job_url || enriching || sampleMode} className="text-xs text-live-info hover:underline disabled:opacity-50">
                {enriching ? 'Enriching...' : 'Enrich from URL'}
              </button>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-live-text mb-2">Status and planning</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select className="input" value={draft.status} onChange={(e) => setField('status', e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <input type="date" className="input" value={draft.application_date} onChange={(e) => setField('application_date', e.target.value)} />
              <input type="date" className="input" value={draft.follow_up_date} onChange={(e) => setField('follow_up_date', e.target.value)} />
            </div>
            <input className="input mt-3" value={draft.metadata.next_step} onChange={(e) => setMeta('next_step', e.target.value)} placeholder="Next step" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-live-text mb-2">Contact and prep</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input className="input" value={draft.hiring_manager} onChange={(e) => setField('hiring_manager', e.target.value)} placeholder="Hiring manager" />
              <input className="input" value={draft.recruiter_name} onChange={(e) => setField('recruiter_name', e.target.value)} placeholder="Recruiter name" />
              <input className="input" value={draft.recruiter_contact} onChange={(e) => setField('recruiter_contact', e.target.value)} placeholder="Recruiter contact" />
              <input className="input" value={draft.metadata.contact_name} onChange={(e) => setMeta('contact_name', e.target.value)} placeholder="Internal contact" />
              <input className="input" value={draft.metadata.contact_role} onChange={(e) => setMeta('contact_role', e.target.value)} placeholder="Contact role" />
              <input className="input" value={draft.metadata.contact_channel} onChange={(e) => setMeta('contact_channel', e.target.value)} placeholder="Contact channel" />
              <input type="date" className="input md:col-span-3" value={draft.metadata.interview_date} onChange={(e) => setMeta('interview_date', e.target.value)} />
            </div>
            <textarea rows={3} className="input w-full mt-3" value={draft.metadata.prep_focus} onChange={(e) => setMeta('prep_focus', e.target.value)} placeholder="Prep focus" />
            <textarea rows={3} className="input w-full mt-3" value={draft.metadata.prep_notes} onChange={(e) => setMeta('prep_notes', e.target.value)} placeholder="Prep notes" />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-live-text mb-2">Notes</h4>
            <textarea rows={4} className="input w-full" value={draft.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="General notes" />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="btn text-sm px-4 py-2 border border-live-border">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary text-sm px-4 py-2">{saving ? 'Saving...' : 'Save details'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationsTab({ rawData = {}, sampleMode = false }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [parseLoading, setParseLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [viewMode, setViewMode] = useState('summary')
  const [showSamplePrompt, setShowSamplePrompt] = useState(false)

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
    notes: '',
  })

  const hasRawLinkedInData = (rawData.jobApplications?.length || 0) > 0 || (rawData.savedJobs?.length || 0) > 0

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
      if (remoteEntries.length === 0 && hasRawLinkedInData) await handleImportFromLinkedIn(true)
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
    if (!form.url.trim()) return
    if (sampleMode) {
      setShowSamplePrompt(true)
      return
    }
    try {
      setParseLoading(true)
      const res = await api.parseJobApplicationUrl(form.url.trim())
      const parsed = res.parsed || {}
      setForm((prev) => ({
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
      notes: form.notes || null,
      metadata: {},
    }

    if (sampleMode) {
      setShowSamplePrompt(true)
      return
    }

    try {
      setSaving(true)
      const res = await api.createJobApplication(payload)
      setEntries((prev) => [res.entry, ...prev])
      setShowAdd(false)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to add application.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id, updates) => {
    if (sampleMode) {
      setShowSamplePrompt(true)
      return
    }
    setEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)))
    const res = await api.updateJobApplication(id, updates)
    setEntries((prev) => prev.map((entry) => (entry.id === id ? res.entry : entry)))
  }

  const handleDelete = async (id) => {
    if (sampleMode) {
      setShowSamplePrompt(true)
      return
    }
    await api.removeJobApplication(id)
    setEntries((prev) => prev.filter((entry) => entry.id !== id))
  }

  const filteredEntries = useMemo(() => {
    const nowDate = new Date().toISOString().slice(0, 10)
    return entries
      .filter((entry) => {
        if (filters.status !== 'all' && entry.status !== filters.status) return false
        if (filters.source !== 'all' && entry.source !== filters.source) return false
        if (filters.q) {
          const text = `${entry.company_name || ''} ${entry.job_title || ''} ${entry.notes || ''} ${entry.metadata?.next_step || ''}`.toLowerCase()
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
    const active = entries.filter((e) => !['rejected', 'withdrawn', 'closed'].includes(e.status)).length
    const interview = entries.filter((e) => ['screen', 'interview', 'final'].includes(e.status)).length
    const offers = entries.filter((e) => e.status === 'offer').length
    const dueFollowUps = entries.filter((e) => e.follow_up_date && e.follow_up_date <= new Date().toISOString().slice(0, 10)).length
    return { total, active, interview, offers, dueFollowUps }
  }, [entries])

  const grouped = useMemo(() => {
    return STATUS_OPTIONS.reduce((acc, s) => {
      acc[s.id] = filteredEntries.filter((entry) => entry.status === s.id)
      return acc
    }, {})
  }, [filteredEntries])

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
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="section-title mb-1">Jobs You Applied To</h2>
          <p className="text-live-text-secondary text-sm">Compact summary plus detailed workflow for prep and contact planning.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasRawLinkedInData && !sampleMode && (
            <button onClick={() => handleImportFromLinkedIn(false)} disabled={importing} className="btn text-sm px-3 py-2 border border-live-border">
              {importing ? 'Importing...' : 'Import LinkedIn Jobs'}
            </button>
          )}
          <button onClick={() => setShowAdd((v) => !v)} className="btn btn-primary text-sm px-4 py-2">{showAdd ? 'Close' : '+ Add Application'}</button>
        </div>
      </div>

      {error && (
        <div className="card mb-4 border-live-warning">
          <div className="card-body py-3 text-sm text-live-warning">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <div className="card"><div className="card-body py-3"><div className="text-xl font-light">{stats.total}</div><div className="text-xs text-live-text-secondary">Tracked</div></div></div>
        <div className="card"><div className="card-body py-3"><div className="text-xl font-light">{stats.active}</div><div className="text-xs text-live-text-secondary">Active</div></div></div>
        <div className="card"><div className="card-body py-3"><div className="text-xl font-light">{stats.interview}</div><div className="text-xs text-live-text-secondary">Interview stage</div></div></div>
        <div className="card"><div className="card-body py-3"><div className="text-xl font-light text-live-success">{stats.offers}</div><div className="text-xs text-live-text-secondary">Offers</div></div></div>
        <div className="card"><div className="card-body py-3"><div className="text-xl font-light text-live-warning">{stats.dueFollowUps}</div><div className="text-xs text-live-text-secondary">Follow-up due</div></div></div>
      </div>

      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm font-semibold text-live-text">View</div>
            <div className="flex gap-1 bg-live-bg-warm rounded-lg p-0.5">
              <button onClick={() => setViewMode('summary')} className={`px-3 py-1 text-xs rounded ${viewMode === 'summary' ? 'bg-live-surface text-live-text' : 'text-live-text-secondary'}`}>Summary</button>
              <button onClick={() => setViewMode('pipeline')} className={`px-3 py-1 text-xs rounded ${viewMode === 'pipeline' ? 'bg-live-surface text-live-text' : 'text-live-text-secondary'}`}>Pipeline</button>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <div className="card mb-4">
          <div className="card-header">Add Application</div>
          <div className="card-body">
            <div className="p-3 rounded-lg border border-live-border bg-live-bg-warm mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-live-text">Parse from URL</span>
                <InfoPopover text="Paste a job posting URL, then click Parse. We will prefill company, title, and website when detectable. You can edit before saving." />
              </div>
              <p className="text-xs text-live-text-secondary mb-2">Try: paste a role URL from LinkedIn, Greenhouse, Lever, Workday, or company careers pages.</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select className="input" value={form.source} onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}>
                  {SOURCE_OPTIONS.filter((s) => s.id !== 'linkedin_export').map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <input className="input md:col-span-2" value={form.url} onChange={(e) => setForm((prev) => ({ ...prev, url: e.target.value }))} placeholder="Job posting URL" />
                <button onClick={handleParseUrl} disabled={parseLoading || !form.url.trim()} className="btn text-sm px-3 py-2 border border-live-border disabled:opacity-50">
                  {parseLoading ? 'Parsing...' : 'Parse'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <input className="input" value={form.company_name} onChange={(e) => setForm((prev) => ({ ...prev, company_name: e.target.value }))} placeholder="Company *" />
              <input className="input" value={form.company_website} onChange={(e) => setForm((prev) => ({ ...prev, company_website: e.target.value }))} placeholder="Company website" />
              <input className="input" value={form.job_title} onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))} placeholder="Job title *" />
              <input className="input" value={form.location} onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))} placeholder="Location" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <select className="input" value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <input className="input" value={form.applied_via} onChange={(e) => setForm((prev) => ({ ...prev, applied_via: e.target.value }))} placeholder="Applied via" />
              <input type="date" className="input" value={form.application_date} onChange={(e) => setForm((prev) => ({ ...prev, application_date: e.target.value }))} />
              <input type="date" className="input" value={form.follow_up_date} onChange={(e) => setForm((prev) => ({ ...prev, follow_up_date: e.target.value }))} />
            </div>
            <textarea rows={2} className="input w-full mb-3" value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Notes" />
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
              <input className="input" value={filters.q} onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))} placeholder="Company, role, notes, next step" />
            </div>
            <div>
              <label className="label text-xs">Status</label>
              <select className="input" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="all">All statuses</option>
                {STATUS_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Source</label>
              <select className="input" value={filters.source} onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value }))}>
                <option value="all">All sources</option>
                {SOURCE_OPTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-xs">Date from</label>
              <input type="date" className="input" value={filters.dateFrom} onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))} />
            </div>
            <div>
              <label className="label text-xs">Date to</label>
              <input type="date" className="input" value={filters.dateTo} onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
            <label className="inline-flex items-center gap-2 text-sm text-live-text-secondary">
              <input type="checkbox" checked={filters.followUpDue} onChange={(e) => setFilters((prev) => ({ ...prev, followUpDue: e.target.checked }))} />
              Follow-up due only
            </label>
            <button onClick={clearFilters} className="text-xs text-live-info hover:underline">Reset filters</button>
          </div>
        </div>
      </div>

      {viewMode === 'summary' ? (
        <div className="overflow-x-auto pb-2">
          <div className="grid grid-flow-col auto-cols-[260px] gap-3">
            {STATUS_OPTIONS.map((status) => (
              <div key={status.id} className="card">
                <div className="card-header flex items-center justify-between">
                  <span>{status.label}</span>
                  <span className="text-xs text-live-text-secondary">{grouped[status.id]?.length || 0}</span>
                </div>
                <div className="card-body space-y-2 max-h-[520px] overflow-y-auto">
                  {(grouped[status.id] || []).length === 0 ? (
                    <p className="text-xs text-live-text-secondary">No applications</p>
                  ) : (
                    grouped[status.id].map((entry) => {
                      const primaryDate = entry.application_date || entry.saved_date || entry.created_at
                      return (
                        <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full text-left p-3 rounded-lg border border-live-border hover:border-live-accent transition-colors">
                          <div className="text-sm font-medium text-live-text">{entry.company_name}</div>
                          <div className="text-xs text-live-text-secondary">{entry.job_title}</div>
                          <div className="text-xs text-live-text-secondary mt-1">{formatDate(primaryDate)}</div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">Applications ({filteredEntries.length})</div>
          <div className="card-body">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase text-live-text-secondary border-b border-live-border">
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 pr-3">Company / role</th>
                    <th className="pb-3 pr-3">Stage</th>
                    <th className="pb-3 pr-3">Source</th>
                    <th className="pb-3 pr-3">Follow-up</th>
                    <th className="pb-3 pr-3">Next step</th>
                    <th className="pb-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => {
                    const primaryDate = entry.application_date || entry.saved_date || entry.created_at
                    const companyHref = entry.company_website || entry.job_url || null
                    return (
                      <tr key={entry.id} className="border-b border-live-border hover:bg-live-bg-warm/40 cursor-pointer" onClick={() => setSelectedEntry(entry)}>
                        <td className="py-3 pr-3 text-sm whitespace-nowrap">{formatDate(primaryDate)}</td>
                        <td className="py-3 pr-3 text-sm min-w-[260px]">
                          {companyHref ? (
                            <a onClick={(e) => e.stopPropagation()} href={companyHref} target="_blank" rel="noreferrer" className="font-medium text-live-info hover:underline">{entry.company_name}</a>
                          ) : (
                            <span className="font-medium">{entry.company_name}</span>
                          )}
                          <div className="text-xs text-live-text-secondary mt-1">{entry.job_title}</div>
                        </td>
                        <td className="py-3 pr-3 text-sm"><span className={`badge ${statusBadgeClass(entry.status)}`}>{STATUS_OPTIONS.find((s) => s.id === entry.status)?.label || entry.status}</span></td>
                        <td className="py-3 pr-3 text-xs text-live-text-secondary">{sourceLabel(entry.source)}</td>
                        <td className="py-3 pr-3 text-xs text-live-text-secondary">{entry.follow_up_date ? formatDate(entry.follow_up_date) : '—'}</td>
                        <td className="py-3 pr-3 text-xs text-live-text-secondary max-w-[260px] truncate">{entry.metadata?.next_step || 'Open details to plan next step'}</td>
                        <td className="py-3 text-xs">
                          <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }} className="text-live-danger hover:underline">Remove</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="md:hidden space-y-2">
              {filteredEntries.map((entry) => {
                const primaryDate = entry.application_date || entry.saved_date || entry.created_at
                return (
                  <button key={entry.id} onClick={() => setSelectedEntry(entry)} className="w-full text-left card border border-live-border">
                    <div className="card-body py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">{entry.company_name}</div>
                          <div className="text-xs text-live-text-secondary">{entry.job_title}</div>
                          <div className="text-xs text-live-text-secondary mt-1">{formatDate(primaryDate)} • {sourceLabel(entry.source)}</div>
                        </div>
                        <span className={`badge ${statusBadgeClass(entry.status)}`}>{STATUS_OPTIONS.find((s) => s.id === entry.status)?.label || entry.status}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selectedEntry && (
        <ApplicationDetailModal
          entry={selectedEntry}
          sampleMode={sampleMode}
          onClose={() => setSelectedEntry(null)}
          onSave={async (payload, attemptedSampleSave = false) => {
            if (attemptedSampleSave) {
              setShowSamplePrompt(true)
              return
            }
            await handleUpdate(selectedEntry.id, payload)
          }}
        />
      )}

      <SampleModePromptModal open={showSamplePrompt} onClose={() => setShowSamplePrompt(false)} />
    </div>
  )
}
