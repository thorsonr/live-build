import { useState, useEffect } from 'react'
import { api } from '../lib/api'

const STATUSES = [
  { id: 'identified', label: 'Identified', color: 'bg-gray-100 text-gray-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-blue-100 text-blue-700' },
  { id: 'replied', label: 'Replied', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'meeting', label: 'Meeting', color: 'bg-green-100 text-green-700' },
  { id: 'closed', label: 'Closed', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'parked', label: 'Parked', color: 'bg-amber-100 text-amber-700' },
]

export default function TrackerTab({ sampleMode = false }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ contact_name: '', contact_company: '', contact_position: '', notes: '' })
  const [editForm, setEditForm] = useState({ status: '', notes: '' })
  const [viewMode, setViewMode] = useState('list') // 'list' | 'board'

  useEffect(() => {
    if (!sampleMode) loadEntries()
    else setLoading(false)
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

  const handleAdd = async () => {
    if (!form.contact_name.trim()) return
    try {
      const data = await api.addToTracker(form)
      setEntries(prev => [data.entry, ...prev])
      setForm({ contact_name: '', contact_company: '', contact_position: '', notes: '' })
      setShowAdd(false)
    } catch (err) {
      console.error('Failed to add:', err)
    }
  }

  const handleUpdate = async (id) => {
    try {
      const data = await api.updateTracker(id, editForm)
      setEntries(prev => prev.map(e => e.id === id ? data.entry : e))
      setEditingId(null)
    } catch (err) {
      console.error('Failed to update:', err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.removeFromTracker(id)
      setEntries(prev => prev.filter(e => e.id !== id))
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

  const startEdit = (entry) => {
    setEditingId(entry.id)
    setEditForm({ status: entry.status, notes: entry.notes || '' })
  }

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
            onClick={() => setShowAdd(!showAdd)}
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
            <textarea
              className="input w-full mb-3 resize-y"
              placeholder="Notes (optional)"
              rows={2}
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
            />
            <div className="flex gap-2">
              <button onClick={handleAdd} className="btn btn-primary text-sm px-4 py-2">Save</button>
              <button onClick={() => setShowAdd(false)} className="btn text-sm px-4 py-2 border border-live-border">Cancel</button>
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
            <div key={entry.id} className="card">
              <div className="card-body">
                {editingId === entry.id ? (
                  /* Edit mode */
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <p className="font-semibold text-sm">{entry.contact_name}</p>
                      <select
                        className="input text-xs py-1 px-2 w-auto"
                        value={editForm.status}
                        onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                      >
                        {STATUSES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <textarea
                      className="input w-full mb-3 resize-y text-sm"
                      rows={2}
                      placeholder="Notes..."
                      value={editForm.notes}
                      onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdate(entry.id)} className="text-xs px-3 py-1 bg-live-accent text-[#1a1a2e] rounded-lg font-medium">Save</button>
                      <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1 border border-live-border rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  /* Display mode */
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-live-text">{entry.contact_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig(entry.status).color}`}>
                          {statusConfig(entry.status).label}
                        </span>
                      </div>
                      {(entry.contact_position || entry.contact_company) && (
                        <p className="text-xs text-live-text-secondary">
                          {entry.contact_position}{entry.contact_company ? ` at ${entry.contact_company}` : ''}
                        </p>
                      )}
                      {entry.notes && (
                        <p className="text-xs text-live-text-secondary mt-1 line-clamp-2">{entry.notes}</p>
                      )}
                      <p className="text-xs text-live-text-secondary mt-1 opacity-60">
                        Last action: {formatDate(entry.last_action_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-xs px-2 py-1 border border-live-border rounded hover:bg-live-bg-warm transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-xs px-2 py-1 border border-live-border rounded hover:bg-red-50 hover:border-red-200 text-live-text-secondary hover:text-red-600 transition-colors"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Board View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {STATUSES.map(status => (
            <div key={status.id}>
              <div className="text-xs font-semibold uppercase text-live-text-secondary mb-2 flex items-center gap-1">
                <span className={`inline-block w-2 h-2 rounded-full ${status.color.split(' ')[0]}`}></span>
                {status.label} ({grouped[status.id]?.length || 0})
              </div>
              <div className="space-y-2 min-h-[100px]">
                {(grouped[status.id] || []).map(entry => (
                  <div key={entry.id} className="card">
                    <div className="card-body py-2 px-3">
                      <p className="text-xs font-medium text-live-text truncate">{entry.contact_name}</p>
                      {entry.contact_company && (
                        <p className="text-xs text-live-text-secondary truncate">{entry.contact_company}</p>
                      )}
                      <div className="flex gap-1 mt-1">
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
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
