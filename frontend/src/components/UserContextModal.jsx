import { useMemo, useState } from 'react'

const GOAL_OPTIONS = [
  'Active job search',
  'Exploring next 6-12 months',
  'Advisory/board opportunities',
  'Business development',
  'Network health check',
]

function buildContextPayload(form) {
  const lines = []

  const add = (label, value) => {
    const trimmed = (value || '').trim()
    if (trimmed) lines.push(`${label}: ${trimmed}`)
  }

  add('Primary goal', form.goal)
  add('Current role', form.currentRole)
  add('Target roles', form.targetRoles)
  add('Target companies', form.targetCompanies)
  add('Target industries', form.targetIndustries)
  add('Target geography', form.geography)
  add('Preferred company profile', form.companyProfile)
  add('Timeline', form.timeline)
  add('Success definition for this analysis', form.successDefinition)
  add('Additional context', form.additionalContext)

  return lines.join('\n')
}

export default function UserContextModal({ onSubmit, onSkip }) {
  const [form, setForm] = useState({
    goal: GOAL_OPTIONS[0],
    currentRole: '',
    targetRoles: '',
    targetCompanies: '',
    targetIndustries: '',
    geography: '',
    companyProfile: '',
    timeline: '',
    successDefinition: '',
    additionalContext: '',
  })

  const contextPreview = useMemo(() => buildContextPayload(form), [form])

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const targetCompanies = form.targetCompanies
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean)
    onSubmit({ contextText: contextPreview, targetCompanies })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-live-surface rounded-xl max-w-2xl w-full shadow-xl border border-live-border max-h-[92vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          <div className="text-center mb-5">
            <div className="text-3xl mb-2">&#x1F9E0;</div>
            <h2 className="font-display text-xl font-semibold mb-1">Personalize Your Analysis</h2>
            <p className="text-sm text-live-text-secondary">
              Share a short analysis brief so the report is tailored to your goals and market.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="goal">Primary goal</label>
              <select
                id="goal"
                className="input"
                value={form.goal}
                onChange={(e) => updateField('goal', e.target.value)}
              >
                {GOAL_OPTIONS.map((goal) => (
                  <option key={goal} value={goal}>{goal}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="currentRole">Current role</label>
                <input
                  id="currentRole"
                  className="input"
                  value={form.currentRole}
                  onChange={(e) => updateField('currentRole', e.target.value)}
                  placeholder="e.g., VP Strategy, Financial Services"
                />
              </div>
              <div>
                <label className="label" htmlFor="targetRoles">Target roles</label>
                <input
                  id="targetRoles"
                  className="input"
                  value={form.targetRoles}
                  onChange={(e) => updateField('targetRoles', e.target.value)}
                  placeholder="e.g., COO, Chief Transformation Officer"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="targetIndustries">Target industries</label>
                <input
                  id="targetIndustries"
                  className="input"
                  value={form.targetIndustries}
                  onChange={(e) => updateField('targetIndustries', e.target.value)}
                  placeholder="e.g., fintech, enterprise SaaS"
                />
              </div>
              <div>
                <label className="label" htmlFor="geography">Target geography</label>
                <input
                  id="geography"
                  className="input"
                  value={form.geography}
                  onChange={(e) => updateField('geography', e.target.value)}
                  placeholder="e.g., NYC metro, remote US"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="targetCompanies">Target companies (optional)</label>
              <textarea
                id="targetCompanies"
                className="input"
                rows={2}
                maxLength={500}
                value={form.targetCompanies}
                onChange={(e) => updateField('targetCompanies', e.target.value)}
                placeholder="e.g., Stripe, Snowflake, Delta Airlines (comma or new line separated)"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="companyProfile">Preferred company profile</label>
                <input
                  id="companyProfile"
                  className="input"
                  value={form.companyProfile}
                  onChange={(e) => updateField('companyProfile', e.target.value)}
                  placeholder="e.g., growth-stage, Fortune 500"
                />
              </div>
              <div>
                <label className="label" htmlFor="timeline">Timeline</label>
                <input
                  id="timeline"
                  className="input"
                  value={form.timeline}
                  onChange={(e) => updateField('timeline', e.target.value)}
                  placeholder="e.g., interviews in 90 days"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="successDefinition">What would make this report successful?</label>
              <textarea
                id="successDefinition"
                className="input"
                rows={3}
                maxLength={400}
                value={form.successDefinition}
                onChange={(e) => updateField('successDefinition', e.target.value)}
                placeholder="e.g., identify 15 high-probability referral paths and a weekly outreach plan"
              />
            </div>

            <div>
              <label className="label" htmlFor="additionalContext">Additional context (optional)</label>
              <textarea
                id="additionalContext"
                className="input"
                rows={3}
                maxLength={750}
                value={form.additionalContext}
                onChange={(e) => updateField('additionalContext', e.target.value)}
                placeholder="Anything else the AI should factor in?"
              />
            </div>

            <div className="p-3 rounded-lg bg-live-bg-warm border border-live-border">
              <p className="text-xs font-semibold text-live-text mb-1">Context sent to AI</p>
              <p className="text-xs text-live-text-secondary whitespace-pre-line">
                {contextPreview || 'No context provided.'}
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3 md:py-4 bg-live-accent text-[#1a1a2e] rounded-lg font-semibold text-base md:text-lg hover:opacity-90 transition-opacity"
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
            AI analysis sends your network data to secure servers for processing. Raw files are never stored.
          </div>
        </div>
      </div>
    </div>
  )
}
