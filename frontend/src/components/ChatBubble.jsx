import { useState, useRef, useEffect } from 'react'
import { useData } from '../lib/DataContext'
import { api } from '../lib/api'

function buildNetworkContext(data) {
  if (!data?.contacts || !data?.analytics) return ''

  const a = data.analytics
  const lines = []

  lines.push(`Total connections: ${a.total_connections || data.contacts.length}`)

  if (a.strength_breakdown) {
    const sb = a.strength_breakdown
    lines.push(`Strength breakdown: Strong ${sb.strong || 0}, Warm ${sb.warm || 0}, Cold ${sb.cold || 0}, New ${sb.new || 0}`)
  }

  if (a.dormant_count) lines.push(`Dormant contacts (2+ yrs): ${a.dormant_count}`)
  if (a.engagement_rate) lines.push(`Engagement rate: ${a.engagement_rate}%`)

  if (a.top_companies?.length > 0) {
    const top5 = a.top_companies.slice(0, 5).map(c => `${c.company} (${c.count})`).join(', ')
    lines.push(`Top companies: ${top5}`)
  }

  if (a.category_counts) {
    const cats = Object.entries(a.category_counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    if (cats) lines.push(`Categories: ${cats}`)
  }

  // AI summary snippet
  const exec = data.aiAnalysis?.screens?.summary?.executive_summary
  if (exec?.report_body) {
    lines.push(`AI summary: ${exec.report_body.substring(0, 300)}`)
  }

  // Sample contacts
  const strong = data.contacts.filter(c => c.relStrength === 'strong').slice(0, 10)
  if (strong.length > 0) {
    lines.push(`Strong contacts: ${strong.map(c => `${c.name} (${c.position || ''} at ${c.company || ''})`).join('; ')}`)
  }

  const dormant = data.contacts.filter(c => c.isDormant).slice(0, 10)
  if (dormant.length > 0) {
    lines.push(`Dormant contacts: ${dormant.map(c => `${c.name} (${c.position || ''} at ${c.company || ''})`).join('; ')}`)
  }

  return lines.join('\n')
}

export default function ChatBubble({ settings }) {
  const { data } = useData()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [chatUsed, setChatUsed] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const chatLimit = settings?.chat_limit || 2
  const showCounter = settings?.show_chat_counter || false
  const remaining = Math.max(0, chatLimit - chatUsed)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setError('')
    const userMsg = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setSending(true)

    try {
      const networkContext = buildNetworkContext(data)
      const { reply } = await api.chatMessage({
        messages: updatedMessages,
        networkContext,
      })

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setChatUsed(prev => prev + 1)
    } catch (err) {
      const msg = err.message || 'Something went wrong'
      if (msg.includes('quota') || msg.includes('Chat quota') || msg.includes('trial')) {
        setError(
          settings?.tier === 'trial'
            ? "You've used your 2 free questions. Upgrade to Pro for unlimited chat."
            : 'Chat quota exceeded this month. Please try again next month.'
        )
      } else {
        setError(msg)
      }
      // Remove the user message that failed
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="chat-bubble-trigger"
          aria-label="Open AI Chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-panel-header">
            <div>
              <span className="font-semibold text-sm">LiVE Pro AI</span>
              <span className="text-xs text-live-text-secondary ml-2">Network Advisor</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-live-text-secondary hover:text-live-text text-lg leading-none"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="chat-panel-messages">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4">
                <div className="text-3xl mb-3">&#128172;</div>
                <p className="text-sm text-live-text-secondary mb-2">
                  Ask me anything about your network
                </p>
                <div className="space-y-1 text-xs text-live-text-secondary">
                  <p>"Who should I reconnect with?"</p>
                  <p>"What are my strongest industries?"</p>
                  <p>"Help me prepare for a career pivot"</p>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.role === 'user' ? 'chat-message--user' : 'chat-message--assistant'}`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {sending && (
              <div className="chat-message chat-message--assistant">
                <div className="flex gap-1">
                  <span className="ai-shimmer w-2 h-2 rounded-full inline-block" />
                  <span className="ai-shimmer w-2 h-2 rounded-full inline-block" style={{ animationDelay: '0.2s' }} />
                  <span className="ai-shimmer w-2 h-2 rounded-full inline-block" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error message */}
          {error && (
            <div className="px-4 py-2 text-xs text-live-danger bg-live-bg-warm border-t border-live-border">
              {error}
            </div>
          )}

          {/* Counter for free tier */}
          {showCounter && !error && (
            <div className="px-4 py-1.5 text-xs text-live-text-secondary bg-live-bg-warm border-t border-live-border text-center">
              {remaining > 0
                ? `${remaining} question${remaining !== 1 ? 's' : ''} remaining`
                : "You've used your 2 free questions. Upgrade to Pro for unlimited chat."
              }
            </div>
          )}

          {/* Input */}
          <div className="chat-panel-input">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your network..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-live-text placeholder:text-live-text-secondary"
              disabled={sending || (showCounter && remaining <= 0)}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim() || (showCounter && remaining <= 0)}
              className="text-live-accent disabled:opacity-30 hover:opacity-80 transition-opacity"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
