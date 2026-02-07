import { useState } from 'react'

export default function UserContextModal({ onSubmit, onSkip }) {
  const [userContext, setUserContext] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(userContext)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-live-surface rounded-xl max-w-lg w-full shadow-xl border border-live-border">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">&#x1F9E0;</div>
            <h2 className="font-display text-xl font-semibold mb-2">
              Personalize Your Analysis
            </h2>
            <p className="text-sm text-live-text-secondary">
              Help our AI deliver insights tailored to your situation. The more context you share, the more actionable your report will be.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="label" htmlFor="userContext">
              Tell us about yourself and your goals
            </label>
            <textarea
              id="userContext"
              className="input mb-1"
              rows={5}
              value={userContext}
              onChange={(e) => setUserContext(e.target.value)}
              maxLength={750}
              placeholder={"e.g., I'm a VP of Product at a mid-size SaaS company exploring my next move. I've been in product management for 12 years and I'm interested in Chief Product Officer roles or advisory positions at startups. I want to understand which relationships in my network I should be nurturing."}
              style={{ resize: 'vertical', minHeight: '120px' }}
            />
            <p className="text-xs text-live-text-secondary mb-6">
              Consider including: your current role, career situation, what you want from this analysis
            </p>

            <button
              type="submit"
              className="w-full py-4 bg-live-accent text-[#1a1a2e] rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              Analyze My Network
            </button>
          </form>

          <div className="mt-3 text-center">
            <button
              onClick={onSkip}
              className="text-sm text-live-text-secondary hover:text-live-text transition-colors"
            >
              Skip AI Analysis — view local analytics only
            </button>
          </div>

          <div className="mt-4 p-3 rounded-lg bg-live-bg-warm text-xs text-live-text-secondary">
            AI analysis sends your network data to our secure servers for processing. Raw files are never stored.
          </div>
        </div>
      </div>
    </div>
  )
}
