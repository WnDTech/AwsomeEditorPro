import { useEditorStore } from '../store/editorStore'
import { audioEngine } from '../audio/AudioEngine'
import { readAudioFile } from '../audio/AudioFileIO'
import { createTrack } from '../store/editorStore'
import { generateId } from '../utils/helpers'

export function Toolbar({ onOpenFile }: { onOpenFile: () => void }) {
  const { tracks, dispatch, selectedTrack, transport, cursorPosition, selection, zoom } = useEditorStore()

  const handleAddTrack = () => {
    const track = createTrack(tracks)
    dispatch({ type: 'ADD_TRACK', payload: track })
  }

  const handlePlay = () => {
    if (transport.isPlaying) {
      audioEngine.pause()
      dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: false, isPaused: true } })
    } else {
      audioEngine.play(tracks, cursorPosition)
      dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: true, isPaused: false, isRecording: false } })
    }
  }

  const handleStop = () => {
    audioEngine.stopAll()
    dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: false, isPaused: false, position: 0 } })
    dispatch({ type: 'SET_CURSOR', payload: 0 })
  }

  const handleRecord = async () => {
    if (transport.isRecording) {
      const buffer = await audioEngine.stopMicRecording()
      if (buffer) {
        const track = createTrack(tracks, buffer, 'Recording')
        dispatch({ type: 'ADD_TRACK', payload: track })
      }
      dispatch({ type: 'SET_TRANSPORT', payload: { isRecording: false } })
    } else {
      audioEngine.stopAll()
      try {
        await audioEngine.startMicRecording()
        dispatch({ type: 'SET_TRANSPORT', payload: { isRecording: true, isPlaying: false } })
      } catch (err) {
        console.error('Failed to start recording:', err)
        alert('Could not access microphone. Please allow microphone access and try again.')
      }
    }
  }

  const handleSplit = () => {
    if (!selectedTrack) return
    const track = tracks.find(t => t.id === selectedTrack)
    if (!track?.buffer) return
    const splitSample = Math.floor(cursorPosition * track.buffer.sampleRate)
    if (splitSample <= 0 || splitSample >= track.buffer.length) return
    const sr = track.buffer.sampleRate
    const ch = track.buffer.numberOfChannels
    const ctx1 = new OfflineAudioContext(ch, splitSample, sr)
    const buf1 = ctx1.createBuffer(ch, splitSample, sr)
    const ctx2 = new OfflineAudioContext(ch, track.buffer.length - splitSample, sr)
    const buf2 = ctx2.createBuffer(ch, track.buffer.length - splitSample, sr)
    for (let c = 0; c < ch; c++) {
      const src = track.buffer.getChannelData(c)
      buf1.getChannelData(c).set(src.subarray(0, splitSample))
      buf2.getChannelData(c).set(src.subarray(splitSample))
    }
    dispatch({ type: 'PUSH_UNDO', payload: 'Split' })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: track.id, buffer: buf1 } })
    const newTrack = createTrack(tracks, buf2, `${track.name} (2)`)
    dispatch({ type: 'ADD_TRACK', payload: newTrack })
  }

  const handleTrim = () => {
    if (!selection || !selectedTrack) return
    const track = tracks.find(t => t.id === selectedTrack)
    if (!track?.buffer) return
    const sr = track.buffer.sampleRate
    const startSample = Math.floor(selection.start * sr)
    const endSample = Math.floor(selection.end * sr)
    const ctx = new OfflineAudioContext(track.buffer.numberOfChannels, endSample - startSample, sr)
    const newBuffer = ctx.createBuffer(track.buffer.numberOfChannels, endSample - startSample, sr)
    for (let c = 0; c < track.buffer.numberOfChannels; c++) {
      const src = track.buffer.getChannelData(c)
      const dst = newBuffer.getChannelData(c)
      for (let i = 0; i < dst.length; i++) {
        dst[i] = src[startSample + i]
      }
    }
    dispatch({ type: 'PUSH_UNDO', payload: 'Trim' })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: selectedTrack, buffer: newBuffer } })
    dispatch({ type: 'SET_SELECTION', payload: null })
    dispatch({ type: 'SET_CURSOR', payload: 0 })
  }

  const handleAddMarker = () => {
    dispatch({ type: 'ADD_MARKER', payload: { id: generateId(), position: cursorPosition, name: `Marker`, color: '#fbbf24' } })
  }

  const handleZoomToSelection = () => {
    const state = useEditorStore.getState()
    if (!state.selection) return
    const containerWidth = document.querySelector('[data-track-container]')?.clientWidth ?? 800
    const selDuration = state.selection.end - state.selection.start
    if (selDuration <= 0) return
    const newZoom = containerWidth / selDuration
    dispatch({ type: 'SET_ZOOM', payload: Math.min(500, Math.max(20, newZoom)) })
    dispatch({ type: 'SET_SCROLL', payload: { x: state.selection.start * newZoom } })
  }

  const handleFitToWindow = () => {
    const maxDuration = Math.max(...tracks.filter(t => t.buffer).map(t => t.buffer!.duration), 1)
    const containerWidth = document.querySelector('[data-track-container]')?.clientWidth ?? 800
    const newZoom = (containerWidth - 20) / maxDuration
    dispatch({ type: 'SET_ZOOM', payload: Math.min(500, Math.max(20, newZoom)) })
    dispatch({ type: 'SET_SCROLL', payload: { x: 0 } })
  }

  const hasTrack = !!tracks.find(t => t.id === selectedTrack)?.buffer

  return (
    <div className="h-10 bg-surface-300 border-b border-surface-50/50 flex items-center px-2 gap-1">
      <button className="btn-icon" onClick={onOpenFile} title="Open File">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
      </button>
      <button className="btn-icon" onClick={handleAddTrack} title="Add Empty Track">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
      </button>

      <div className="w-px h-6 bg-surface-50/50 mx-1" />

      <button className="btn-icon" onClick={handleStop} title="Stop">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1" /></svg>
      </button>
      <button
        className={`btn-icon ${transport.isPlaying ? 'text-accent' : ''}`}
        onClick={handlePlay}
        title="Play (Space)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      </button>
      <button
        className={`btn-icon ${transport.isRecording ? 'text-red-500 recording-indicator' : ''}`}
        onClick={handleRecord}
        title="Record (Microphone)"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6" /></svg>
      </button>

      <div className="w-px h-6 bg-surface-50/50 mx-1" />

      <button className="btn-icon" onClick={handleSplit} title="Split at Cursor (B)" disabled={!hasTrack}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
      </button>
      <button className="btn-icon" onClick={handleTrim} title="Trim to Selection" disabled={!selection}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
      </button>
      <button className="btn-icon" onClick={handleAddMarker} title="Add Marker (M)">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>

      <div className="w-px h-6 bg-surface-50/50 mx-1" />

      <button className="btn-icon" onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.min(500, zoom * 1.5) })} title="Zoom In">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
      </button>
      <button className="btn-icon" onClick={() => dispatch({ type: 'SET_ZOOM', payload: Math.max(20, zoom / 1.5) })} title="Zoom Out">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>
      </button>
      <button className="btn-icon" onClick={handleZoomToSelection} title="Zoom to Selection" disabled={!selection}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
      </button>
      <button className="btn-icon" onClick={handleFitToWindow} title="Fit to Window" disabled={!hasTrack}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      <ZoomControl />

      <div className="flex-1" />

      {transport.isRecording && (
        <span className="text-xs text-red-400 recording-indicator mr-2">REC</span>
      )}

      <div className="text-xs text-gray-500 mr-2">
        {tracks.length} track{tracks.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

function ZoomControl() {
  const { zoom, dispatch } = useEditorStore()

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Zoom:</span>
      <input
        type="range"
        min={20}
        max={500}
        value={zoom}
        onChange={e => dispatch({ type: 'SET_ZOOM', payload: Number(e.target.value) })}
        className="w-24"
      />
      <span className="text-xs text-gray-400 w-8">{zoom}px/s</span>
    </div>
  )
}
