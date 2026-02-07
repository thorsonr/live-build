import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { api } from './lib/api'
import { DataProvider } from './lib/DataContext'
import { ThemeProvider } from './lib/ThemeContext'
import Header from './components/Header'
import ChatBubble from './components/ChatBubble'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import ResetPassword from './pages/ResetPassword'
import SampleDashboard from './pages/SampleDashboard'

function ProtectedRoute({ children, user }) {
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AdminRoute({ children, user, settings }) {
  if (!user) {
    return <Navigate to="/login" replace />
  }
  if (!settings?.is_admin) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (!session?.user) setSettings(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch settings when user logs in
  useEffect(() => {
    if (user) {
      api.getSettings()
        .then(s => setSettings(s))
        .catch(() => {})
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-live-bg">
        <div className="text-live-text-secondary">Loading...</div>
      </div>
    )
  }

  return (
    <ThemeProvider>
      <DataProvider>
        <div className="min-h-screen bg-live-bg transition-colors">
          <Header user={user} settings={settings} />
          <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user}>
              <Dashboard user={user} settings={settings} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute user={user}>
              <Settings user={user} settings={settings} onSettingsChange={setSettings} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute user={user} settings={settings}>
              <Admin user={user} />
            </AdminRoute>
          }
        />
          <Route path="/sample" element={<SampleDashboard />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          </Routes>
          {user && settings?.chat_enabled && <ChatBubble settings={settings} />}
        </div>
      </DataProvider>
    </ThemeProvider>
  )
}

export default App
