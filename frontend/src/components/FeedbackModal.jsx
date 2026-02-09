import { useState } from 'react'
import { api } from '../lib/api'

const CATEGORIES = [
  { value: 'general', label: 'General Feedback' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'ai', label: 'AI Quality' },
  { value: 'other', label: 'Other' },
]

export default function FeedbackModal({ onClose }) {
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true)
    setError('')

    try {
      await api.submitFeedback({
        category,
        message: message.trim(),
        page_url: window.location.pathname,
      })
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to submit feedback')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-live-surface rounded-xl max-w-lg w-full shadow-xl border border-live-border">
        <div className="p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">&#x2705;</div>
              <h2 className="font-display text-xl font-semibold mb-2">
                Thanks for your feedback!
              </h2>
              <p className="text-sm text-live-text-secondary mb-6">
                Your message has been received. We appreciate you helping improve LiVE Pro.
              </p>
              <button
                onClick={onClose}
                className="btn btn-primary"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-display text-xl font-semibold">
                  Send Feedback
                </h2>
                <button
                  onClick={onClose}
                  className="text-live-text-secondary hover:text-live-text text-xl leading-none p-1"
                >
                  &times;
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-4">
                  <label className="label">Message</label>
                  <textarea
                    className="input"
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    placeholder="Tell us what's on your mind..."
                    style={{ resize: 'vertical', minHeight: '120px' }}
                    required
                  />
                  <p className="text-xs text-live-text-secondary mt-1 text-right">
                    {message.length} / 2000
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1"
                    disabled={sending || !message.trim()}
                  >
                    {sending ? 'Sending...' : 'Submit Feedback'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
