import { useState, useMemo } from 'react'

export default function ContactGrid({ contacts, onSelectContact }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [strengthFilter, setStrengthFilter] = useState('all')

  const categories = useMemo(() => {
    const cats = new Set()
    contacts.forEach(c => {
      Object.entries(c.categories).forEach(([cat, matched]) => {
        if (matched) cats.add(cat)
      })
    })
    return Array.from(cats)
  }, [contacts])

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch =
          contact.name.toLowerCase().includes(searchLower) ||
          contact.company?.toLowerCase().includes(searchLower) ||
          contact.position?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Category filter
      if (categoryFilter !== 'all') {
        if (!contact.categories[categoryFilter]) return false
      }

      // Strength filter
      if (strengthFilter !== 'all') {
        if (strengthFilter === 'dormant' && !contact.isDormant) return false
        if (strengthFilter !== 'dormant' && contact.relStrength !== strengthFilter) return false
      }

      return true
    })
  }, [contacts, search, categoryFilter, strengthFilter])

  const strengthColors = {
    strong: 'bg-live-success text-white',
    warm: 'bg-live-accent text-live-primary',
    cold: 'bg-live-text-secondary text-white',
  }

  return (
    <div>
      <div className="section-label">All Contacts</div>
      <h2 className="section-title mb-6">Your Complete Network</h2>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name, company, or title..."
          className="input flex-1 min-w-[250px]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2 flex-shrink-0">
          <select
            className="input w-auto text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            className="input w-auto text-sm"
            value={strengthFilter}
            onChange={(e) => setStrengthFilter(e.target.value)}
          >
            <option value="all">All Strengths</option>
            <option value="strong">Strong</option>
            <option value="warm">Warm</option>
            <option value="cold">Cold</option>
            <option value="new">New</option>
            <option value="dormant">Dormant</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-live-text-secondary mb-4">
        Showing {filteredContacts.length} of {contacts.length} contacts
      </p>

      {/* Contact Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
        {filteredContacts.slice(0, 100).map(contact => (
          <div key={contact.id} className="contact-card flex flex-col">
            {contact.linkedInUrl && (
              <a
                href={contact.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-3 right-3 text-live-text-secondary opacity-40 hover:opacity-100 hover:text-[#0a66c2] text-xs"
              >
                🔗
              </a>
            )}

            <a
              href={contact.linkedInUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sm hover:text-live-info hover:underline"
            >
              {contact.name}
            </a>

            {contact.position && (
              <p className="text-xs text-live-text-secondary">{contact.position}</p>
            )}
            {contact.company && (
              <p className="text-xs text-live-accent font-medium">{contact.company}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mt-2">
              {contact.relStrength !== 'new' && strengthColors[contact.relStrength] && (
                <span className={`tag text-xs px-2 py-0.5 rounded ${strengthColors[contact.relStrength]}`}>
                  {contact.relStrength}
                </span>
              )}
              {contact.isDormant && (
                <span className="tag tag-dormant">dormant</span>
              )}
              {Object.entries(contact.categories).map(([cat, matched]) =>
                matched ? (
                  <span
                    key={cat}
                    className={`tag ${cat === 'Executives' ? 'bg-live-accent/15 text-live-accent border border-live-accent/25' : 'bg-live-bg-warm text-live-text-secondary'}`}
                  >
                    {cat.toLowerCase()}
                  </span>
                ) : null
              )}
            </div>

            {/* Bottom section — anchored to bottom */}
            <div className="mt-auto pt-3">
              <div className="flex gap-4 pt-3 border-t border-live-border text-xs text-live-text-secondary">
                {contact.messageCount > 0 && (
                  <span>💬 {contact.messageCount}</span>
                )}
                {contact.endorsementCount > 0 && (
                  <span>👍 {contact.endorsementCount}</span>
                )}
                {contact.connectedDate && (
                  <span>
                    Connected {contact.connectedDate.toLocaleDateString()}
                  </span>
                )}
              </div>

              <button
                onClick={() => onSelectContact(contact)}
                className="mt-3 w-full btn btn-secondary text-xs py-2"
              >
                Draft Outreach
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length > 100 && (
        <p className="mt-4 text-center text-sm text-live-text-secondary">
          Showing first 100 results. Use filters to narrow down.
        </p>
      )}
    </div>
  )
}
