import { useState, useEffect } from 'react'

const STATUS_MESSAGES = [
  'Mapping your network topology...',
  'Analyzing connection composition...',
  'Identifying strategic relationships...',
  'Evaluating engagement patterns...',
  'Scoring outreach priorities...',
  'Reviewing content footprint...',
  'Assessing endorsement signals...',
  'Detecting LinkedIn algorithm biases...',
  'Generating editorial insights...',
  'Crafting personalized recommendations...',
]

const STAGE_INTERVAL = 6000 // 6 seconds per message

export default function AnalysisLoadingScreen({ error, onRetry, onViewDashboard }) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (error) return

    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % STATUS_MESSAGES.length)
    }, STAGE_INTERVAL)

    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev // Stall near end, don't hit 100 until complete
        return prev + 0.5
      })
    }, 300)

    return () => {
      clearInterval(messageTimer)
      clearInterval(progressTimer)
    }
  }, [error])

  if (error) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="card">
          <div className="card-body p-10">
            <div className="text-5xl mb-4">&#x26A0;&#xFE0F;</div>
            <h2 className="font-display text-xl font-semibold mb-2">
              AI Analysis Encountered an Issue
            </h2>
            <p className="text-live-text-secondary mb-2">
              {error}
            </p>
            <p className="text-sm text-live-text-secondary mb-6">
              Your local analysis is complete and ready to view.
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={onViewDashboard} className="btn btn-primary">
                View Dashboard
              </button>
              <button onClick={onRetry} className="btn btn-secondary">
                Retry AI Analysis
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="card">
        <div className="card-body p-10">
          <div className="mb-8">
            <div className="inline-block animate-pulse">
              <div className="text-5xl">&#x2728;</div>
            </div>
          </div>

          <h2 className="font-display text-xl font-semibold mb-2">
            Analyzing Your Network
          </h2>
          <p className="text-live-text-secondary mb-8">
            Our AI is reviewing your LinkedIn data and generating personalized insights. This typically takes 30-90 seconds.
          </p>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 bg-live-border rounded-full overflow-hidden">
              <div
                className="h-full bg-live-accent rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Rotating Status Message */}
          <p className="text-sm text-live-accent font-medium loading-status-text">
            {STATUS_MESSAGES[messageIndex]}
          </p>
        </div>
      </div>
    </div>
  )
}
