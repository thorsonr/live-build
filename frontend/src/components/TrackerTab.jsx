import { useState, useEffect, useRef, useMemo } from 'react'
import { DndContext, useDraggable, useDroppable, pointerWithin, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { api } from '../lib/api'

const STATUSES = [
  { id: 'identified', label: 'Identified', color: 'bg-gray-100 text-gray-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { id: 'replied', label: 'Replied', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'meeting', label: 'Meeting', color: 'bg-green-100 text-green-700' },
  { id: 'closed', label: 'Closed', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'parked', label: 'Parked', color: 'bg-amber-100 text-amber-700' },
]

const LOG_TYPES = ['Email', 'Call', 'Text', 'In-Person', 'LinkedIn', 'Other']

function DroppableColumn({ id, children, isOver }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[100px] space-y-2 rounded-lg transition-all ${
        isOver ? 'ring-2 ring-live-accent ring-dashed bg-live-accent/5' : ''
      }`}
    >
      {children}
    </div>
  )
}

function DraggableCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  )
}

function TrackerDetailModal({ entry, onClose, onUpdate }) {
  const [status, setStatus] = useState(entry.status)
  const [notes, setNotes] = useState(entry.notes || '')
  const [email, setEmail] = useState(entry.contact_email || '')
  const [phone, setPhone] = useState(entry.contact_phone || '')
  const [engagementLog, setEngagementLog] = useState(entry.engagement_log || [])
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [logType, setLogType] = useState('Email')
  const debounceRef = useRef(null)

  // Auto-save notes with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (notes !== (entry.notes || '')) {
        try {
          const data = await api.updateTracker(entry.id, { notes })
          onUpdate(data.entry)
        } catch (err) {
          console.error('Failed to save notes:', err)
        }
      }
    }, 1000)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [notes])

  const handleStatusChange = async (newStatus) => {
    setStatus(newStatus)
    try {
      const data = await api.updateTracker(entry.id, { status: newStatus })
      onUpdate(data.entry)
    } catch (err) {
      console.error('Failed to update status:', err)
      setStatus(entry.status)
    }
  }

  const handleSaveContactInfo = async () => {
    try {
      const data = await api.updateTracker(entry.id, {
        contact_email: email || null,
        contact_phone: phone || null,
      })
      onUpdate(data.entry)
    } catch (err) {
      console.error('Failed to save contact info:', err)
    }
  }

  const handleLogEngagement = async () => {
    if (!logDate) return
    const newLog = [...engagementLog, { date: logDate, type: logType }]
    setEngagementLog(newLog)
    try {
      const data = await api.updateTracker(entry.id, { engagement_log: newLog })
      onUpdate(data.entry)
    } catch (err) {
      console.error('Failed to log engagement:', err)
      setEngagementLog(engagementLog)
    }
  }

  const sortedLog = [...engagementLog].sort((a, b) => b.date.localeCompare(a.date))

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const typeBadgeColor = (type) => {
    const colors = {
      'Email': 'bg-blue-100 text-blue-700',
      'Call': 'bg-green-100 text-green-700',
      'Text': 'bg-purple-100 text-purple-700',
      'In-Person': 'bg-amber-100 text-amber-700',
      'LinkedIn': 'bg-indigo-100 text-indigo-700',
      'Other': 'bg-gray-100 text-gray-700',
    }
    return colors[type] || colors['Other']
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] bg-live-bg rounded-xl shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-live-bg border-b border-live-border px-6 py-4 flex justify-between items-start z-10 rounded-t-xl">
          <div>
            <h2 className="font-display text-lg font-semibold text-live-text">{entry.contact_name}</h2>
            {(entry.contact_position || entry.contact_company) && (
              <p className="text-xs text-live-text-secondary mt-0.5">
                {entry.contact_position}{entry.contact_company ? ` @ ${entry.contact_company}` : ''}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-live-text-secondary hover:text-live-text text-xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-6 space-y-5 text-sm">
          {/* Status */}
          <div>
            <label className="text-xs font-medium text-live-text-secondary uppercase tracking-wide mb-1 block">Status</label>
            <select
              className="input w-full text-sm"
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {STATUSES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-live-text-secondary uppercase tracking-wide mb-1 block">Email</label>
              <input
                type="email"
                className="input w-full text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleSaveContactInfo}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-live-text-secondary uppercase tracking-wide mb-1 block">Phone</label>
              <input
                type="tel"
                className="input w-full text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={handleSaveContactInfo}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          {/* Log Engagement */}
          <div>
            <label className="text-xs font-medium text-live-text-secondary uppercase tracking-wide mb-1 block">Log Engagement</label>
            <div className="flex gap-2 items-stretch">
              <input
                type="date"
                className="input flex-[3] text-sm h-10"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
              <select
                className="input flex-[2] text-sm h-10"
                value={logType}
                onChange={(e) => setLogType(e.target.value)}
              >
                {LOG_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={handleLogEngagement}
                className="btn btn-primary text-sm px-4 h-10 whitespace-nowrap"
              >
                Log
              </button>
            </div>
          </div>

          {/* Engagement History */}
          {sortedLog.length > 0 && (
            <div>
              <label className="text-xs font-medium text-live-text-secondary uppercase tracking-wide mb-1 block">Engagement History</label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {sortedLog.map((logEntry, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-live-bg-warm">
                    <span className="text-xs text-live-text-secondary">{formatDate(logEntry.date)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeBadgeColor(logEntry.type)}`}>
                      {logEntry.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-live-text-secondary uppercase tracking-wide mb-1 block">Notes</label>
            <textarea
              className="input w-full min-h-[80px] resize-y text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this contact..."
            />
            <p className="text-xs text-live-text-secondary mt-1 opacity-60">Auto-saves after 1 second</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TrackerTab({ sampleMode = false, sampleTrackerEntries = [], contacts = [] }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addMode, setAddMode] = useState('new') // 'new' | 'existing'
  const [existingSearch, setExistingSearch] = useState('')
  const [showExistingDropdown, setShowExistingDropdown] = useState(false)
  const [form, setForm] = useState({ contact_name: '', contact_company: '', contact_position: '', contact_email: '', contact_phone: '', notes: '' })
  const [viewMode, setViewMode] = useState('list') // 'list' | 'board'
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [activeDropId, setActiveDropId] = useState(null)
  const existingDropdownRef = useRef(null)

  // Close existing contact dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (existingDropdownRef.current && !existingDropdownRef.current.contains(e.target)) {
        setShowExistingDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Filter contacts for autocomplete
  const filteredExistingContacts = useMemo(() => {
    if (!existingSearch.trim()) return contacts.slice(0, 50)
    const q = existingSearch.toLowerCase()
    return contacts
      .filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.position || '').toLowerCase().includes(q)
      )
      .slice(0, 50)
  }, [contacts, existingSearch])

  const selectExistingContact = (c) => {
    setForm(f => ({
      ...f,
      contact_name: c.name || '',
      contact_company: c.company || '',
      contact_position: c.position || '',
      contact_email: c.email || '',
    }))
    setExistingSearch('')
    setShowExistingDropdown(false)
  }

  useEffect(() => {
    if (!sampleMode) loadEntries()
    else {
      setEntries(sampleTrackerEntries || [])
      setLoading(false)
    }
  }, [sampleMode])

  const loadEntries = async () => {
    try {
      const data = await api.getTracker()
      setEntries(data.entries || [])
    } catch (err) {
      console.error('Failed to load tracker:', err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({ contact_name: '', contact_company: '', contact_position: '', contact_email: '', contact_phone: '', notes: '' })
    setAddMode('new')
    setExistingSearch('')
  }

  const handleAdd = async () => {
    if (!form.contact_name.trim()) return
    try {
      const data = await api.addToTracker(form)
      setEntries(prev => [data.entry, ...prev])
      resetForm()
      setShowAdd(false)
    } catch (err) {
      console.error('Failed to add:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.removeFromTracker(id)
      setEntries(prev => prev.filter(e => e.id !== id))
      if (selectedEntry?.id === id) setSelectedEntry(null)
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleStatusChange = async (id, newStatus) => {
    try {
      const data = await api.updateTracker(id, { status: newStatus })
      setEntries(prev => prev.map(e => e.id === id ? data.entry : e))
    } catch (err) {
      console.error('Failed to update status:', err)
    }
  }

  const handleEntryUpdate = (updatedEntry) => {
    setEntries(prev => prev.map(e => e.id === updatedEntry.id ? updatedEntry : e))
    setSelectedEntry(updatedEntry)
  }

  const handleDragEnd = async (event) => {
    setActiveDropId(null)
    const { active, over } = event
    if (!over) return

    const entryId = active.id
    const newStatus = over.id
    const entry = entries.find(e => e.id === entryId)
    if (!entry || entry.status === newStatus) return

    // Optimistic update
    const prevEntries = [...entries]
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: newStatus } : e))

    try {
      await api.updateTracker(entryId, { status: newStatus })
    } catch (err) {
      console.error('Failed to update status:', err)
      setEntries(prevEntries)
    }
  }

  const handleDragOver = (event) => {
    setActiveDropId(event.over?.id || null)
  }

  // Require 5px movement before drag activates — lets clicks pass through to open modal
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const statusConfig = (statusId) => STATUSES.find(s => s.id === statusId) || STATUSES[0]

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div>
        <div className="section-label">Engagement Tracker</div>
        <h2 className="section-title mb-6">Track Your Outreach</h2>
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="card-body">
                <div className="h-4 bg-live-bg-warm rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-live-bg-warm rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Board view: group by status
  const grouped = STATUSES.reduce((acc, s) => {
    acc[s.id] = entries.filter(e => e.status === s.id)
    return acc
  }, {})

  return (
    <div>
      <div className="section-label">Engagement Tracker</div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title mb-1">Track Your Outreach</h2>
          <p className="text-live-text-secondary text-sm">Manage your outreach pipeline from identification to meeting.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 bg-live-bg-warm rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-live-surface text-live-text shadow-sm' : 'text-live-text-secondary'}`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${viewMode === 'board' ? 'bg-live-surface text-live-text shadow-sm' : 'text-live-text-secondary'}`}
            >
              Board
            </button>
          </div>
          <button
            onClick={() => { setShowAdd(!showAdd); if (showAdd) resetForm() }}
            className="btn btn-primary text-sm px-4 py-2"
          >
            + Add Contact
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card mb-6">
          <div className="card-body">
            {/* New / Existing toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { setAddMode('new'); resetForm(); setAddMode('new') }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  addMode === 'new'
                    ? 'bg-live-accent text-[#1a1a2e]'
                    : 'bg-live-bg-warm text-live-text-secondary hover:text-live-text'
                }`}
              >
                New Contact
              </button>
              <button
                onClick={() => { setAddMode('existing'); setForm(f => ({ ...f, contact_name: '' })) }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  addMode === 'existing'
                    ? 'bg-live-accent text-[#1a1a2e]'
                    : 'bg-live-bg-warm text-live-text-secondary hover:text-live-text'
                }`}
              >
                Existing Contact
              </button>
            </div>

            {addMode === 'existing' ? (
              <>
                {/* Existing contact autocomplete */}
                <div ref={existingDropdownRef} className="relative mb-3">
                  <input
                    type="text"
                    className="input w-full"
                    value={form.contact_name || existingSearch}
                    onChange={(e) => {
                      setExistingSearch(e.target.value)
                      setForm(f => ({ ...f, contact_name: '' }))
                      setShowExistingDropdown(true)
                    }}
                    onFocus={() => { if (!form.contact_name) setShowExistingDropdown(true) }}
                    placeholder="Search your LinkedIn contacts..."
                  />
                  {showExistingDropdown && !form.contact_name && (
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-live-surface border border-live-border rounded-lg shadow-lg">
                      {filteredExistingContacts.length > 0 ? (
                        filteredExistingContacts.map((c, i) => (
                          <button
                            key={i}
                            onClick={() => selectExistingContact(c)}
                            className="w-full text-left px-3 py-2 hover:bg-live-bg-warm transition-colors border-b border-live-border last:border-b-0"
                          >
                            <div className="font-medium text-sm text-live-text">{c.name}</div>
                            <div className="text-xs text-live-text-secondary">
                              {c.position}{c.company ? ` at ${c.company}` : ''}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-4 text-sm text-live-text-secondary text-center">
                          No contacts match "{existingSearch}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {form.contact_name && (
                  <div className="p-3 bg-live-bg-warm rounded-lg border border-live-border mb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm text-live-text">{form.contact_name}</p>
                        <p className="text-xs text-live-text-secondary">
                          {form.contact_position}{form.contact_company ? ` at ${form.contact_company}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => { setForm(f => ({ ...f, contact_name: '', contact_company: '', contact_position: '', contact_email: '' })); setExistingSearch('') }}
                        className="text-live-text-secondary hover:text-live-text text-sm leading-none p-1"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* New contact — manual entry */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <input
                  type="text"
                  className="input"
                  placeholder="Contact name *"
                  value={form.contact_name}
                  onChange={(e) => setForm(f => ({ ...f, contact_name: e.target.value }))}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Company"
                  value={form.contact_company}
                  onChange={(e) => setForm(f => ({ ...f, contact_company: e.target.value }))}
                />
                <input
                  type="text"
                  className="input"
                  placeholder="Position"
                  value={form.contact_position}
                  onChange={(e) => setForm(f => ({ ...f, contact_position: e.target.value }))}
                />
              </div>
            )}

            {/* Email / Phone — shown for both modes */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input
                type="email"
                className="input"
                placeholder="Email"
                value={form.contact_email}
                onChange={(e) => setForm(f => ({ ...f, contact_email: e.target.value }))}
              />
              <input
                type="tel"
                className="input"
                placeholder="Phone"
                value={form.contact_phone}
                onChange={(e) => setForm(f => ({ ...f, contact_phone: e.target.value }))}
              />
            </div>

            <textarea
              className="input w-full mb-3 resize-y"
              placeholder="Notes (optional)"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} disabled={!form.contact_name.trim()} className="btn btn-primary text-sm px-4 py-2 disabled:opacity-50">Save</button>
              <button onClick={() => { setShowAdd(false); resetForm() }} className="btn text-sm px-4 py-2 border border-live-border">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {entries.length === 0 && !showAdd ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="text-4xl mb-4">&#128203;</div>
            <p className="text-live-text-secondary mb-2">No contacts being tracked yet.</p>
            <p className="text-sm text-live-text-secondary">Add contacts from the Priorities tab or click "Add Contact" above.</p>
          </div>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-3">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="card cursor-pointer hover:border-live-accent transition-colors"
              onClick={() => setSelectedEntry(entry)}
            >
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm text-live-text">{entry.contact_name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig(entry.status).color}`}>
                        {statusConfig(entry.status).label}
                      </span>
                      {(entry.engagement_log || []).length > 0 && (
                        <span className="text-xs text-live-text-secondary">
                          {(entry.engagement_log || []).length} log{(entry.engagement_log || []).length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    {entry.contact_position && (
                      <p className="text-xs text-live-text-secondary">
                        {entry.contact_position}{entry.contact_company ? ` at ${entry.contact_company}` : ''}
                      </p>
                    )}
                    {!entry.contact_position && entry.contact_company && (
                      <p className="text-xs text-live-text-secondary">{entry.contact_company}</p>
                    )}
                    {(entry.contact_email || entry.contact_phone) && (
                      <div className="flex gap-3 mt-1">
                        {entry.contact_email && (
                          <span className="text-xs text-live-text-secondary">{entry.contact_email}</span>
                        )}
                        {entry.contact_phone && (
                          <span className="text-xs text-live-text-secondary">{entry.contact_phone}</span>
                        )}
                      </div>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-live-text-secondary mt-1 line-clamp-2">{entry.notes}</p>
                    )}
                    <p className="text-xs text-live-text-secondary mt-1 opacity-60">
                      Last action: {formatDate(entry.last_action_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-xs px-2 py-1 border border-live-border rounded hover:bg-red-50 hover:border-red-200 text-live-text-secondary hover:text-red-600 transition-colors"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Board View with Drag and Drop */
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STATUSES.map(status => (
              <div key={status.id}>
                <div className="text-xs font-semibold uppercase text-live-text-secondary mb-2 flex items-center gap-1">
                  <span className={`inline-block w-2 h-2 rounded-full ${status.color.split(' ')[0]}`}></span>
                  {status.label} ({grouped[status.id]?.length || 0})
                </div>
                <DroppableColumn id={status.id} isOver={activeDropId === status.id}>
                  {(grouped[status.id] || []).map(entry => (
                    <DraggableCard key={entry.id} id={entry.id}>
                      <div
                        className="card cursor-pointer hover:border-live-accent transition-colors"
                        onClick={() => setSelectedEntry(entry)}
                      >
                        <div className="card-body py-2 px-3">
                          <p className="text-xs font-medium text-live-text truncate">{entry.contact_name}</p>
                          {entry.contact_position && (
                            <p className="text-xs text-live-text-secondary truncate">{entry.contact_position}</p>
                          )}
                          {entry.contact_company && (
                            <p className="text-xs text-live-text-secondary truncate">{entry.contact_company}</p>
                          )}
                          <div className="flex gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                            {STATUSES.filter(s => s.id !== entry.status).slice(0, 2).map(s => (
                              <button
                                key={s.id}
                                onClick={() => handleStatusChange(entry.id, s.id)}
                                className="text-[10px] px-1.5 py-0.5 border border-live-border rounded hover:bg-live-bg-warm transition-colors"
                                title={`Move to ${s.label}`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DraggableCard>
                  ))}
                </DroppableColumn>
              </div>
            ))}
          </div>
        </DndContext>
      )}

      {/* Detail Modal */}
      {selectedEntry && (
        <TrackerDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={handleEntryUpdate}
        />
      )}
    </div>
  )
}
