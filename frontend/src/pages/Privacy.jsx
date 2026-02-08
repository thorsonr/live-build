import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <main className="max-w-3xl mx-auto px-8 py-16">
      <div className="card">
        <div className="card-body p-8">
          <h1 className="font-display text-3xl font-semibold mb-2">Privacy Policy</h1>
          <p className="text-sm text-live-text-secondary mb-8">Last updated: February 7, 2026</p>

          <div className="space-y-8 text-sm text-live-text leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold mb-3">Overview</h2>
              <p>
                LiVE Pro ("we", "us", "our") is a professional networking intelligence tool that helps you
                understand and act on your LinkedIn data export. This Privacy Policy explains what data we
                collect, how we use it, and your rights regarding that data.
              </p>
              <p className="mt-2">
                LiVE Pro is not affiliated with, endorsed by, or connected to LinkedIn Corporation.
                We do not access your LinkedIn account. All data analyzed by LiVE Pro comes from files
                you voluntarily upload from your own LinkedIn data export.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">What Data You Provide</h2>
              <p className="mb-2">When you use LiVE Pro, you may provide:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Account information:</strong> Email address, first name, last name, and password (at signup)</li>
                <li><strong>LinkedIn data export:</strong> A ZIP file you download from LinkedIn containing CSV files such as Connections, Messages, Skills, Endorsements, Shares, and Inferences</li>
                <li><strong>User context:</strong> Optional text you provide describing your goals or situation for AI analysis</li>
                <li><strong>Engagement tracker entries:</strong> Contact names, companies, positions, and optional email/phone you manually enter</li>
                <li><strong>API key (optional):</strong> Your own Anthropic Claude API key if you choose the Bring Your Own Key option</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">How Your LinkedIn Data Is Processed</h2>
              <p className="mb-2">
                Your LinkedIn ZIP file is parsed and analyzed entirely in your web browser. The raw ZIP file
                is never uploaded to or stored on our servers.
              </p>
              <p className="mb-2">What happens in your browser (client-side only):</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>ZIP extraction and CSV parsing</li>
                <li>All statistics, charts, and category breakdowns are computed locally</li>
                <li>Contact enrichment (relationship strength, dormancy detection)</li>
              </ul>
              <p className="mt-2 mb-2">What is sent to our servers (for AI analysis):</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Connection names, job titles, companies, and connection dates</li>
                <li>A message count index (who you messaged and how many times — not message content)</li>
                <li>Skills, endorsements, and recommendation text</li>
                <li>Post metadata (for content analysis)</li>
                <li>LinkedIn's inferences about you (if included in your export)</li>
              </ul>
              <p className="mt-2 mb-2">What is never sent to our servers or AI:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Full message bodies or conversation content</li>
                <li>Email addresses from your connections</li>
                <li>LinkedIn profile URLs</li>
                <li>Position history or invitation records</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">How We Use Your Data</h2>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>To provide AI-powered network analysis, insights, and outreach message drafts</li>
                <li>To store your analysis results so you can access them across sessions</li>
                <li>To track your usage against your subscription tier limits</li>
                <li>To improve the service (aggregate, anonymized usage patterns only)</li>
              </ul>
              <p className="mt-2">
                We do not sell, rent, or share your personal data with third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">AI Processing</h2>
              <p>
                LiVE Pro uses Anthropic's Claude AI to generate editorial insights, outreach messages,
                and conversational advice. When AI features are used, a sanitized summary of your network
                data (with emails, URLs, and message bodies removed) is sent to Anthropic's API for processing.
              </p>
              <p className="mt-2">
                Anthropic processes this data according to their own privacy policy and does not use
                API inputs to train their models.
              </p>
              <p className="mt-2">
                If you use the Bring Your Own Key feature, AI requests are made using your personal API key.
                Your API key is encrypted using AES-256-GCM before storage and is never logged or exposed.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Third-Party Services</h2>
              <p className="mb-2">LiVE Pro uses the following third-party services to operate:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Supabase:</strong> Database hosting and user authentication (US-based, AWS infrastructure)</li>
                <li><strong>Anthropic (Claude):</strong> AI analysis and content generation (US-based)</li>
                <li><strong>Vercel:</strong> Frontend hosting (global CDN)</li>
                <li><strong>Railway:</strong> Backend hosting (US-based)</li>
              </ul>
              <p className="mt-2">
                No third-party analytics, advertising, or tracking services are used. LiVE Pro does not
                use cookies for tracking — only functional authentication cookies managed by Supabase.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Data Storage & Security</h2>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All data is transmitted over HTTPS (TLS encryption in transit)</li>
                <li>Database access is protected by Row-Level Security — users can only access their own data</li>
                <li>API keys are encrypted at rest using AES-256-GCM authenticated encryption</li>
                <li>Passwords are handled by Supabase Auth (bcrypt hashing)</li>
                <li>Rate limiting is applied to authentication and AI endpoints</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Data Retention & Deletion</h2>
              <p className="mb-2">You have full control over your data:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li><strong>Archive & Reset:</strong> Snapshot your current analysis and start fresh with a new upload</li>
                <li><strong>Delete All Data:</strong> Permanently and irreversibly remove all your connections, analyses, engagement tracker entries, archives, and usage quotas</li>
                <li><strong>Individual deletion:</strong> Remove individual engagement tracker entries at any time</li>
              </ul>
              <p className="mt-2">
                Usage logs (token counts and costs, without personal data content) are retained for
                billing and operational purposes.
              </p>
              <p className="mt-2">
                If you wish to have your account fully deleted, contact us at{' '}
                <a href="mailto:hello@robertthorson.com" className="text-live-info hover:underline">hello@robertthorson.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Your Rights</h2>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Access all data we store about you (visible in your dashboard)</li>
                <li>Correct your personal information (via Settings)</li>
                <li>Delete your data at any time (via Settings)</li>
                <li>Request full account deletion by contacting us</li>
                <li>Withdraw consent by stopping use of the service</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Children's Privacy</h2>
              <p>
                LiVE Pro is designed for professional use and is not intended for individuals under 18 years of age.
                We do not knowingly collect data from children.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify users of material changes
                via email or in-app notice. Continued use of LiVE Pro after changes constitutes acceptance
                of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">Contact</h2>
              <p>
                For questions about this Privacy Policy or your data, contact us at{' '}
                <a href="mailto:hello@robertthorson.com" className="text-live-info hover:underline">hello@robertthorson.com</a>.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-live-border text-center">
            <Link to="/" className="text-sm text-live-info hover:underline">Back to home</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
