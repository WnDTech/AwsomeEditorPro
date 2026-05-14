import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'

export function ResampleDialog() {
  const { activeDialog, dispatch, selectedTrack, tracks } = useEditorStore()
  const [targetRate, setTargetRate] = useState(48000)
  const track = tracks.find(t => t.id === selectedTrack)

  if (!activeDialog || activeDialog.type !== 'resample') return null

  const handleClose = () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })

  const handleApply = () => {
    if (!track?.buffer) return
    const buffer = track.buffer
    const ratio = targetRate / buffer.sampleRate
    const newLength = Math.round(buffer.length * ratio)
    const ctx = new OfflineAudioContext(buffer.numberOfChannels, newLength, targetRate)
    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, targetRate)

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const input = buffer.getChannelData(ch)
      const output = newBuffer.getChannelData(ch)
      for (let i = 0; i < newLength; i++) {
        const srcPos = i / ratio
        const srcIdx = Math.floor(srcPos)
        const frac = srcPos - srcIdx
        if (srcIdx + 1 < input.length) {
          output[i] = input[srcIdx] * (1 - frac) + input[srcIdx + 1] * frac
        } else if (srcIdx < input.length) {
          output[i] = input[srcIdx]
        }
      }
    }

    dispatch({ type: 'PUSH_UNDO', payload: `Resample to ${targetRate}Hz` })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: track.id, buffer: newBuffer } })
    handleClose()
  }

  const commonRates = [22050, 44100, 48000, 88200, 96000, 192000]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div className="bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-surface-50/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Resample</h3>
          <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={handleClose}>&times;</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-gray-500">
            Current sample rate: {track?.buffer?.sampleRate} Hz
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Target Sample Rate</label>
            <input
              type="number"
              value={targetRate}
              onChange={e => setTargetRate(Number(e.target.value))}
              className="w-full bg-surface-500 border border-surface-50/50 rounded px-3 py-1.5 text-sm text-gray-200 outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {commonRates.map(rate => (
              <button
                key={rate}
                className={`px-2 py-1 text-xs rounded transition-colors ${targetRate === rate ? 'bg-accent text-white' : 'bg-surface-50 text-gray-400 hover:text-gray-200'}`}
                onClick={() => setTargetRate(rate)}
              >
                {rate}
              </button>
            ))}
          </div>
          {track?.buffer && (
            <div className="text-[10px] text-gray-600">
              Duration: {track.buffer.duration.toFixed(3)}s → {(track.buffer.length * (targetRate / track.buffer.sampleRate) / targetRate).toFixed(3)}s
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-surface-50/30 flex justify-end gap-2">
          <button className="btn-secondary text-xs" onClick={handleClose}>Cancel</button>
          <button className="btn-primary text-xs" onClick={handleApply} disabled={!track?.buffer || targetRate === track?.buffer?.sampleRate}>Resample</button>
        </div>
      </div>
    </div>
  )
}
