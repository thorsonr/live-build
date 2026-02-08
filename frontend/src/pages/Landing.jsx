import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <main className="max-w-4xl mx-auto px-8 py-16">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl md:text-5xl font-semibold text-live-primary mb-4">
          Understand Your LinkedIn Network
        </h1>
        <p className="text-lg text-live-text-secondary max-w-2xl mx-auto mb-8">
          LiVE Pro analyzes your LinkedIn data to reveal hidden patterns, identify dormant relationships,
          and generate AI-powered outreach messages to reconnect with your network.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/signup"
            className="btn btn-primary text-base px-8 py-3"
          >
            Start Trial
          </Link>
          <a
            href="mailto:hello@robertthorson.com?subject=LiVE%20Pro%20beta%20invite%20request"
            className="text-sm text-live-info hover:underline"
          >
            Request Invite Code
          </a>
        </div>
        <div className="mt-4">
          <Link to="/sample" className="text-sm text-live-info hover:underline">
            See a sample dashboard with demo data
          </Link>
        </div>
      </div>

      {/* AI Features Highlight */}
      <div className="card mb-12 border-live-accent border-2">
        <div className="card-body p-8">
          <div className="flex items-start gap-6">
            <svg className="w-10 h-10 flex-shrink-0 text-live-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 3 3v1a2 2 0 0 1 2 2v4a8 8 0 0 1-16 0v-4a2 2 0 0 1 2-2v-1a3 3 0 0 1 3-3V6a4 4 0 0 1 4-4z" />
              <circle cx="9" cy="14" r="1" fill="currentColor" stroke="none" />
              <circle cx="15" cy="14" r="1" fill="currentColor" stroke="none" />
            </svg>
            <div>
              <h2 className="font-display text-xl font-semibold mb-2">AI-Powered Network Intelligence</h2>
              <p className="text-live-text-secondary mb-4">
                LiVE Pro uses advanced AI to analyze your network and help you take action:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-live-accent">&#10003;</span>
                  <span><strong>Network Strategy Analysis</strong> — Get AI insights on gaps, opportunities, and priority contacts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-live-accent">&#10003;</span>
                  <span><strong>Relationship Intelligence</strong> — Understand your network's true engagement patterns</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-live-accent">&#10003;</span>
                  <span><strong>Smart Outreach Drafts</strong> — Generate personalized messages to reconnect with dormant contacts</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-live-accent">&#10003;</span>
                  <span><strong>AI Chat</strong> — Ask follow-up questions about your network for deeper, on-demand insights</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="card">
          <div className="card-body text-center">
            <div className="mb-4 flex justify-center">
              <svg className="w-10 h-10 text-live-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 17V13" /><path d="M12 17V9" /><path d="M17 17V5" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Deep Analytics</h3>
            <p className="text-sm text-live-text-secondary">
              Visualize connections by company, seniority, engagement, and custom categories.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="mb-4 flex justify-center">
              <svg className="w-10 h-10 text-live-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Dormant Detection</h3>
            <p className="text-sm text-live-text-secondary">
              Identify valuable relationships that have gone cold and get strategies to revive them.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card-body text-center">
            <div className="mb-4 flex justify-center">
              <svg className="w-10 h-10 text-live-text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-2">Cloud Sync</h3>
            <p className="text-sm text-live-text-secondary">
              Your insights persist across sessions. No need to re-upload your data every time.
            </p>
          </div>
        </div>
      </div>

      {/* Trust & Privacy Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="text-center p-4">
          <div className="flex justify-center mb-2">
            <svg className="w-7 h-7 text-live-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold mb-1">Your Data Stays Yours</h4>
          <p className="text-xs text-live-text-secondary">Delete everything at any time. We store only what you upload — nothing is shared or sold.</p>
        </div>
        <div className="text-center p-4">
          <div className="flex justify-center mb-2">
            <svg className="w-7 h-7 text-live-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <path d="M8 21h8" /><path d="M12 17v4" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold mb-1">Processed In Your Browser</h4>
          <p className="text-xs text-live-text-secondary">Your ZIP is parsed and analyzed locally. Only a summary is sent to AI — never raw files.</p>
        </div>
        <div className="text-center p-4">
          <div className="flex justify-center mb-2">
            <svg className="w-7 h-7 text-live-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold mb-1">No LinkedIn Access</h4>
          <p className="text-xs text-live-text-secondary">We never connect to your LinkedIn account. No posting, no API access, no automated actions.</p>
        </div>
        <div className="text-center p-4">
          <div className="flex justify-center mb-2">
            <svg className="w-7 h-7 text-live-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </div>
          <h4 className="text-sm font-semibold mb-1">Full Deletion Control</h4>
          <p className="text-xs text-live-text-secondary">One click removes all your data permanently — connections, analyses, and history.</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="card mb-12">
        <div className="card-body p-8">
          <h2 className="font-display text-2xl font-semibold mb-4">How It Works</h2>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-live-accent text-live-primary flex items-center justify-center font-semibold">1</span>
              <div>
                <strong>Export your LinkedIn data</strong>
                <p className="text-sm text-live-text-secondary">
                  Request your data archive from LinkedIn Settings &rarr; Get a copy of your data
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-live-accent text-live-primary flex items-center justify-center font-semibold">2</span>
              <div>
                <strong>Upload the ZIP file</strong>
                <p className="text-sm text-live-text-secondary">
                  Drop your LinkedIn data export into LiVE Pro. Files are parsed in your browser — only a structured summary reaches our servers.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-live-accent text-live-primary flex items-center justify-center font-semibold">3</span>
              <div>
                <strong>Explore insights and take action</strong>
                <p className="text-sm text-live-text-secondary">
                  View analytics, identify opportunities, generate AI-powered outreach, and track your engagement pipeline.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      {/* What Your LinkedIn Export Contains */}
      <div className="card mb-12">
        <div className="card-body p-8">
          <h2 className="font-display text-2xl font-semibold mb-2">What Your LinkedIn Export Contains</h2>
          <p className="text-sm text-live-text-secondary mb-6">
            LinkedIn lets you download a copy of your data. Each file unlocks different parts of your dashboard.
            The more files included, the richer your analysis.
          </p>
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex items-start gap-3 py-2 border-b border-live-border">
              <span className="text-live-accent font-mono text-xs bg-live-bg-warm px-2 py-0.5 rounded whitespace-nowrap mt-0.5">Connections.csv</span>
              <span className="text-live-text-secondary">Network shape, company breakdown, growth timeline, contacts list</span>
            </div>
            <div className="flex items-start gap-3 py-2 border-b border-live-border">
              <span className="text-live-accent font-mono text-xs bg-live-bg-warm px-2 py-0.5 rounded whitespace-nowrap mt-0.5">Messages.csv</span>
              <span className="text-live-text-secondary">Relationship strength, dormancy detection, engagement analysis</span>
            </div>
            <div className="flex items-start gap-3 py-2 border-b border-live-border">
              <span className="text-live-accent font-mono text-xs bg-live-bg-warm px-2 py-0.5 rounded whitespace-nowrap mt-0.5">Skills.csv</span>
              <span className="text-live-text-secondary">Skills & Expertise profile, endorsement patterns</span>
            </div>
            <div className="flex items-start gap-3 py-2 border-b border-live-border">
              <span className="text-live-accent font-mono text-xs bg-live-bg-warm px-2 py-0.5 rounded whitespace-nowrap mt-0.5">Endorsements.csv</span>
              <span className="text-live-text-secondary">Your Advocates — who endorses you and for which skills</span>
            </div>
            <div className="flex items-start gap-3 py-2 border-b border-live-border">
              <span className="text-live-accent font-mono text-xs bg-live-bg-warm px-2 py-0.5 rounded whitespace-nowrap mt-0.5">Shares.csv</span>
              <span className="text-live-text-secondary">Your Content — posting themes, frequency, and strategy insights</span>
            </div>
            <div className="flex items-start gap-3 py-2 border-b border-live-border">
              <span className="text-live-accent font-mono text-xs bg-live-bg-warm px-2 py-0.5 rounded whitespace-nowrap mt-0.5">Inferences.csv</span>
              <span className="text-live-text-secondary">LinkedIn's View — how the algorithm categorizes you (often surprising)</span>
            </div>
          </div>
          <p className="text-xs text-live-text-secondary mt-4">
            Only Connections.csv is required. All other files are optional and enhance the analysis. Message bodies are never stored — only a contact-level index is used.
          </p>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="mb-12">
        <h2 className="font-display text-2xl font-semibold text-center mb-2">Enhanced Analytics</h2>
        <p className="text-sm text-live-text-secondary text-center mb-8">
          <a href="mailto:hello@robertthorson.com?subject=LiVE%20Pro%20beta%20invite%20request" className="text-live-info hover:underline">Inquire about full access</a>
        </p>
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="card">
            <div className="card-body p-6">
              <h3 className="text-xl font-semibold mb-4">LiVE Pro</h3>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Full network analytics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> AI-powered strategy analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> AI chat for additional insights
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Enhanced AI models
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Cloud sync across devices
                </li>
              </ul>
            </div>
          </div>

          <div className="card border-2 border-live-accent">
            <div className="card-body p-6">
              <h3 className="text-xl font-semibold mb-4">LiVE Max</h3>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Everything in Pro
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Engagement planning and tracking
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Unlimited message drafting
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Unlimited AI insights chat
                </li>
              </ul>
            </div>
          </div>

          <div className="card">
            <div className="card-body p-6">
              <h3 className="text-xl font-semibold mb-4">Bring Your Own Key</h3>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Everything in Max
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Use your own Claude API key
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Choose your preferred AI model
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-text-secondary">—</span>
                  <span className="text-live-text-secondary">You pay AI costs directly</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Beta Notice */}
      <div className="card mb-12 border-live-border">
        <div className="card-body p-6 text-center">
          <p className="text-sm text-live-text-secondary">
            <strong className="text-live-text">Beta Notice:</strong>{' '}
            LiVE Pro is currently in beta. Features may change, outputs may be imperfect, and availability
            is not guaranteed. We welcome feedback at{' '}
            <a href="mailto:hello@robertthorson.com" className="text-live-info hover:underline">hello@robertthorson.com</a>.
          </p>
          <p className="text-xs text-live-text-secondary mt-2">
            LiVE Pro is not affiliated with or endorsed by LinkedIn Corporation.
          </p>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-live-text-secondary mb-4">
          Questions? <a href="mailto:hello@robertthorson.com" className="text-live-info hover:underline">Contact us</a>
        </p>
        <p className="text-xs text-live-text-secondary mb-4">
          Need an invite code? <a href="mailto:hello@robertthorson.com?subject=LiVE%20Pro%20beta%20invite%20request" className="text-live-info hover:underline">Request early access</a>
        </p>
        <div className="flex justify-center gap-4 text-xs text-live-text-secondary">
          <Link to="/privacy" className="hover:text-live-info hover:underline">Privacy Policy</Link>
          <span>|</span>
          <Link to="/terms" className="hover:text-live-info hover:underline">Terms of Service</Link>
        </div>
      </div>
    </main>
  )
}
