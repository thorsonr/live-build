import { useState, useRef } from 'react'
import { extractLinkedInZip, analyzeLinkedInData, prepareDataForAPI } from '../lib/linkedinParser'
import CategorySetup, { DEFAULT_CATEGORIES } from './CategorySetup'
import UserContextModal from './UserContextModal'
import AnalysisLoadingScreen from './AnalysisLoadingScreen'
import { api } from '../lib/api'

const FILE_TYPES = [
  { key: 'connections', label: 'Connections', required: true },
  { key: 'messages', label: 'Messages', required: false },
  { key: 'skills', label: 'Skills', required: false },
  { key: 'endorsements', label: 'Endorsements', required: false },
  { key: 'recommendations', label: 'Recommendations', required: false },
  { key: 'positions', label: 'Positions', required: false },
  { key: 'invitations', label: 'Invitations', required: false },
  { key: 'adtargeting', label: 'Ad Targeting', required: false },
  { key: 'shares', label: 'Shares', required: false },
  { key: 'inferences', label: 'Inferences', required: false },
]

// States: idle → extracting → ready → userContext → aiAnalyzing → done
export default function FileUpload({ onDataLoaded }) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [aiError, setAiError] = useState('')
  const [rawData, setRawData] = useState(null)
  const [localResult, setLocalResult] = useState(null)
  const [fileStatus, setFileStatus] = useState({})
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES)
  const [showCategories, setShowCategories] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef(null)
  const abortControllerRef = useRef(null)

  const handleDragOver = (e) => {
    e.preventDefault()
    if (status === 'idle' || status === 'error') {
      setStatus('dragover')
    }
  }

  const handleDragLeave = () => {
    if (status === 'dragover') {
      setStatus('idle')
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    await extractFile(file)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    await extractFile(file)
  }

  const extractFile = async (file) => {
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setError('Please upload a ZIP file from your LinkedIn data export.')
      setStatus('error')
      return
    }

    // Check file size (1.5MB limit)
    const maxSize = 1.5 * 1024 * 1024 // 1.5MB in bytes
    if (file.size > maxSize) {
      setError(`File too large. Maximum size is 1.5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`)
      setStatus('error')
      return
    }

    setStatus('extracting')
    setError('')
    setFileName(file.name)

    try {
      const { rawData: data, fileStatus: status } = await extractLinkedInZip(file)

      if (!data.connections || data.connections.length === 0) {
        throw new Error('No connections found in the uploaded file. Make sure you uploaded the correct LinkedIn export.')
      }

      setRawData(data)
      setFileStatus(status)
      setStatus('ready')
    } catch (err) {
      console.error('Extract error:', err)
      setError(err.message || 'Failed to extract LinkedIn data')
      setStatus('error')
    }
  }

  // Step 1: User clicks "Get LinkedIn Insights" — run local analysis, then show context modal
  const handleGetInsights = () => {
    if (!rawData) return

    try {
      const result = analyzeLinkedInData(rawData, categories)
      setLocalResult(result)
      setStatus('userContext')
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err.message || 'Failed to analyze data')
      setStatus('error')
    }
  }

  // Step 2a: User submits context — run AI analysis
  const handleContextSubmit = async (userContext) => {
    setStatus('aiAnalyzing')
    setAiError('')

    try {
      const response = await api.analyzeNetwork({
        rawData: prepareDataForAPI(rawData),
        userContext,
      })

      // Merge AI analysis with local result
      onDataLoaded({
        ...localResult,
        aiAnalysis: response.analysis,
      })
    } catch (err) {
      console.error('AI analysis error:', err)

      if (err.name === 'AbortError') {
        setAiError('Analysis timed out. The server took too long to respond.')
      } else if (err.message.includes('quota')) {
        setAiError('Free AI analysis used. Add your own Claude API key in Settings for unlimited analyses.')
      } else if (err.message.includes('API key')) {
        setAiError('No AI API key configured. Add your Claude API key in Settings to enable AI analysis.')
      } else {
        setAiError(err.message || 'AI analysis failed. You can still view your local analytics.')
      }
    }
  }

  // Step 2b: User skips AI — go straight to dashboard with local-only analytics
  const handleSkip = () => {
    onDataLoaded({
      ...localResult,
      aiAnalysis: null,
    })
  }

  // Retry AI analysis after error
  const handleRetry = () => {
    setStatus('userContext')
    setAiError('')
  }

  // View dashboard with local-only after AI error
  const handleViewDashboard = () => {
    onDataLoaded({
      ...localResult,
      aiAnalysis: null,
    })
  }

  const resetUpload = () => {
    setStatus('idle')
    setError('')
    setAiError('')
    setRawData(null)
    setLocalResult(null)
    setFileStatus({})
    setFileName('')
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const hasConnections = rawData?.connections?.length > 0
  const foundFilesCount = Object.values(fileStatus).filter(f => f.found).length

  // AI Analyzing state — show loading screen
  if (status === 'aiAnalyzing') {
    return (
      <AnalysisLoadingScreen
        error={aiError}
        onRetry={handleRetry}
        onViewDashboard={handleViewDashboard}
      />
    )
  }

  // User Context Modal
  if (status === 'userContext') {
    return (
      <>
        {/* Show the ready state in background */}
        <div className="max-w-3xl mx-auto opacity-30 pointer-events-none">
          <ReadyStateContent
            fileName={fileName}
            foundFilesCount={foundFilesCount}
            fileStatus={fileStatus}
            rawData={rawData}
            categories={categories}
          />
        </div>
        <UserContextModal
          onSubmit={handleContextSubmit}
          onSkip={handleSkip}
        />
      </>
    )
  }

  // Idle/Dragover state - show drop zone
  if (status === 'idle' || status === 'dragover' || status === 'extracting') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card">
          <div className="card-body p-10">
            <h2 className="font-display text-2xl font-semibold text-center mb-2">
              Visualize Your LinkedIn Network
            </h2>
            <p className="text-center text-live-text-secondary mb-6">
              Drop your LinkedIn data export ZIP file for comprehensive analysis.
            </p>

            <div
              className={`drop-zone ${status === 'dragover' ? 'dragover' : ''} ${status === 'extracting' ? 'processing' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => status !== 'extracting' && fileInputRef.current?.click()}
            >
              <div className="text-5xl mb-3">
                {status === 'extracting' ? '\u23F3' : status === 'dragover' ? '\uD83D\uDCE5' : '\uD83D\uDCE6'}
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {status === 'extracting' ? 'Extracting files...' : status === 'dragover' ? 'Drop to Upload' : 'Drop LinkedIn Export ZIP Here'}
              </h3>
              <p className="text-sm text-live-text-secondary">
                {status === 'extracting' ? fileName : 'or click to select file'}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="mt-6 p-4 rounded-lg bg-live-success/10 text-live-success text-sm">
              <strong>Local Processing:</strong> Your files are processed locally in your browser.
              Optional AI analysis sends anonymized data to our secure servers.
            </div>

            <p className="mt-4 text-center text-sm text-live-text-secondary">
              <a
                href="https://www.linkedin.com/mypreferences/d/download-my-data"
                target="_blank"
                rel="noopener noreferrer"
                className="text-live-info hover:underline"
              >
                Get your LinkedIn data export &rarr;
              </a>
              <br />
              <span className="text-xs">(May take up to 48 hours to process)</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card">
          <div className="card-body p-10 text-center">
            <div className="text-5xl mb-3">&#x274C;</div>
            <h2 className="font-display text-xl font-semibold mb-2">Upload Failed</h2>
            <p className="text-live-text-secondary mb-6">{error}</p>
            <button onClick={resetUpload} className="btn btn-primary">
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Ready state - show file status and analyze button
  if (status === 'ready' || status === 'analyzing') {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="card">
          <div className="card-body p-10">
            <ReadyStateContent
              fileName={fileName}
              foundFilesCount={foundFilesCount}
              fileStatus={fileStatus}
              rawData={rawData}
              categories={categories}
              onCustomize={() => setShowCategories(true)}
            />

            {/* AI Analysis Notice */}
            <div className="mb-4 p-3 rounded-lg bg-live-accent/5 border border-live-accent/20 text-xs text-live-text-secondary">
              AI analysis sends your network data to our secure servers for processing. Raw files are never stored.
            </div>

            {/* Analyze Button */}
            <button
              onClick={handleGetInsights}
              disabled={status === 'analyzing' || !hasConnections}
              className="w-full py-4 bg-live-accent text-[#1a1a2e] rounded-lg font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Get LinkedIn Insights
            </button>

            <button
              onClick={resetUpload}
              className="w-full mt-3 py-2 text-sm text-live-text-secondary hover:text-live-text"
            >
              Upload a different file
            </button>
          </div>
        </div>

        {/* Category Setup Modal */}
        {showCategories && (
          <CategorySetup
            categories={categories}
            onChange={setCategories}
            onClose={() => setShowCategories(false)}
          />
        )}
      </div>
    )
  }

  return null
}

// Extracted ready state content to reuse in background behind modal
function ReadyStateContent({ fileName, foundFilesCount, fileStatus, rawData, categories, onCustomize }) {
  return (
    <>
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">&#x2705;</div>
        <h2 className="font-display text-xl font-semibold mb-1">Ready to Analyze!</h2>
        <p className="text-live-text-secondary">
          Found {foundFilesCount} data files in {fileName}
        </p>
      </div>

      {/* File Status Grid */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {FILE_TYPES.map(({ key, label }) => {
          const s = fileStatus[key]
          const isFound = s?.found
          return (
            <div
              key={key}
              className={`p-3 rounded-lg text-center text-xs ${
                isFound
                  ? 'bg-live-success/10 text-live-success'
                  : 'bg-live-bg-warm text-live-text-secondary'
              }`}
            >
              <div className="font-semibold mb-1">{label}</div>
              <div>
                {isFound ? `\u2713 ${s.count}` : '\u2014'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Category Customization */}
      <div className="mb-6 p-4 bg-live-bg-warm rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-sm">Contact Categories</h3>
            <p className="text-xs text-live-text-secondary">
              {categories.length} categories defined for analysis
            </p>
          </div>
          {onCustomize && (
            <button
              onClick={onCustomize}
              className="text-sm text-live-info hover:underline"
            >
              Customize
            </button>
          )}
        </div>
      </div>

      {/* Analysis Stats Preview */}
      <div className="mb-6 p-4 border border-live-border rounded-lg">
        <h3 className="font-semibold text-sm mb-3">Data Preview</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-light text-live-accent">{rawData.connections.length}</div>
            <div className="text-xs text-live-text-secondary">Connections</div>
          </div>
          <div>
            <div className="text-2xl font-light">{rawData.messages.length}</div>
            <div className="text-xs text-live-text-secondary">Messages</div>
          </div>
          <div>
            <div className="text-2xl font-light">{rawData.endorsements.length}</div>
            <div className="text-xs text-live-text-secondary">Endorsements</div>
          </div>
        </div>
      </div>
    </>
  )
}
