import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TitleBar } from './components/TitleBar'
import { MenuBar } from './components/MenuBar'
import { Toolbar } from './components/Toolbar'
import { TransportBar } from './components/TransportBar'
import { Timeline } from './components/Timeline'
import { TrackLane } from './components/TrackLane'
import { EffectsPanel } from './components/EffectsPanel'
import { StatusBar } from './components/StatusBar'
import { EffectDialog } from './components/EffectDialog'
import { FrequencyAnalysisDialog } from './components/FrequencyAnalysisDialog'
import { AudioStatisticsDialog } from './components/AudioStatisticsDialog'
import { ChannelMixerDialog } from './components/ChannelMixerDialog'
import { ResampleDialog } from './components/ResampleDialog'
import { MixPasteDialog } from './components/MixPasteDialog'
import { CrossfadeDialog } from './components/CrossfadeDialog'
import { useEditorStore } from './store/editorStore'
import { audioEngine } from './audio/AudioEngine'
import { readAudioFile, downloadWav } from './audio/AudioFileIO'
import { createTrack } from './store/editorStore'
import { applyEffectToSelection, applyGenerate } from './hooks/useAudioEngine'
import { clipboardCopy, clipboardCut, clipboardPaste, clipboardDelete, selectAll } from './hooks/useClipboard'
import { extractRegion } from './audio/AudioEffects'
import { generateId } from './utils/helpers'

function App() {
  const { tracks, dispatch, selection, selectedTrack, clipboard, cursorPosition, zoom, transport, scrollX } = useEditorStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const autoScrollRafRef = useRef<number>(0)
  const lastAutoScrollX = useRef(0)

  useEffect(() => {
    audioEngine.setPositionCallback((pos) => {
      const state = useEditorStore.getState()
      state.dispatch({ type: 'SET_TRANSPORT', payload: { position: pos } })
      state.dispatch({ type: 'SET_CURSOR', payload: pos })
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const state = useEditorStore.getState()
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1
        const newZoom = Math.min(500, Math.max(20, Math.round(state.zoom * zoomDelta)))
        state.dispatch({ type: 'SET_ZOOM', payload: newZoom })
      } else {
        const el2 = containerRef.current
        if (el2 && el2.scrollHeight > el2.clientHeight + 2 && !e.shiftKey) {
          return
        }
        e.preventDefault()
        const state = useEditorStore.getState()
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
        const newScrollX = Math.max(0, state.scrollX + delta)
        state.dispatch({ type: 'SET_SCROLL', payload: { x: newScrollX } })
      }
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [])

  useEffect(() => {
    if (!transport.isPlaying) {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current)
        autoScrollRafRef.current = 0
      }
      return
    }

    const smoothAutoScroll = () => {
      const state = useEditorStore.getState()
      if (!state.transport.isPlaying) return

      const el = containerRef.current
      if (el) {
        const containerWidth = el.clientWidth
        const cursorX = state.cursorPosition * state.zoom
        const currentScrollX = lastAutoScrollX.current
        const rightEdge = currentScrollX + containerWidth - 80
        const leftEdge = currentScrollX

        if (cursorX > rightEdge) {
          const targetX = cursorX - containerWidth * 0.3
          const newScrollX = currentScrollX + (targetX - currentScrollX) * 0.15
          const clamped = Math.max(0, newScrollX)
          lastAutoScrollX.current = clamped
          state.dispatch({ type: 'SET_SCROLL', payload: { x: clamped } })
        } else if (cursorX < leftEdge) {
          const targetX = Math.max(0, cursorX - 80)
          const newScrollX = currentScrollX + (targetX - currentScrollX) * 0.15
          lastAutoScrollX.current = newScrollX
          state.dispatch({ type: 'SET_SCROLL', payload: { x: newScrollX } })
        } else {
          lastAutoScrollX.current = currentScrollX
        }
      }

      autoScrollRafRef.current = requestAnimationFrame(smoothAutoScroll)
    }

    lastAutoScrollX.current = scrollX
    autoScrollRafRef.current = requestAnimationFrame(smoothAutoScroll)

    return () => {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current)
        autoScrollRafRef.current = 0
      }
    }
  }, [transport.isPlaying])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) dispatch({ type: 'REDO' })
            else dispatch({ type: 'UNDO' })
            break
          case 'c':
            e.preventDefault()
            handleCopy()
            break
          case 'x':
            e.preventDefault()
            handleCut()
            break
          case 'v':
            e.preventDefault()
            handlePaste()
            break
          case 'a':
            e.preventDefault()
            handleSelectAll()
            break
        }
      } else {
        switch (e.key) {
          case ' ':
            e.preventDefault()
            if (transport.isPlaying) {
              audioEngine.pause()
              dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: false, isPaused: true } })
            } else {
              audioEngine.play(tracks, cursorPosition)
              dispatch({ type: 'SET_TRANSPORT', payload: { isPlaying: true, isPaused: false } })
            }
            break
          case 'Home':
            e.preventDefault()
            dispatch({ type: 'SET_CURSOR', payload: 0 })
            dispatch({ type: 'SET_TRANSPORT', payload: { position: 0 } })
            break
          case 'Delete':
          case 'Backspace':
            if (!e.ctrlKey) handleDelete()
            break
          case 'b':
            if (!e.ctrlKey) handleSplitAtCursor()
            break
          case 'd':
            if (!e.ctrlKey) handleDuplicate()
            break
          case 'm':
            if (!e.ctrlKey) handleAddMarker()
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tracks, selection, selectedTrack, clipboard, cursorPosition, transport])

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return

    const handlers: Record<string, (...args: any[]) => void> = {
      'menu:new': () => {
        audioEngine.stopAll()
        dispatch({ type: 'NEW_PROJECT' })
      },
      'menu:open': () => handleOpenFile(),
      'menu:save': () => handleSave(),
      'menu:save-as': () => handleSaveAs(),
      'menu:export': () => handleSave(),
      'menu:undo': () => dispatch({ type: 'UNDO' }),
      'menu:redo': () => dispatch({ type: 'REDO' }),
      'menu:cut': () => handleCut(),
      'menu:copy': () => handleCopy(),
      'menu:paste': () => handlePaste(),
      'menu:delete': () => handleDelete(),
      'menu:select-all': () => handleSelectAll(),
      'menu:fx-amplify': () => applyEffectToSelection('amplify', { gainDb: 6 }),
      'menu:fx-normalize': () => applyEffectToSelection('normalize', { targetDb: -1 }),
      'menu:fx-fadein': () => applyEffectToSelection('fadein'),
      'menu:fx-fadeout': () => applyEffectToSelection('fadeout'),
      'menu:fx-eq': () => {},
      'menu:fx-compressor': () => applyEffectToSelection('compressor'),
      'menu:fx-reverb': () => applyEffectToSelection('reverb'),
      'menu:fx-delay': () => {},
      'menu:fx-chorus': () => {},
      'menu:fx-flanger': () => {},
      'menu:fx-phaser': () => {},
      'menu:fx-distortion': () => {},
      'menu:fx-pitchshift': () => {},
      'menu:fx-timestretch': () => {},
      'menu:fx-noisegate': () => {},
      'menu:fx-speedchange': () => {},
      'menu:fx-tremolo': () => {},
      'menu:fx-vibrato': () => {},
      'menu:fx-noisereduction': () => {},
      'menu:fx-invert': () => applyEffectToSelection('invert'),
      'menu:fx-reverse': () => applyEffectToSelection('reverse'),
      'menu:gen-silence': () => {},
      'menu:gen-tone': () => {},
      'menu:gen-noise': () => {},
      'menu:gen-dtmf': () => {},
      'menu:gen-sweep': () => {},
      'menu:view-waveform': () => dispatch({ type: 'SET_VIEW_MODE', payload: 'waveform' }),
      'menu:view-spectral': () => dispatch({ type: 'SET_VIEW_MODE', payload: 'spectral' }),
      'menu:tool-split': () => handleSplitAtCursor(),
      'menu:tool-trim': () => handleTrimToSelection(),
      'menu:tool-duplicate': () => handleDuplicate(),
      'menu:tool-mixpaste': () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: { type: 'mix-paste', effectType: '', name: 'Mix Paste', params: [] } }),
      'menu:tool-crossfade': () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: { type: 'crossfade', effectType: '', name: 'Crossfade', params: [] } }),
      'menu:tool-mixdown': () => handleMixDown(),
      'menu:tool-channelmixer': () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: { type: 'channel-mixer', effectType: '', name: 'Channel Mixer', params: [] } }),
      'menu:tool-resample': () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: { type: 'resample', effectType: '', name: 'Resample', params: [] } }),
      'menu:tool-freqanalysis': () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: { type: 'frequency-analysis', effectType: '', name: 'Frequency Analysis', params: [] } }),
      'menu:tool-statistics': () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: { type: 'audio-statistics', effectType: '', name: 'Audio Statistics', params: [] } }),
      'menu:tool-addmarker': () => handleAddMarker(),
      'menu:tool-zoomtosel': () => handleZoomToSelection(),
      'menu:tool-fittowindow': () => handleFitToWindow(),
    }

    for (const [channel, handler] of Object.entries(handlers)) {
      api.onMenuAction(channel, handler)
    }
  }, [])

  const handleOpenFile = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.wav,.mp3,.ogg,.flac,.aiff,.aac'
    input.multiple = true
    input.onchange = async () => {
      if (!input.files) return
      for (const file of Array.from(input.files)) {
        try {
          const { buffer, name } = await readAudioFile(file)
          const currentTracks = useEditorStore.getState().tracks
          const track = createTrack(currentTracks, buffer, name.replace(/\.[^/.]+$/, ''))
          dispatch({ type: 'ADD_TRACK', payload: track })
        } catch (err) {
          console.error('Failed to load file:', err)
        }
      }
      const state = useEditorStore.getState()
      const containerWidth = containerRef.current?.clientWidth ?? 800
      const sidebarWidth = 192
      const waveformWidth = containerWidth - sidebarWidth
      const maxDuration = Math.max(...state.tracks.filter(t => t.buffer).map(t => t.buffer!.duration), 1)
      const newZoom = Math.min(500, Math.max(20, (waveformWidth - 20) / maxDuration))
      dispatch({ type: 'SET_ZOOM', payload: newZoom })
      dispatch({ type: 'SET_SCROLL', payload: { x: 0 } })
    }
    input.click()
  }

  const handleSave = () => {
    const track = tracks.find(t => t.id === selectedTrack) || tracks[0]
    if (track?.buffer) {
      downloadWav(track.buffer, track.name)
    }
  }

  const handleSaveAs = () => {
    const track = tracks.find(t => t.id === selectedTrack) || tracks[0]
    if (track?.buffer) {
      const name = prompt('Save as:', track.name)
      if (name) downloadWav(track.buffer, name)
    }
  }

  const handleCopy = () => {
    clipboardCopy()
  }

  const handleCut = () => {
    clipboardCut()
  }

  const handlePaste = () => {
    clipboardPaste()
  }

  const handleDelete = () => {
    clipboardDelete()
  }

  const handleSelectAll = () => {
    selectAll()
  }

  const handleSplitAtCursor = () => {
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

  const handleDuplicate = () => {
    if (!selectedTrack) return
    const track = tracks.find(t => t.id === selectedTrack)
    if (!track?.buffer) return

    if (selection && selection.trackId === track.id) {
      const sr = track.buffer.sampleRate
      const startSample = Math.floor(selection.start * sr)
      const endSample = Math.floor(selection.end * sr)
      const region = extractRegion(track.buffer, startSample, endSample)
      const newTrack = createTrack(tracks, region, `${track.name} (copy)`)
      dispatch({ type: 'ADD_TRACK', payload: newTrack })
    } else {
      const copy = new OfflineAudioContext(track.buffer.numberOfChannels, track.buffer.length, track.buffer.sampleRate)
      const newBuffer = copy.createBuffer(track.buffer.numberOfChannels, track.buffer.length, track.buffer.sampleRate)
      for (let ch = 0; ch < track.buffer.numberOfChannels; ch++) {
        newBuffer.getChannelData(ch).set(track.buffer.getChannelData(ch))
      }
      const newTrack = createTrack(tracks, newBuffer, `${track.name} (copy)`)
      dispatch({ type: 'ADD_TRACK', payload: newTrack })
    }
  }

  const handleTrimToSelection = () => {
    if (!selection || !selectedTrack) return
    const track = tracks.find(t => t.id === selectedTrack)
    if (!track?.buffer) return
    const sr = track.buffer.sampleRate
    const startSample = Math.floor(selection.start * sr)
    const endSample = Math.floor(selection.end * sr)
    const region = extractRegion(track.buffer, startSample, endSample)
    dispatch({ type: 'PUSH_UNDO', payload: 'Trim' })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: selectedTrack, buffer: region } })
    dispatch({ type: 'SET_SELECTION', payload: null })
    dispatch({ type: 'SET_CURSOR', payload: 0 })
  }

  const handleAddMarker = () => {
    const marker = {
      id: generateId(),
      position: cursorPosition,
      name: `Marker ${tracks.length > 0 ? '' : '1'}`,
      color: '#fbbf24',
    }
    dispatch({ type: 'ADD_MARKER', payload: marker })
  }

  const handleMixDown = () => {
    if (tracks.length === 0) return
    const maxDuration = Math.max(...tracks.filter(t => t.buffer).map(t => t.buffer!.duration))
    if (maxDuration === 0) return
    const sr = 44100
    const totalSamples = Math.ceil(maxDuration * sr)
    const ctx = new OfflineAudioContext(2, totalSamples, sr)
    const mixedBuffer = ctx.createBuffer(2, totalSamples, sr)

    for (const track of tracks) {
      if (!track.buffer || track.muted) continue
      for (let ch = 0; ch < Math.min(track.buffer.numberOfChannels, 2); ch++) {
        const src = track.buffer.getChannelData(Math.min(ch, track.buffer.numberOfChannels - 1))
        const dst = mixedBuffer.getChannelData(ch)
        const vol = track.volume
        for (let i = 0; i < src.length && i < dst.length; i++) {
          dst[i] += src[i] * vol
        }
      }
    }

    const mixTrack = createTrack(tracks, mixedBuffer, 'Mix Down')
    dispatch({ type: 'ADD_TRACK', payload: mixTrack })
  }

  const handleZoomToSelection = () => {
    const state = useEditorStore.getState()
    if (!state.selection) return
    const containerWidth = document.querySelector('[data-track-container]')?.clientWidth ?? 800
    const sidebarWidth = 192
    const waveformWidth = containerWidth - sidebarWidth
    const selDuration = state.selection.end - state.selection.start
    if (selDuration <= 0) return
    const newZoom = waveformWidth / selDuration
    dispatch({ type: 'SET_ZOOM', payload: Math.min(500, Math.max(20, newZoom)) })
    dispatch({ type: 'SET_SCROLL', payload: { x: state.selection.start * newZoom } })
  }

  const handleFitToWindow = () => {
    const maxDuration = Math.max(...tracks.filter(t => t.buffer).map(t => t.buffer!.duration), 1)
    const containerWidth = document.querySelector('[data-track-container]')?.clientWidth ?? 800
    const sidebarWidth = 192
    const waveformWidth = containerWidth - sidebarWidth
    const newZoom = (waveformWidth - 20) / maxDuration
    dispatch({ type: 'SET_ZOOM', payload: Math.min(500, Math.max(20, newZoom)) })
    dispatch({ type: 'SET_SCROLL', payload: { x: 0 } })
  }

  return (
    <div className="h-full flex flex-col">
      <TitleBar />
      <MenuBar />
      <Toolbar onOpenFile={handleOpenFile} />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <Timeline />
          <div ref={containerRef} className="flex-1 overflow-auto bg-surface-400" data-track-container>
            {tracks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">&#127925;</div>
                  <h2 className="text-xl font-semibold text-gray-400 mb-2">Awsome Editor Pro</h2>
                  <p className="text-sm mb-4">Drag & drop audio files here, or use File &rarr; Open</p>
                  <button className="btn-primary" onClick={handleOpenFile}>Open Audio File</button>
                </div>
              </div>
            ) : (
              tracks.map(track => (
                <TrackLane key={track.id} track={track} isSelected={track.id === selectedTrack} />
              ))
            )}
          </div>
        </div>
        <EffectsPanel />
      </div>
      <TransportBar />
      <StatusBar />
      <EffectDialog />
      <FrequencyAnalysisDialog />
      <AudioStatisticsDialog />
      <ChannelMixerDialog />
      <ResampleDialog />
      <MixPasteDialog />
      <CrossfadeDialog />
    </div>
  )
}

export default App
