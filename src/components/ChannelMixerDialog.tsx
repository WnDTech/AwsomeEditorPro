import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'

export function ChannelMixerDialog() {
  const { activeDialog, dispatch, selectedTrack, tracks } = useEditorStore()
  const [mode, setMode] = useState<'mono-to-stereo' | 'stereo-to-mono' | 'swap' | 'extract-left' | 'extract-right'>('stereo-to-mono')
  const track = tracks.find(t => t.id === selectedTrack)

  if (!activeDialog || activeDialog.type !== 'channel-mixer') return null

  const handleClose = () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })

  const handleApply = () => {
    if (!track?.buffer) return

    const buffer = track.buffer
    const sr = buffer.sampleRate
    let newBuffer: AudioBuffer

    if (mode === 'stereo-to-mono') {
      const ctx = new OfflineAudioContext(1, buffer.length, sr)
      newBuffer = ctx.createBuffer(1, buffer.length, sr)
      const output = newBuffer.getChannelData(0)
      const chCount = buffer.numberOfChannels
      for (let i = 0; i < buffer.length; i++) {
        let sum = 0
        for (let ch = 0; ch < chCount; ch++) {
          sum += buffer.getChannelData(ch)[i]
        }
        output[i] = sum / chCount
      }
    } else if (mode === 'mono-to-stereo') {
      const ctx = new OfflineAudioContext(2, buffer.length, sr)
      newBuffer = ctx.createBuffer(2, buffer.length, sr)
      const input = buffer.getChannelData(0)
      newBuffer.getChannelData(0).set(input)
      newBuffer.getChannelData(1).set(input)
    } else if (mode === 'swap' && buffer.numberOfChannels >= 2) {
      const ctx = new OfflineAudioContext(2, buffer.length, sr)
      newBuffer = ctx.createBuffer(2, buffer.length, sr)
      newBuffer.getChannelData(0).set(buffer.getChannelData(1))
      newBuffer.getChannelData(1).set(buffer.getChannelData(0))
    } else if (mode === 'extract-left' && buffer.numberOfChannels >= 2) {
      const ctx = new OfflineAudioContext(1, buffer.length, sr)
      newBuffer = ctx.createBuffer(1, buffer.length, sr)
      newBuffer.getChannelData(0).set(buffer.getChannelData(0))
    } else if (mode === 'extract-right' && buffer.numberOfChannels >= 2) {
      const ctx = new OfflineAudioContext(1, buffer.length, sr)
      newBuffer = ctx.createBuffer(1, buffer.length, sr)
      newBuffer.getChannelData(0).set(buffer.getChannelData(1))
    } else {
      return
    }

    dispatch({ type: 'PUSH_UNDO', payload: 'Channel Mixer' })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: track.id, buffer: newBuffer } })
    handleClose()
  }

  const isStereo = (track?.buffer?.numberOfChannels ?? 0) >= 2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div className="bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl w-[400px]" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-surface-50/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Channel Mixer</h3>
          <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={handleClose}>&times;</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-xs text-gray-500 mb-2">
            Current: {track?.buffer?.numberOfChannels}ch &middot; {track?.name}
          </div>
          {[
            { value: 'stereo-to-mono' as const, label: 'Stereo to Mono', desc: 'Mix all channels to mono', disabled: false },
            { value: 'mono-to-stereo' as const, label: 'Mono to Stereo', desc: 'Duplicate mono channel to stereo', disabled: false },
            { value: 'swap' as const, label: 'Swap Channels', desc: 'Swap left and right channels', disabled: !isStereo },
            { value: 'extract-left' as const, label: 'Extract Left Channel', desc: 'Keep only left channel as mono', disabled: !isStereo },
            { value: 'extract-right' as const, label: 'Extract Right Channel', desc: 'Keep only right channel as mono', disabled: !isStereo },
          ].map(opt => (
            <label key={opt.value} className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-50/50'} ${mode === opt.value ? 'bg-accent/10 border border-accent/30' : 'border border-transparent'}`}>
              <input
                type="radio"
                name="channel-mode"
                value={opt.value}
                checked={mode === opt.value}
                onChange={() => setMode(opt.value)}
                disabled={opt.disabled}
                className="mt-0.5"
              />
              <div>
                <div className="text-xs text-gray-300">{opt.label}</div>
                <div className="text-[10px] text-gray-500">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-surface-50/30 flex justify-end gap-2">
          <button className="btn-secondary text-xs" onClick={handleClose}>Cancel</button>
          <button className="btn-primary text-xs" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  )
}
