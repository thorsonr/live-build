import { Link } from 'react-router-dom'

export default function SampleModePromptModal({ open, onClose, title = 'Sample dashboard', message = 'This is a sample site to view functionality. Please sign up to add or save your own data.' }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative w-full max-w-md card shadow-2xl">
        <div className="card-body">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-live-text">{title}</h3>
              <p className="text-sm text-live-text-secondary mt-1">{message}</p>
            </div>
            <button onClick={onClose} className="text-live-text-secondary hover:text-live-text text-xl leading-none">&times;</button>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn text-sm px-3 py-2 border border-live-border">Close</button>
            <Link to="/signup" className="btn btn-primary text-sm px-3 py-2">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
