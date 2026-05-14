import { useRef, useEffect, useCallback, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditorStore } from '../store/editorStore'
import { audioEngine } from '../audio/AudioEngine'
import { clipboardCopy, clipboardCut, clipboardPaste, clipboardDelete, selectAll } from '../hooks/useClipboard'
import { AudioTrack } from '../types'

interface TrackLaneProps {
  track: AudioTrack
  isSelected: boolean
}

interface ContextMenuState {
  x: number
  y: number
}

export function TrackLane({ track, isSelected }: TrackLaneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { zoom, scrollX, selection, cursorPosition, viewMode, dispatch, tracks, clipboard, selectedTrack } = useEditorStore()
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState(0)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !track.buffer) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const container = containerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const dpr = window.devicePixelRatio
    canvas.width = rect.width * dpr
    canvas.height = track.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = track.height

    ctx.fillStyle = isSelected ? '#1a1d28' : '#14161c'
    ctx.fillRect(0, 0, w, h)

    if (viewMode === 'spectral') {
      drawSpectral(ctx, track.buffer, w, h, scrollX, zoom)
    } else {
      drawWaveform(ctx, track.buffer, w, h, scrollX, zoom, track.color)
    }

    if (selection && selection.trackId === track.id) {
      const startX = selection.start * zoom - scrollX
      const endX = selection.end * zoom - scrollX
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)'
      ctx.fillRect(startX, 0, endX - startX, h)
      ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(startX, 0)
      ctx.lineTo(startX, h)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(endX, 0)
      ctx.lineTo(endX, h)
      ctx.stroke()
    }

    const cursorX = cursorPosition * zoom - scrollX
    if (cursorX >= 0 && cursorX <= w) {
      ctx.strokeStyle = '#f472b6'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cursorX, 0)
      ctx.lineTo(cursorX, h)
      ctx.stroke()
    }
  }, [track, zoom, scrollX, selection, cursorPosition, isSelected, viewMode])

  useEffect(() => {
    draw()
    const observer = new ResizeObserver(draw)
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [draw])

  useEffect(() => {
    if (!contextMenu) return
    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    const handleScroll = () => setContextMenu(null)
    setTimeout(() => {
      document.addEventListener('mousedown', handleMouseDown)
      document.addEventListener('wheel', handleScroll, { passive: true })
    }, 0)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('wheel', handleScroll)
    }
  }, [contextMenu])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    setContextMenu(null)
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const time = (x + scrollX) / zoom

    dispatch({ type: 'SELECT_TRACK', payload: track.id })
    setIsDragging(true)
    setDragStart(time)
    dispatch({ type: 'SET_SELECTION', payload: null })
    dispatch({ type: 'SET_CURSOR', payload: time })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const time = Math.max(0, (x + scrollX) / zoom)

    dispatch({
      type: 'SET_SELECTION',
      payload: {
        start: Math.min(dragStart, time),
        end: Math.max(dragStart, time),
        trackId: track.id,
      },
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dispatch({ type: 'SELECT_TRACK', payload: track.id })

    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const time = Math.max(0, (x + scrollX) / zoom)
    dispatch({ type: 'SET_CURSOR', payload: time })

    let menuX = e.clientX
    let menuY = e.clientY
    if (menuX + 200 > window.innerWidth) menuX = window.innerWidth - 210
    if (menuY + 300 > window.innerHeight) menuY = window.innerHeight - 310
    setContextMenu({ x: menuX, y: menuY })
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp)
      return () => window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleVolumeChange = (vol: number) => {
    dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, changes: { volume: vol } } })
    audioEngine.setTrackVolume(track.id, vol)
  }

  const handlePanChange = (pan: number) => {
    dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, changes: { pan } } })
    audioEngine.setTrackPan(track.id, pan)
  }

  const handleMuteToggle = () => {
    const newMuted = !track.muted
    dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, changes: { muted: newMuted } } })
    audioEngine.updateTrackStates(tracks.map(t => t.id === track.id ? { ...t, muted: newMuted } : t))
  }

  const handleSoloToggle = () => {
    const newSolo = !track.solo
    dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, changes: { solo: newSolo } } })
    audioEngine.updateTrackStates(tracks.map(t => t.id === track.id ? { ...t, solo: newSolo } : t))
  }

  const handleCtxCopy = () => {
    clipboardCopy()
    setContextMenu(null)
  }

  const handleCtxCut = () => {
    clipboardCut()
    setContextMenu(null)
  }

  const handleCtxPaste = () => {
    clipboardPaste()
    setContextMenu(null)
  }

  const handleCtxDelete = () => {
    clipboardDelete()
    setContextMenu(null)
  }

  const handleCtxSelectAll = () => {
    selectAll()
    setContextMenu(null)
  }

  const handleCtxDeleteTrack = () => {
    dispatch({ type: 'REMOVE_TRACK', payload: track.id })
    setContextMenu(null)
  }

  const currentState = useEditorStore.getState()
  const hasSelection = currentState.selection && currentState.selection.trackId === track.id && currentState.selection.start !== currentState.selection.end
  const hasClipboard = !!currentState.clipboard

  return (
    <div className={`flex border-b border-surface-50/30 ${isSelected ? 'bg-surface-200/50' : ''}`}>
      <div className="w-48 flex-shrink-0 bg-surface-300 border-r border-surface-50/30 flex flex-col p-2 gap-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: track.color }} />
          <input
            className="bg-transparent text-xs text-gray-300 font-medium flex-1 outline-none min-w-0"
            value={track.name}
            onChange={e => dispatch({ type: 'UPDATE_TRACK', payload: { id: track.id, changes: { name: e.target.value } } })}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${track.muted ? 'bg-red-500/20 text-red-400' : 'bg-surface-50/50 text-gray-500 hover:text-gray-300'}`}
            onClick={handleMuteToggle}
            title="Mute"
          >M</button>
          <button
            className={`text-xs px-1.5 py-0.5 rounded transition-colors ${track.solo ? 'bg-yellow-500/20 text-yellow-400' : 'bg-surface-50/50 text-gray-500 hover:text-gray-300'}`}
            onClick={handleSoloToggle}
            title="Solo"
          >S</button>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-600 w-5">Vol</span>
          <input
            type="range"
            min={0}
            max={2}
            step={0.01}
            value={track.volume}
            onChange={e => handleVolumeChange(Number(e.target.value))}
            className="flex-1 h-3"
          />
          <span className="text-[10px] text-gray-500 w-7 text-right">{Math.round(track.volume * 100)}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-600 w-5">Pan</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.01}
            value={track.pan}
            onChange={e => handlePanChange(Number(e.target.value))}
            className="flex-1 h-3"
          />
          <span className="text-[10px] text-gray-500 w-7 text-right">
            {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.round(Math.abs(track.pan) * 100)}` : `R${Math.round(track.pan * 100)}`}
          </span>
        </div>
        <button
          className="text-[10px] text-gray-600 hover:text-red-400 mt-auto text-left transition-colors"
          onClick={() => dispatch({ type: 'REMOVE_TRACK', payload: track.id })}
        >Delete Track</button>
        {track.buffer && (
          <div className="text-[9px] text-gray-600">
            {track.buffer.numberOfChannels}ch &middot; {track.buffer.sampleRate}Hz &middot; {track.buffer.duration.toFixed(2)}s
          </div>
        )}
      </div>
      <div
        ref={containerRef}
        className="flex-1 relative cursor-crosshair"
        style={{ height: track.height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onContextMenu={handleContextMenu}
      >
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>

      {contextMenu && createPortal(
        <div
          ref={menuRef}
          className="fixed bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl py-1 min-w-[200px]"
          style={{ left: contextMenu.x, top: contextMenu.y, zIndex: 99999 }}
          onMouseDown={e => e.stopPropagation()}
        >
          <ContextMenuButton label="Cut" shortcut="Ctrl+X" disabled={!hasSelection} onClick={handleCtxCut} />
          <ContextMenuButton label="Copy" shortcut="Ctrl+C" disabled={!hasSelection} onClick={handleCtxCopy} />
          <ContextMenuButton label="Paste" shortcut="Ctrl+V" disabled={!hasClipboard} onClick={handleCtxPaste} />
          <ContextMenuButton label="Delete Selection" shortcut="Del" disabled={!hasSelection} onClick={handleCtxDelete} />
          <div className="h-px bg-surface-50/30 my-1 mx-2" />
          <ContextMenuButton label="Select All" shortcut="Ctrl+A" onClick={handleCtxSelectAll} />
          <div className="h-px bg-surface-50/30 my-1 mx-2" />
          <ContextMenuButton label={track.muted ? 'Unmute' : 'Mute'} onClick={() => { handleMuteToggle(); setContextMenu(null) }} />
          <ContextMenuButton label={track.solo ? 'Unsolo' : 'Solo'} onClick={() => { handleSoloToggle(); setContextMenu(null) }} />
          <div className="h-px bg-surface-50/30 my-1 mx-2" />
          <ContextMenuButton label="Delete Track" danger onClick={handleCtxDeleteTrack} />
        </div>,
        document.body
      )}
    </div>
  )
}

function ContextMenuButton({ label, shortcut, disabled, danger, onClick }: {
  label: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors ${
        disabled ? 'text-gray-600 cursor-default' :
        danger ? 'text-red-400 hover:bg-red-500/20' :
        'text-gray-300 hover:bg-accent hover:text-white'
      }`}
      onMouseDown={disabled ? undefined : (e) => { e.preventDefault(); e.stopPropagation(); onClick() }}
      disabled={disabled}
    >
      <span>{label}</span>
      {shortcut && <span className="text-gray-600 text-[10px] ml-4">{shortcut}</span>}
    </button>
  )
}

function drawWaveform(
  ctx: CanvasRenderingContext2D,
  buffer: AudioBuffer,
  w: number,
  h: number,
  scrollX: number,
  zoom: number,
  color: string
) {
  const data = buffer.getChannelData(0)
  const sampleRate = buffer.sampleRate
  const centerY = h / 2

  const startSample = Math.floor((scrollX / zoom) * sampleRate)
  const endSample = Math.min(data.length, Math.ceil(((scrollX + w) / zoom) * sampleRate))

  ctx.fillStyle = color + '40'
  ctx.fillRect(0, 0, w, h)

  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, color)
  gradient.addColorStop(0.5, color + 'cc')
  gradient.addColorStop(1, color)

  ctx.fillStyle = gradient
  ctx.beginPath()

  const samplesPerPixel = (endSample - startSample) / w
  const step = Math.max(1, Math.floor(samplesPerPixel / 2))

  ctx.moveTo(0, centerY)
  for (let x = 0; x < w; x++) {
    const samplePos = startSample + Math.floor((x / w) * (endSample - startSample))
    let max = 0
    for (let s = samplePos; s < samplePos + step && s < data.length; s++) {
      if (s < 0) continue
      if (data[s] > max) max = data[s]
    }
    ctx.lineTo(x, centerY - max * centerY)
  }
  for (let x = w - 1; x >= 0; x--) {
    const samplePos = startSample + Math.floor((x / w) * (endSample - startSample))
    let min = 0
    for (let s = samplePos; s < samplePos + step && s < data.length; s++) {
      if (s < 0) continue
      if (data[s] < min) min = data[s]
    }
    ctx.lineTo(x, centerY - min * centerY)
  }
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = color + '60'
  ctx.lineWidth = 0.5
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(w, centerY)
  ctx.stroke()
}

function drawSpectral(
  ctx: CanvasRenderingContext2D,
  buffer: AudioBuffer,
  w: number,
  h: number,
  scrollX: number,
  zoom: number
) {
  const data = buffer.getChannelData(0)
  const sampleRate = buffer.sampleRate
  const fftSize = 512
  const halfFft = fftSize / 2

  const startSample = Math.floor((scrollX / zoom) * sampleRate)
  const endSample = Math.min(data.length, Math.ceil(((scrollX + w) / zoom) * sampleRate))
  const columnWidth = Math.max(1, Math.ceil(((endSample - startSample) / w)))

  const windowFunc = new Float32Array(fftSize)
  for (let i = 0; i < fftSize; i++) {
    windowFunc[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)))
  }

  for (let x = 0; x < w; x += columnWidth) {
    const samplePos = startSample + Math.floor((x / w) * (endSample - startSample))
    const magnitudes = new Float32Array(halfFft)

    for (let bin = 0; bin < halfFft; bin++) {
      let real = 0, imag = 0
      for (let n = 0; n < fftSize; n++) {
        const idx = samplePos + n
        const sample = idx >= 0 && idx < data.length ? data[idx] * windowFunc[n] : 0
        real += sample * Math.cos(2 * Math.PI * bin * n / fftSize)
        imag -= sample * Math.sin(2 * Math.PI * bin * n / fftSize)
      }
      magnitudes[bin] = Math.sqrt(real * real + imag * imag)
    }

    let maxMag = 0
    for (let i = 0; i < magnitudes.length; i++) {
      if (magnitudes[i] > maxMag) maxMag = magnitudes[i]
    }

    for (let bin = 0; bin < halfFft; bin++) {
      const normalizedMag = maxMag > 0 ? magnitudes[bin] / maxMag : 0
      const y = h - (bin / halfFft) * h
      const pixelH = Math.max(1, h / halfFft)

      const r = Math.floor(normalizedMag * 255)
      const g = Math.floor(normalizedMag * 120)
      const b = Math.floor((1 - normalizedMag) * 100 + 50)
      ctx.fillStyle = `rgb(${r},${g},${b})`
      ctx.fillRect(x, y - pixelH, columnWidth, pixelH)
    }
  }
}
