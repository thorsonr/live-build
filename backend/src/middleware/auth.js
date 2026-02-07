import { supabase, supabaseAdmin } from '../lib/supabase.js'

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify the JWT with Supabase (anon client for token verification)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Attach user to request
    req.user = user
    req.accessToken = token
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    res.status(401).json({ error: 'Authentication failed' })
  }
}

export async function requireAdmin(req, res, next) {
  try {
    // First check auth
    await requireAuth(req, res, async () => {
      // Then check admin status (use admin client to bypass RLS on users table)
      const { data: userData, error } = await supabaseAdmin
        .from('users')
        .select('is_admin')
        .eq('id', req.user.id)
        .single()

      if (error || !userData?.is_admin) {
        return res.status(403).json({ error: 'Admin access required' })
      }

      next()
    })
  } catch (err) {
    console.error('Admin middleware error:', err)
    res.status(403).json({ error: 'Access denied' })
  }
}
