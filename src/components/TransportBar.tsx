import { useEditorStore } from '../store/editorStore'
import { audioEngine } from '../audio/AudioEngine'
import { formatTime } from '../utils/helpers'

export function TransportBar() {
  const { transport, dispatch, tracks, cursorPosition, duration } = useEditorStore()

  const handlePlay = () => {
    if (transport.isPlaying) {
      audioEngine.pause()
      dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: false, isPaused: true } })
    } else {
      audioEngine.play(tracks, cursorPosition)
      dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: true, isPaused: false } })
    }
  }

  const handleStop = () => {
    audioEngine.stopAll()
    dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: false, isPaused: false, position: 0 } })
    dispatch({ type: 'SET_CURSOR', payload: 0 })
  }

  const handleRewind = () => {
    const newPos = Math.max(0, cursorPosition - 5)
    if (transport.isPlaying) {
      audioEngine.stopAll()
      dispatch({ type: 'SET_CURSOR', payload: newPos })
      audioEngine.play(tracks, newPos)
    } else {
      dispatch({ type: 'SET_CURSOR', payload: newPos })
    }
  }

  const handleForward = () => {
    const newPos = Math.min(duration, cursorPosition + 5)
    if (transport.isPlaying) {
      audioEngine.stopAll()
      dispatch({ type: 'SET_CURSOR', payload: newPos })
      audioEngine.play(tracks, newPos)
    } else {
      dispatch({ type: 'SET_CURSOR', payload: newPos })
    }
  }

  const handleSkipStart = () => {
    if (transport.isPlaying) audioEngine.stopAll()
    dispatch({ type: 'SET_CURSOR', payload: 0 })
    dispatch({ type: 'SET_TRANSPORT', payload: { position: 0 } })
  }

  const handleSkipEnd = () => {
    if (transport.isPlaying) audioEngine.stopAll()
    dispatch({ type: 'SET_CURSOR', payload: duration })
  }

  const handleToggleLoop = () => {
    dispatch({ type: 'SET_TRANSPORT', payload: { loopEnabled: !transport.loopEnabled } })
  }

  return (
    <div className="h-14 bg-surface-300 border-t border-surface-50/50 flex items-center justify-center gap-4 px-4">
      <div className="flex items-center gap-1">
        <button className="btn-icon" onClick={handleSkipStart} title="Skip to Start">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
        </button>
        <button className="btn-icon" onClick={handleRewind} title="Rewind">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" /></svg>
        </button>
      </div>

      <button className="btn-icon" onClick={handleStop} title="Stop">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
      </button>

      <button
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${transport.isPlaying ? 'bg-accent text-white' : 'bg-surface-50 hover:bg-surface-100 text-gray-300'}`}
        onClick={handlePlay}
        title="Play (Space)"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      </button>

      <button className="btn-icon" onClick={handleForward} title="Forward">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" /></svg>
      </button>
      <button className="btn-icon" onClick={handleSkipEnd} title="Skip to End">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
      </button>

      <div className="w-px h-8 bg-surface-50/50 mx-2" />

      <button
        className={`btn-icon ${transport.loopEnabled ? 'text-accent' : 'text-gray-400'}`}
        onClick={handleToggleLoop}
        title="Toggle Loop"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      </button>

      <div className="w-px h-8 bg-surface-50/50 mx-2" />

      <TimeDisplay />
    </div>
  )
}

function TimeDisplay() {
  const { cursorPosition, duration } = useEditorStore()

  return (
    <div className="flex items-center gap-3">
      <div className="bg-surface-500 rounded px-3 py-1 font-mono text-lg tracking-wider">
        <span className="text-accent-light">{formatTime(cursorPosition)}</span>
      </div>
      <span className="text-gray-600">/</span>
      <div className="bg-surface-500 rounded px-3 py-1 font-mono text-lg tracking-wider text-gray-500">
        {formatTime(duration)}
      </div>
    </div>
  )
}
