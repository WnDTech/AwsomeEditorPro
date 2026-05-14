import { useRef, useEffect, useCallback } from 'react'
import { useEditorStore } from '../store/editorStore'
import { extractRegion } from '../audio/AudioEffects'

export function FrequencyAnalysisDialog() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { activeDialog, dispatch, selectedTrack, tracks, selection } = useEditorStore()
  const track = tracks.find(t => t.id === selectedTrack)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !track?.buffer) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio
    const w = 560
    const h = 320
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    let data: Float32Array
    if (selection && selection.trackId === track.id) {
      const sr = track.buffer.sampleRate
      const start = Math.floor(selection.start * sr)
      const end = Math.floor(selection.end * sr)
      const region = extractRegion(track.buffer, start, end)
      data = region.getChannelData(0)
    } else {
      data = track.buffer.getChannelData(0)
    }

    const fftSize = 4096
    const halfFft = fftSize / 2
    const sampleRate = track.buffer.sampleRate

    ctx.fillStyle = '#0f1117'
    ctx.fillRect(0, 0, w, h)

    const plotLeft = 50
    const plotRight = w - 20
    const plotTop = 20
    const plotBottom = h - 30
    const plotW = plotRight - plotLeft
    const plotH = plotBottom - plotTop

    ctx.fillStyle = '#14161c'
    ctx.fillRect(plotLeft, plotTop, plotW, plotH)

    const dbMin = -100
    const dbMax = 0

    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#6b7280'
    for (let db = dbMin; db <= dbMax; db += 20) {
      const y = plotBottom - ((db - dbMin) / (dbMax - dbMin)) * plotH
      ctx.fillText(`${db}dB`, plotLeft - 4, y + 3)
      ctx.strokeStyle = '#1e2028'
      ctx.beginPath()
      ctx.moveTo(plotLeft, y)
      ctx.lineTo(plotRight, y)
      ctx.stroke()
    }

    ctx.textAlign = 'center'
    const freqLabels = [100, 200, 500, 1000, 2000, 5000, 10000, 20000]
    for (const freq of freqLabels) {
      const x = plotLeft + (Math.log10(freq / 20) / Math.log10(sampleRate / 2 / 20)) * plotW
      if (x < plotLeft || x > plotRight) continue
      const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`
      ctx.fillText(label, x, plotBottom + 14)
      ctx.strokeStyle = '#1e2028'
      ctx.beginPath()
      ctx.moveTo(x, plotTop)
      ctx.lineTo(x, plotBottom)
      ctx.stroke()
    }

    const windowFunc = new Float32Array(fftSize)
    for (let i = 0; i < fftSize; i++) {
      windowFunc[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)))
    }

    const numSegments = Math.floor(data.length / fftSize)
    const avgMagnitudes = new Float32Array(halfFft)

    let segCount = 0
    for (let seg = 0; seg < Math.min(numSegments, 8); seg++) {
      const offset = seg * fftSize
      for (let bin = 0; bin < halfFft; bin++) {
        let real = 0, imag = 0
        for (let n = 0; n < fftSize; n++) {
          const idx = offset + n
          const sample = idx < data.length ? data[idx] * windowFunc[n] : 0
          real += sample * Math.cos(2 * Math.PI * bin * n / fftSize)
          imag -= sample * Math.sin(2 * Math.PI * bin * n / fftSize)
        }
        avgMagnitudes[bin] += Math.sqrt(real * real + imag * imag) / fftSize
      }
      segCount++
    }

    const gradient = ctx.createLinearGradient(0, plotTop, 0, plotBottom)
    gradient.addColorStop(0, '#22d3ee')
    gradient.addColorStop(0.5, '#6366f1')
    gradient.addColorStop(1, '#6366f180')

    ctx.strokeStyle = gradient
    ctx.lineWidth = 1.5
    ctx.beginPath()

    for (let i = 1; i < halfFft; i++) {
      const mag = avgMagnitudes[i] / segCount
      const db = mag > 0 ? 20 * Math.log10(mag) : dbMin
      const clampedDb = Math.max(dbMin, Math.min(dbMax, db))
      const freq = (i / halfFft) * (sampleRate / 2)

      const x = plotLeft + (Math.log10(freq / 20) / Math.log10(sampleRate / 2 / 20)) * plotW
      const y = plotBottom - ((clampedDb - dbMin) / (dbMax - dbMin)) * plotH

      if (i === 1) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    ctx.strokeStyle = '#2a2d35'
    ctx.lineWidth = 1
    ctx.strokeRect(plotLeft, plotTop, plotW, plotH)

    ctx.fillStyle = '#6b7280'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Frequency (Hz)', plotLeft + plotW / 2, h - 4)
  }, [track, selection])

  useEffect(() => {
    if (activeDialog?.type === 'frequency-analysis') draw()
  }, [activeDialog, draw])

  if (!activeDialog || activeDialog.type !== 'frequency-analysis') return null

  const handleClose = () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl w-[620px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-surface-50/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Frequency Analysis</h3>
          <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={handleClose}>&times;</button>
        </div>
        <div className="p-4">
          <canvas ref={canvasRef} style={{ width: 560, height: 320 }} />
          <div className="flex justify-between mt-2 text-[10px] text-gray-500">
            <span>{selection ? 'Selection' : 'Full track'}: {track?.name}</span>
            <span>{track?.buffer?.sampleRate} Hz, {track?.buffer?.numberOfChannels}ch</span>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-surface-50/30 flex justify-end">
          <button className="btn-secondary text-xs" onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
