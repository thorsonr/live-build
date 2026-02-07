import { useState } from 'react'

const DEFAULT_CATEGORIES = [
  { name: 'Recruiters', keywords: 'recruiter, talent acquisition, headhunter, staffing, sourcer' },
  { name: 'Executives', keywords: 'ceo, cfo, cto, cio, coo, cmo, chief, president, founder' },
  { name: 'Senior Leaders', keywords: 'vp, vice president, director, managing director, partner, svp, evp' },
  { name: 'Investors', keywords: 'investor, venture, private equity, vc, portfolio, angel' },
]

export default function CategorySetup({ categories, onChange, onClose }) {
  const [localCategories, setLocalCategories] = useState(
    categories || DEFAULT_CATEGORIES
  )

  const updateCategory = (index, field, value) => {
    const updated = [...localCategories]
    updated[index] = { ...updated[index], [field]: value }
    setLocalCategories(updated)
  }

  const addCategory = () => {
    setLocalCategories([
      ...localCategories,
      { name: '', keywords: '' }
    ])
  }

  const removeCategory = (index) => {
    setLocalCategories(localCategories.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    // Filter out empty categories
    const validCategories = localCategories.filter(
      cat => cat.name.trim() && cat.keywords.trim()
    )
    onChange(validCategories)
    onClose()
  }

  const handleReset = () => {
    setLocalCategories(DEFAULT_CATEGORIES)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-live-border flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">Customize Categories</h2>
            <p className="text-sm text-live-text-secondary mt-1">
              Define contact categories based on job titles and companies
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-live-text-secondary hover:text-live-text text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-live-text-secondary mb-4">
            Keywords are case-insensitive and match partial text in position or company fields.
          </p>

          <div className="space-y-3">
            {localCategories.map((cat, index) => (
              <div key={index} className="flex gap-3 items-start">
                <input
                  type="text"
                  className="input w-40"
                  placeholder="Category name"
                  value={cat.name}
                  onChange={(e) => updateCategory(index, 'name', e.target.value)}
                />
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Keywords (comma-separated)"
                  value={cat.keywords}
                  onChange={(e) => updateCategory(index, 'keywords', e.target.value)}
                />
                <button
                  onClick={() => removeCategory(index)}
                  className="px-3 py-2 text-live-danger hover:bg-red-50 rounded-lg border border-live-border"
                  title="Remove category"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={addCategory}
            className="mt-4 w-full py-2 border border-dashed border-live-border rounded-lg text-sm text-live-text-secondary hover:border-live-accent hover:text-live-accent transition-colors"
          >
            + Add Category
          </button>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleReset}
              className="btn btn-secondary"
            >
              Reset to Defaults
            </button>
            <button
              onClick={handleSave}
              className="btn btn-primary flex-1"
            >
              Save Categories
            </button>
          </div>

          <p className="mt-4 text-xs text-live-text-secondary">
            Changes will be applied when you re-analyze your network data.
          </p>
        </div>
      </div>
    </div>
  )
}

// Export default categories for use elsewhere
export { DEFAULT_CATEGORIES }
