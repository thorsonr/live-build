import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <main className="max-w-3xl mx-auto px-8 py-16">
      <div className="card">
        <div className="card-body p-8">
          <h1 className="font-display text-3xl font-semibold mb-2">Terms of Service</h1>
          <p className="text-sm text-live-text-secondary mb-8">Last updated: February 7, 2026</p>

          <div className="space-y-8 text-sm text-live-text leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
              <p>
                By creating an account or using LiVE Pro ("the Service"), you agree to these Terms of Service
                and our <Link to="/privacy" className="text-live-info hover:underline">Privacy Policy</Link>.
                If you do not agree, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">2. Beta Service</h2>
              <p>
                LiVE Pro is currently in beta. The Service is provided on an "as-is" and "as-available" basis.
                Features may change, be added, or be removed without notice. Service availability is not guaranteed.
                We welcome feedback and bug reports at{' '}
                <a href="mailto:hello@robertthorson.com" className="text-live-info hover:underline">hello@robertthorson.com</a>.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">3. Account Requirements</h2>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>You must be at least 18 years old to use LiVE Pro</li>
                <li>You must provide accurate account information</li>
                <li>You are responsible for maintaining the security of your account credentials</li>
                <li>An invite code is required during the beta period</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">4. Your Data & Responsibilities</h2>
              <p className="mb-2">
                You retain ownership of all data you upload to LiVE Pro. By using the Service, you represent that:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>You have the right to upload and analyze the LinkedIn data you provide</li>
                <li>The data you upload is your own LinkedIn data export</li>
                <li>You are responsible for complying with LinkedIn's terms of service regarding your data export</li>
                <li>You will not upload data belonging to other individuals without their consent</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">5. AI-Generated Content</h2>
              <p>
                LiVE Pro uses artificial intelligence to generate analysis, insights, outreach messages,
                and conversational responses. You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>AI outputs may be inaccurate, incomplete, or inappropriate</li>
                <li>You are solely responsible for reviewing, editing, and deciding how to use any AI-generated content</li>
                <li>AI-generated outreach messages should be reviewed before sending to any contact</li>
                <li>LiVE Pro does not guarantee the accuracy or effectiveness of any AI output</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">6. Not Professional Advice</h2>
              <p>
                LiVE Pro provides data analysis and AI-generated insights for informational purposes only.
                The Service does not constitute career advice, legal advice, recruiting services, or
                professional consulting. You should exercise your own judgment when making professional
                decisions based on information from LiVE Pro.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">7. Acceptable Use</h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Use the Service for any unlawful purpose</li>
                <li>Upload data you do not have the right to use</li>
                <li>Attempt to access other users' data or accounts</li>
                <li>Use the Service for mass automated outreach, spam, or harassment</li>
                <li>Reverse engineer, scrape, or extract data from the Service</li>
                <li>Resell or redistribute AI-generated content commercially without attribution</li>
                <li>Attempt to circumvent usage limits, rate limits, or security measures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">8. Bring Your Own Key (BYOK)</h2>
              <p>
                If you provide your own Anthropic API key, you are responsible for the costs incurred
                through your API key usage. Your API key is encrypted before storage and is used only
                to process your requests. LiVE Pro is not responsible for charges on your Anthropic account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">9. Service Tiers & Limits</h2>
              <p>
                LiVE Pro offers tiered access with different usage limits. We reserve the right to
                modify tier features, limits, and pricing. During the beta period, access is provided
                at no cost or at introductory terms that may change upon general availability.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">10. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, LiVE Pro and its operators shall not be liable
                for any indirect, incidental, special, consequential, or punitive damages, including
                but not limited to loss of data, loss of business opportunities, or damages arising
                from the use of AI-generated content.
              </p>
              <p className="mt-2">
                The Service is provided without warranties of any kind, either express or implied,
                including but not limited to warranties of merchantability, fitness for a particular
                purpose, or non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">11. Account Termination</h2>
              <p>
                We reserve the right to suspend or terminate your account at any time for violation
                of these terms, abuse of the Service, or any other reason at our discretion.
                You may delete your data and stop using the Service at any time.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">12. LinkedIn Disclaimer</h2>
              <p>
                LiVE Pro is not affiliated with, endorsed by, or connected to LinkedIn Corporation
                or Microsoft Corporation. "LinkedIn" is a trademark of LinkedIn Corporation.
                LiVE Pro analyzes data that users export from their own LinkedIn accounts using
                LinkedIn's built-in data download feature. LiVE Pro does not access LinkedIn accounts,
                use LinkedIn APIs, or perform any automated actions on LinkedIn.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">13. Changes to Terms</h2>
              <p>
                We may update these Terms of Service from time to time. Material changes will be
                communicated via email or in-app notice. Continued use of the Service after changes
                constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-3">14. Contact</h2>
              <p>
                For questions about these Terms of Service, contact us at{' '}
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
