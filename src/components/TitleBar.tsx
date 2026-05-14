export function TitleBar() {
  const api = (window as any).electronAPI

  const handleMinimize = () => api?.windowMinimize()
  const handleMaximize = () => api?.windowMaximize()
  const handleClose = () => api?.windowClose()

  return (
    <div className="h-8 bg-surface-500 flex items-center justify-between select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      <div className="flex items-center gap-2 px-3">
        <span className="text-accent font-bold text-sm">🎵</span>
        <span className="text-gray-400 text-xs font-medium">Awsome Editor Pro</span>
      </div>
      <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button className="w-11 h-8 flex items-center justify-center hover:bg-surface-50 transition-colors" onClick={handleMinimize}>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M5 12h14" /></svg>
        </button>
        <button className="w-11 h-8 flex items-center justify-center hover:bg-surface-50 transition-colors" onClick={handleMaximize}>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" strokeWidth={2} rx="1" /></svg>
        </button>
        <button className="w-11 h-8 flex items-center justify-center hover:bg-red-600 transition-colors" onClick={handleClose}>
          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
      </div>
    </div>
  )
}
