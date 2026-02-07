import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <main className="max-w-4xl mx-auto px-8 py-16">
      <div className="text-center mb-16">
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
            Start Free Trial
          </Link>
          <span className="text-sm text-live-text-secondary">Invite code required</span>
        </div>
        <div className="mt-4">
          <Link to="/sample" className="text-sm text-live-info hover:underline">
            See a sample dashboard with demo data
          </Link>
        </div>
      </div>

      {/* AI Features Highlight */}
      <div className="card mb-12 border-live-accent">
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
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-16">
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

      {/* Pricing Section */}
      <div className="mb-16">
        <h2 className="font-display text-2xl font-semibold text-center mb-8">Simple Pricing</h2>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="card border-2 border-live-accent">
            <div className="card-body p-6">
              <div className="badge badge-accent mb-3">Most Popular</div>
              <h3 className="text-xl font-semibold mb-1">LiVE Pro</h3>
              <div className="mb-4">
                <span className="text-3xl font-light">$5</span>
                <span className="text-live-text-secondary">/month</span>
              </div>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Full network analytics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Network strategy analysis
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Cloud sync across devices
                </li>
              </ul>
              <Link to="/signup" className="btn btn-primary w-full text-center block">
                Start Free Trial
              </Link>
              <p className="text-xs text-live-text-secondary text-center mt-2">
                Invite code required
              </p>
            </div>
          </div>

          <div className="card">
            <div className="card-body p-6">
              <h3 className="text-xl font-semibold mb-1">Bring Your Own Key</h3>
              <div className="mb-4">
                <span className="text-3xl font-light">$5</span>
                <span className="text-live-text-secondary">/month</span>
              </div>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Full network analytics
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Unlimited AI features*
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Use your own Claude API key
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-success">&#10003;</span> Cloud or local-only storage
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-live-text-secondary">—</span>
                  <span className="text-live-text-secondary">You pay AI costs directly</span>
                </li>
              </ul>
              <Link to="/signup" className="btn btn-secondary w-full text-center block">
                Start Free Trial
              </Link>
              <p className="text-xs text-live-text-secondary text-center mt-2">
                *Limited to personal use. AI usage billed by Anthropic.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h2 className="font-display text-2xl font-semibold mb-4">How It Works</h2>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-live-accent text-live-primary flex items-center justify-center font-semibold">1</span>
              <div>
                <strong>Export your LinkedIn data</strong>
                <p className="text-sm text-live-text-secondary">
                  Request your data archive from LinkedIn Settings → Get a copy of your data
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-live-accent text-live-primary flex items-center justify-center font-semibold">2</span>
              <div>
                <strong>Upload the ZIP file</strong>
                <p className="text-sm text-live-text-secondary">
                  Drop your LinkedIn data export into LiVE Pro for instant analysis
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-live-accent text-live-primary flex items-center justify-center font-semibold">3</span>
              <div>
                <strong>Explore insights and take action</strong>
                <p className="text-sm text-live-text-secondary">
                  View analytics, identify opportunities, and generate AI-powered outreach
                </p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-live-text-secondary mb-4">
          Questions? <a href="mailto:hello@robertthorson.com" className="text-live-info hover:underline">Contact us</a>
        </p>
        <p className="text-xs text-live-text-secondary">
          Need an invite code? <a href="mailto:hello@robertthorson.com" className="text-live-info hover:underline">Request early access</a>
        </p>
      </div>
    </main>
  )
}
