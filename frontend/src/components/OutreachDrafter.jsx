import { useState } from 'react'
import { api } from '../lib/api'

export default function OutreachDrafter({ contact, onClose }) {
  const [tone, setTone] = useState('warm')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generateDraft = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.generateOutreach({
        contact: {
          name: contact.name,
          position: contact.position,
          company: contact.company,
          lastContact: contact.connectedOn?.toISOString(),
          relationshipStrength: contact.relStrength,
          isDormant: contact.isDormant,
        },
        tone,
      })

      setDraft(response.draft)
    } catch (err) {
      // For demo purposes, generate a placeholder message
      setDraft(generateLocalDraft(contact, tone))
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(draft)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-live-border flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">Draft Outreach Message</h2>
            <p className="text-sm text-live-text-secondary mt-1">
              Generate a personalized reconnection message for {contact.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-live-text-secondary hover:text-live-text text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Contact Info */}
          <div className="mb-6 p-4 bg-live-bg-warm rounded-lg">
            <p className="font-semibold">{contact.name}</p>
            {contact.position && (
              <p className="text-sm text-live-text-secondary">{contact.position}</p>
            )}
            {contact.company && (
              <p className="text-sm text-live-accent">{contact.company}</p>
            )}
            <div className="flex gap-4 mt-2 text-xs text-live-text-secondary">
              <span>Relationship: {contact.relStrength}</span>
              {contact.isDormant && <span className="text-live-warning">Dormant</span>}
            </div>
          </div>

          {/* Tone Selection */}
          <div className="mb-6">
            <label className="label">Message Tone</label>
            <div className="flex gap-2">
              {['warm', 'professional', 'casual'].map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize ${
                    tone === t
                      ? 'bg-live-primary text-white'
                      : 'bg-live-bg-warm text-live-text-secondary hover:bg-live-border'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          {!draft && (
            <button
              onClick={generateDraft}
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Generating...' : 'Generate Draft with AI'}
            </button>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Draft Output */}
          {draft && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <label className="label mb-0">Generated Message</label>
                <button
                  onClick={copyToClipboard}
                  className="text-sm text-live-info hover:underline"
                >
                  Copy to clipboard
                </button>
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="input h-64 font-normal"
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={generateDraft}
                  disabled={loading}
                  className="btn btn-secondary flex-1"
                >
                  {loading ? 'Generating...' : 'Regenerate'}
                </button>
                <button onClick={onClose} className="btn btn-primary flex-1">
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Fallback local draft generation when API is unavailable
function generateLocalDraft(contact, tone) {
  const firstName = contact.firstName || contact.name.split(' ')[0]
  const templates = {
    warm: `Hi ${firstName},

I hope this message finds you well! It's been a while since we last connected, and I wanted to reach out to see how you're doing.

I noticed you're${contact.position ? ` working as ${contact.position}` : ''}${contact.company ? ` at ${contact.company}` : ''} — that's exciting! I'd love to hear about what you're working on these days.

I've been [brief update about yourself], and thought of you because [relevant connection point].

Would you be open to a quick virtual coffee catch-up sometime? I'd enjoy reconnecting and hearing about your journey.

Best regards`,

    professional: `Dear ${firstName},

I hope this message finds you well. I wanted to reconnect after some time has passed since we last corresponded.

${contact.company ? `I see you're currently at ${contact.company}` : 'I hope your career continues to progress well'}. I'd be interested in learning more about your current focus and any initiatives you're leading.

On my end, I've been [brief professional update]. I believe there may be some potential synergies worth exploring.

Would you have availability for a brief call in the coming weeks to reconnect?

Best regards`,

    casual: `Hey ${firstName}!

Long time no chat! Hope you're doing awesome.

Just scrolling through my connections and thought of you. ${contact.company ? `How's life at ${contact.company}?` : 'What have you been up to?'}

Would love to catch up sometime — no agenda, just curious how things are going on your end!

Cheers`,
  }

  return templates[tone] || templates.warm
}
