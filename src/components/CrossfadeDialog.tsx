import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'

export function CrossfadeDialog() {
  const { activeDialog, dispatch, selectedTrack, tracks, selection } = useEditorStore()
  const [fadeType, setFadeType] = useState<'linear' | 'equal-power' | 's-curve'>('equal-power')
  const track = tracks.find(t => t.id === selectedTrack)

  if (!activeDialog || activeDialog.type !== 'crossfade') return null

  const handleClose = () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })

  const handleApply = () => {
    if (!track?.buffer || !selection || selection.trackId !== track.id) return

    const buffer = track.buffer
    const sr = buffer.sampleRate
    const startSample = Math.floor(selection.start * sr)
    const endSample = Math.floor(selection.end * sr)
    const len = endSample - startSample

    if (len <= 0) return

    const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
    const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const input = buffer.getChannelData(ch)
      const output = newBuffer.getChannelData(ch)

      for (let i = 0; i < buffer.length; i++) {
        if (i >= startSample && i < endSample) {
          const t = (i - startSample) / len
          let gain: number
          if (fadeType === 'linear') {
            gain = t
          } else if (fadeType === 'equal-power') {
            gain = Math.sin(t * Math.PI / 2)
          } else {
            gain = t * t * (3 - 2 * t)
          }
          const startRegion = input[startSample] ?? 0
          output[i] = input[i] * gain
        } else {
          output[i] = input[i]
        }
      }
    }

    dispatch({ type: 'PUSH_UNDO', payload: 'Crossfade' })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: track.id, buffer: newBuffer } })
    handleClose()
  }

  const hasValidSelection = selection && selection.trackId === track?.id && selection.start !== selection.end

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div className="bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-surface-50/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Crossfade</h3>
          <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={handleClose}>&times;</button>
        </div>
        <div className="p-4 space-y-3">
          {!hasValidSelection ? (
            <div className="text-sm text-gray-500 text-center py-4">
              Select a region to apply crossfade
            </div>
          ) : (
            <>
              <div className="text-xs text-gray-500">
                Selection: {selection.start.toFixed(3)}s → {selection.end.toFixed(3)}s ({(selection.end - selection.start).toFixed(3)}s)
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Fade Curve</label>
                <div className="flex gap-1">
                  {[
                    { value: 'linear' as const, label: 'Linear' },
                    { value: 'equal-power' as const, label: 'Equal Power' },
                    { value: 's-curve' as const, label: 'S-Curve' },
                  ].map(ft => (
                    <button
                      key={ft.value}
                      className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${fadeType === ft.value ? 'bg-accent text-white' : 'bg-surface-50 text-gray-400 hover:text-gray-200'}`}
                      onClick={() => setFadeType(ft.value)}
                    >
                      {ft.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-surface-50/30 flex justify-end gap-2">
          <button className="btn-secondary text-xs" onClick={handleClose}>Cancel</button>
          <button className="btn-primary text-xs" onClick={handleApply} disabled={!hasValidSelection}>Apply</button>
        </div>
      </div>
    </div>
  )
}
