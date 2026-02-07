import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useData } from '../lib/DataContext'

export default function Header({ user, settings }) {
  const navigate = useNavigate()
  const { data, syncing, handleSyncToCloud } = useData()

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
