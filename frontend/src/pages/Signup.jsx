import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Require invite code
    if (!inviteCode.trim()) {
      setError('An invite code is required to sign up. Contact us to request access.')
      setLoading(false)
      return
    }

    try {
      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            invite_code: inviteCode,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      })

      if (error) throw error

      // Show success message for email verification
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  // Success state - email verification required
  if (success) {
    return (
      <main className="max-w-md mx-auto px-8 py-16">
        <div className="card">
          <div className="card-body text-center">
            <div className="text-5xl mb-4">📧</div>
            <h1 className="font-display text-2xl font-semibold mb-3">
              Check Your Email
            </h1>
            <p className="text-live-text-secondary mb-6">
              We've sent a verification link to <strong>{email}</strong>.
              Click the link in the email to verify your account and sign in.
            </p>
            <div className="p-4 bg-live-bg-warm rounded-lg text-sm text-live-text-secondary">
              <p className="mb-2">Didn't receive the email?</p>
              <ul className="text-left space-y-1">
                <li>• Check your spam or junk folder</li>
                <li>• Make sure you entered the correct email</li>
                <li>• Wait a few minutes and check again</li>
              </ul>
            </div>
            <Link
              to="/login"
              className="mt-6 inline-block text-live-info hover:underline text-sm"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto px-8 py-16">
      <div className="card">
        <div className="card-body">
          <h1 className="font-display text-2xl font-semibold text-center mb-2">
            Create Your Account
          </h1>
          <p className="text-center text-sm text-live-text-secondary mb-6">
            5-day free trial with 1 AI analysis and 2 AI chat questions
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Invite Code</label>
              <input
                type="text"
                className="input"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Enter your invite code"
                required
              />
              <p className="mt-1 text-xs text-live-text-secondary">
                Don't have a code? <a href="mailto:hello@live-pro.com" className="text-live-info hover:underline">Request access</a>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input
                  type="text"
                  className="input"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  className="input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={10}
                required
              />
              <p className="mt-1 text-xs text-live-text-secondary">
                At least 10 characters, with uppercase, lowercase, and a number
              </p>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-live-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-live-info hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-live-text-secondary">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </main>
  )
}
