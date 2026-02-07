// Strip markdown formatting from AI text (bold, italic, bullet markers)
export function stripMarkdown(text) {
  if (!text) return text
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')       // *italic* → italic
    .replace(/^[\s]*[-*•]\s+/gm, '')    // bullet markers at line start
    .replace(/^#+\s+/gm, '')            // # headers
}

/**
 * AIInsightCard — reusable component for displaying AI editorial insights.
 * Three states: has insight (renders formatted prose), loading (shimmer), error/unavailable.
 * Gold/accent left border, subtle gold background tint, uppercase "AI INSIGHT" label.
 */
export default function AIInsightCard({ insight, loading, error, onRetry, label }) {
  // Loading state — shimmer skeleton
  if (loading) {
    return (
      <div className="ai-insight-card ai-insight-card--loading">
        <div className="text-xs font-semibold tracking-wider uppercase text-live-accent mb-3">
          {label || 'AI INSIGHT'}
        </div>
        <div className="space-y-2">
          <div className="ai-shimmer h-4 rounded w-full" />
          <div className="ai-shimmer h-4 rounded w-5/6" />
          <div className="ai-shimmer h-4 rounded w-4/6" />
        </div>
      </div>
    )
  }

  // Error / unavailable state
  if (error || !insight) {
    return (
      <div className="ai-insight-card ai-insight-card--unavailable">
        <div className="text-xs font-semibold tracking-wider uppercase text-live-text-secondary mb-2">
          {label || 'AI INSIGHT'}
        </div>
        <p className="text-sm text-live-text-secondary">
          {error || 'AI insight not available. Run AI analysis to see personalized insights here.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 text-sm text-live-accent hover:underline"
          >
            Retry AI Analysis
          </button>
        )}
      </div>
    )
  }

  // Has insight — render formatted prose
  return (
    <div className="ai-insight-card">
      <div className="text-xs font-semibold tracking-wider uppercase text-live-accent mb-2">
        {label || 'AI INSIGHT'}
      </div>
      <div className="text-sm leading-relaxed text-live-text whitespace-pre-line">
        {stripMarkdown(insight)}
      </div>
    </div>
  )
}
