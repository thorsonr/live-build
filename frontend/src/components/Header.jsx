import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useData } from '../lib/DataContext'
import { useTheme } from '../lib/ThemeContext'

export default function Header({ user, settings }) {
  const navigate = useNavigate()
  const { data, syncing, handleSyncToCloud } = useData()
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
      <header className="bg-[#1a1a2e] text-white px-8 py-5 flex justify-between items-center">
        <Link to="/" className="flex flex-col items-start">
          <h1 className="text-2xl font-bold leading-none">
            <span className="text-live-accent">Li</span>VE
            <span className="text-xs font-normal ml-2 opacity-70">Pro</span>
            <span className="text-[10px] font-medium ml-1.5 px-1.5 py-0.5 rounded bg-live-accent/20 text-live-accent uppercase tracking-wider">beta</span>
          </h1>
          <span className="text-xs opacity-60 mt-0.5 tracking-wide">LinkedIn Visual Engine</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Theme toggle */}
              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className="text-sm p-2 rounded-lg hover:bg-white/10 transition-colors"
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDark ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>
              {/* Save button - only show when data is loaded */}
              {data && (
                <button
                  onClick={handleSyncToCloud}
                  disabled={syncing}
                  className="text-sm px-4 py-2 rounded-lg bg-live-accent text-[#1a1a2e] font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  title="Save to cloud"
                >
                  {syncing ? 'Saving...' : '☁️ Save'}
                </button>
              )}
              <Link
                to="/dashboard"
                className="text-sm opacity-80 hover:opacity-100 transition-opacity"
              >
                Dashboard
              </Link>
              <Link
                to="/settings"
                className="text-sm opacity-80 hover:opacity-100 transition-opacity"
              >
                Settings
              </Link>
              {settings?.is_admin && (
                <Link
                  to="/admin"
                  className="text-sm opacity-80 hover:opacity-100 transition-opacity"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-sm px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm opacity-80 hover:opacity-100 transition-opacity"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="text-sm px-4 py-2 rounded-lg bg-live-accent text-[#1a1a2e] font-medium hover:opacity-90 transition-opacity"
              >
                Start Trial
              </Link>
            </>
          )}
        </div>
      </header>
  )
}
