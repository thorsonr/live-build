import { useState, useMemo, useRef, useEffect } from 'react'
import { api } from '../lib/api'

export default function MessageGenerator({ data, settings, profile, sampleMode = false, sampleMessages = null }) {
  const [mode, setMode] = useState('recommended') // 'recommended' | 'other'
  const [selectedContact, setSelectedContact] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [userContext, setUserContext] = useState('')
  const [tone, setTone] = useState('professional')
  const [length, setLength] = useState('medium')
  const [messages, setMessages] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(null)
  const [trackerAdded, setTrackerAdded] = useState({})
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleAddToTracker = async (contact, e) => {
    if (e) e.stopPropagation()
    if (!settings?.show_tracker) return
    try {
      await api.addToTracker({
        contact_name: contact.name,
        contact_company: contact.company || '',
        contact_position: contact.position || '',
      })
      setTrackerAdded(prev => ({ ...prev, [contact.name]: true }))
    } catch (err) {
      console.error('Failed to add to tracker:', err)
    }
  }

  // Build recommended contacts from AI priorities + playbooks
  const recommendedContacts = useMemo(() => {
    const contacts = []
    const seen = new Set()

    const priorities = data?.aiAnalysis?.screens?.priorities?.outreach_priorities || []
    for (const p of priorities.slice(0, 10)) {
      if (p.name && !seen.has(p.name)) {
        seen.add(p.name)
        contacts.push({
          name: p.name,
          position: p.title || '',
          company: p.company || '',
          relationship: p.relationship_strength || 'unknown',
          whyPrioritized: p.why_prioritized || '',
          source: 'priority',
        })
      }
    }

    const playbooks = data?.aiAnalysis?.screens?.priorities?.revival_playbooks || []
    for (const p of playbooks) {
      if (p.name && !seen.has(p.name)) {
        seen.add(p.name)
        contacts.push({
          name: p.name,
          position: p.title || '',
          company: p.company || '',
          relationship: 'dormant',
          contextHook: p.context_hook || '',
          source: 'playbook',
        })
      }
    }

    return contacts
  }, [data])

  // All contacts for the "Other Contact" searchable dropdown
  const allContacts = useMemo(() => {
    return (data?.contacts || []).map(c => ({
      name: c.name || '',
      position: c.position || '',
      company: c.company || '',
      relationship: c.relStrength || 'unknown',
      isDormant: c.isDormant || false,
      messageCount: c.messageCount || 0,
    }))
  }, [data])

  // Filtered contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return allContacts.slice(0, 50)
    const q = searchQuery.toLowerCase()
    return allContacts
      .filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.position.toLowerCase().includes(q)
      )
      .slice(0, 50)
  }, [allContacts, searchQuery])

  const selectContact = (contact) => {
    setSelectedContact(contact)
    setSearchQuery('')
    setShowDropdown(false)
    setMessages(null)
  }

  // Tier gate
  if (!settings?.show_outreach) {
    return (
      <div>
        <div className="section-label">Custom Messages</div>
        <h2 className="section-title mb-2">Custom Message Generator</h2>
        <p className="text-live-text-secondary mb-6">AI-crafted LinkedIn outreach messages tailored to each contact.</p>

        <div className="card">
          <div className="card-body text-center py-12 px-8">
            <div className="text-4xl mb-4">&#9993;</div>
            <h3 className="font-display text-lg font-semibold mb-3 text-live-text">
              Unlock the Custom Message Generator
            </h3>
            <p className="text-sm text-live-text-secondary mb-6 max-w-md mx-auto">
              Upgrade to Max to generate personalized LinkedIn outreach messages.
              Get two message variants for every contact — one direct, one conversational.
            </p>
            <a href="#upgrade" className="btn btn-primary inline-block">
              Upgrade to Max
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Sample mode: render static pre-generated messages
  if (sampleMode && sampleMessages) {
    return (
      <div>
        <div className="section-label">Custom Messages</div>
        <h2 className="section-title mb-2">Custom Message Generator</h2>
        <p className="text-live-text-secondary mb-6">Generate personalized LinkedIn outreach messages with two variants to choose from.</p>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Left: Contact (static) */}
          <div className="card">
            <div className="card-header">Select Contact</div>
            <div className="card-body space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-live-accent text-[#1a1a2e] text-center">
                  Recommended
                </div>
                <div className="flex-1 px-3 py-2 rounded-lg text-sm font-medium bg-live-bg-warm text-live-text-secondary text-center opacity-60">
                  Other Contact
                </div>
              </div>

              <div className="p-3 bg-live-bg-warm rounded-lg border border-live-accent">
                <p className="font-medium text-sm text-live-text">{sampleMessages.contact.name}</p>
                <p className="text-xs text-live-text-secondary">
                  {sampleMessages.contact.position}{sampleMessages.contact.company ? ` at ${sampleMessages.contact.company}` : ''}
                </p>
                {sampleMessages.contact.whyPrioritized && (
                  <p className="text-xs text-live-accent mt-1">{sampleMessages.contact.whyPrioritized}</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Goal (static) */}
          <div className="card">
            <div className="card-header">Your Goal</div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">What's the context for this outreach?</label>
                <div className="input min-h-[120px] bg-live-bg-warm text-sm text-live-text-secondary opacity-80">
                  {sampleMessages.userContext}
                </div>
              </div>
              <button className="btn btn-primary w-full opacity-60 cursor-default" disabled>
                Generate Messages
              </button>
            </div>
          </div>
        </div>

        {/* Pre-generated Messages */}
        <div className="relative">
          <div className="grid md:grid-cols-2 gap-6">
            <MessageCard
              label="Variant A"
              sublabel="Direct & Professional"
              message={sampleMessages.messages.variant_a}
              onCopy={() => {}}
              copied={false}
            />
            <MessageCard
              label="Variant B"
              sublabel="Warm & Conversational"
              message={sampleMessages.messages.variant_b}
              onCopy={() => {}}
              copied={false}
            />
          </div>

          {/* Signup CTA overlay */}
          <div className="mt-6 p-4 bg-live-accent/10 border border-live-accent/30 rounded-xl text-center">
            <p className="text-sm text-live-text mb-3">
              Sign up to generate custom messages for your own contacts
            </p>
            <a href="/signup" className="btn btn-primary inline-block text-sm px-6">
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    )
  }

  const handleGenerate = async () => {
    if (!selectedContact?.name) {
      setError('Please select a contact.')
      return
    }

    setGenerating(true)
    setError('')
    setMessages(null)

    try {
      const senderName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
      const result = await api.generateOutreachMessages({ contact: selectedContact, userContext, tone, length, senderName })
      setMessages(result.messages)
    } catch (err) {
      setError(err.message || 'Failed to generate messages. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = (text, variant) => {
    navigator.clipboard.writeText(text)
    setCopied(variant)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div>
      <div className="section-label">Custom Messages</div>
      <h2 className="section-title mb-2">Custom Message Generator</h2>
      <p className="text-live-text-secondary mb-6">Generate personalized LinkedIn outreach messages with two variants to choose from.</p>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Left: Contact Selection */}
        <div className="card">
          <div className="card-header">Select Contact</div>
          <div className="card-body space-y-4">
            {/* Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { setMode('recommended'); setSelectedContact(null); setMessages(null); setSearchQuery('') }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'recommended'
                    ? 'bg-live-accent text-[#1a1a2e]'
                    : 'bg-live-bg-warm text-live-text-secondary hover:text-live-text'
                }`}
              >
                Recommended
              </button>
              <button
                onClick={() => { setMode('other'); setSelectedContact(null); setMessages(null); setSearchQuery('') }}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'other'
                    ? 'bg-live-accent text-[#1a1a2e]'
                    : 'bg-live-bg-warm text-live-text-secondary hover:text-live-text'
                }`}
              >
                Other Contact
              </button>
            </div>

            {mode === 'recommended' ? (
              recommendedContacts.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {recommendedContacts.map((c, i) => (
                    <div
                      key={i}
                      onClick={() => selectContact(c)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                        selectedContact?.name === c.name
                          ? 'border-live-accent bg-live-accent-soft'
                          : 'border-live-border hover:bg-live-bg-warm'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium text-sm text-live-text">{c.name}</div>
                          <div className="text-xs text-live-text-secondary">
                            {c.position}{c.company ? ` at ${c.company}` : ''}
                          </div>
                          {c.whyPrioritized && (
                            <div className="text-xs text-live-accent mt-1">{c.whyPrioritized}</div>
                          )}
                        </div>
                        {settings?.show_tracker && (
                          <button
                            onClick={(e) => handleAddToTracker(c, e)}
                            disabled={trackerAdded[c.name]}
                            className="flex-shrink-0 text-xs px-2 py-1 border border-live-border rounded hover:bg-live-bg-warm disabled:opacity-50 transition-colors ml-2"
                          >
                            {trackerAdded[c.name] ? 'Added' : '+ Track'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-live-text-secondary py-4 text-center">
                  Run an AI analysis first to get recommended contacts, or use Other Contact.
                </p>
              )
            ) : (
              /* Searchable dropdown of all contacts */
              <div ref={dropdownRef} className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  className="input w-full"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true) }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search by name, company, or title..."
                />
                {showDropdown && (
                  <div className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-live-surface border border-live-border rounded-lg shadow-lg">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => selectContact(c)}
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
                        No contacts match "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selected contact detail card */}
            {selectedContact && (
              <div className="p-3 bg-live-bg-warm rounded-lg border border-live-border">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm text-live-text">{selectedContact.name}</p>
                    <p className="text-xs text-live-text-secondary">
                      {selectedContact.position}{selectedContact.company ? ` at ${selectedContact.company}` : ''}
                    </p>
                    {selectedContact.relationship && selectedContact.relationship !== 'unknown' && (
                      <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${
                        selectedContact.relationship === 'strong' ? 'bg-green-100 text-green-700'
                          : selectedContact.relationship === 'warm' ? 'bg-blue-100 text-blue-700'
                          : selectedContact.relationship === 'dormant' ? 'bg-amber-100 text-amber-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {selectedContact.relationship}
                      </span>
                    )}
                    {selectedContact.whyPrioritized && (
                      <p className="text-xs text-live-accent mt-1">{selectedContact.whyPrioritized}</p>
                    )}
                    {selectedContact.contextHook && (
                      <p className="text-xs text-live-accent mt-1">{selectedContact.contextHook}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {settings?.show_tracker && (
                      <button
                        onClick={() => handleAddToTracker(selectedContact)}
                        disabled={trackerAdded[selectedContact.name]}
                        className="text-xs px-2 py-1 border border-live-border rounded hover:bg-live-bg-warm disabled:opacity-50 transition-colors"
                      >
                        {trackerAdded[selectedContact.name] ? 'Added' : '+ Track'}
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedContact(null); setMessages(null) }}
                      className="text-live-text-secondary hover:text-live-text text-sm leading-none p-1"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Goal + Generate */}
        <div className="card">
          <div className="card-header">Your Goal</div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">What's the context for this outreach?</label>
              <textarea
                className="input min-h-[120px] resize-y"
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="e.g. I'm exploring partnerships in the fintech space and want to reconnect about potential collaboration..."
              />
            </div>

            {/* Tone & Length Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Tone</label>
                <select
                  className="input w-full"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="friendly">Friendly</option>
                  <option value="direct">Direct</option>
                </select>
              </div>
              <div>
                <label className="label">Length</label>
                <select
                  className="input w-full"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                >
                  <option value="short">Short (~50 words)</option>
                  <option value="medium">Medium (~100 words)</option>
                  <option value="long">Long (~200 words)</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !selectedContact}
              className="btn btn-primary w-full"
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">&#9696;</span>
                  Generating Messages...
                </span>
              ) : (
                'Generate Messages'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Generated Messages */}
      {messages && (
        <div className="grid md:grid-cols-2 gap-6">
          <MessageCard
            label="Variant A"
            sublabel="Direct & Professional"
            message={messages.variant_a}
            onCopy={(text) => handleCopy(text, 'a')}
            copied={copied === 'a'}
          />
          <MessageCard
            label="Variant B"
            sublabel="Warm & Conversational"
            message={messages.variant_b}
            onCopy={(text) => handleCopy(text, 'b')}
            copied={copied === 'b'}
          />
        </div>
      )}

      {/* Generating shimmer */}
      {generating && (
        <div className="grid md:grid-cols-2 gap-6">
          {[0, 1].map(i => (
            <div key={i} className="card animate-pulse">
              <div className="card-body space-y-3">
                <div className="h-4 bg-live-bg-warm rounded w-1/3"></div>
                <div className="h-3 bg-live-bg-warm rounded w-full"></div>
                <div className="h-3 bg-live-bg-warm rounded w-5/6"></div>
                <div className="h-3 bg-live-bg-warm rounded w-4/6"></div>
                <div className="h-3 bg-live-bg-warm rounded w-full"></div>
                <div className="h-3 bg-live-bg-warm rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MessageCard({ label, sublabel, message, onCopy, copied }) {
  if (!message) return null

  const body = message.body || message
  const subject = message.subject || ''

  return (
    <div className="card">
      <div className="card-header flex justify-between items-center">
        <div>
          <span className="font-semibold">{label}</span>
          <span className="text-xs text-live-text-secondary ml-2">{sublabel}</span>
        </div>
        <button
          onClick={() => onCopy(body)}
          className={`text-xs px-3 py-1 rounded-lg border transition-colors ${
            copied
              ? 'bg-live-success/10 border-live-success text-live-success'
              : 'border-live-border text-live-text-secondary hover:bg-live-bg-warm'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="card-body">
        {subject && (
          <p className="text-xs font-semibold text-live-accent mb-2">{subject}</p>
        )}
        <p className="text-sm text-live-text leading-relaxed whitespace-pre-line">{body}</p>
      </div>
    </div>
  )
}
