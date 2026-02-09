import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import authRoutes from './routes/auth.js'
import dataRoutes from './routes/data.js'
import aiRoutes from './routes/ai.js'
import adminRoutes from './routes/admin.js'
import settingsRoutes from './routes/settings.js'

const app = express()
const PORT = process.env.PORT || 3001

// Security headers — relax CSP for serving SPA frontend
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

// CORS — supports comma-separated origins for multi-environment
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(s => s.trim())

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

// Body parsing with reasonable limit
app.use(express.json({ limit: '10mb' }))

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many authentication attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many AI requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/data', dataRoutes)
app.use('/api/ai', aiLimiter, aiRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/settings', settingsRoutes)

// Serve frontend static files in production/staging
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDist = path.join(__dirname, '../../frontend/dist')

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))

  // SPA catch-all — serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next()
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

// Error handling — don't leak internals in production
app.use((err, req, res, next) => {
  console.error('Error:', err)
  const isProd = process.env.NODE_ENV === 'production'
  res.status(err.status || 500).json({
    error: isProd ? 'Internal server error' : (err.message || 'Internal server error')
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`LiVE Pro API server running on port ${PORT}`)
})
