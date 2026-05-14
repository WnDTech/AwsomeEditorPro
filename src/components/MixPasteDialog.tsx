import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { extractRegion, insertRegion, deleteRegion } from '../audio/AudioEffects'

export function MixPasteDialog() {
  const { activeDialog, dispatch, selectedTrack, tracks, cursorPosition, clipboard } = useEditorStore()
  const [mode, setMode] = useState<'insert' | 'overwrite' | 'mix'>('insert')
  const [volume, setVolume] = useState(1.0)
  const [fadeIn, setFadeIn] = useState(0)
  const [fadeOut, setFadeOut] = useState(0)
  const [loop, setLoop] = useState(false)
  const track = tracks.find(t => t.id === selectedTrack)

  if (!activeDialog || activeDialog.type !== 'mix-paste') return null

  const handleClose = () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })

  const handleApply = () => {
    if (!clipboard || !selectedTrack || !track?.buffer) return

    const sr = track.buffer.sampleRate
    const insertSample = Math.floor(cursorPosition * sr)
    let clipData = clipboard

    if (volume !== 1.0) {
      const ctx = new OfflineAudioContext(clipboard.numberOfChannels, clipboard.length, sr)
      const newClip = ctx.createBuffer(clipboard.numberOfChannels, clipboard.length, sr)
      for (let ch = 0; ch < clipboard.numberOfChannels; ch++) {
        const input = clipboard.getChannelData(ch)
        const output = newClip.getChannelData(ch)
        for (let i = 0; i < input.length; i++) {
          output[i] = input[i] * volume
        }
      }
      clipData = newClip
    }

    if (fadeIn > 0 || fadeOut > 0) {
      const ctx = new OfflineAudioContext(clipData.numberOfChannels, clipData.length, sr)
      const faded = ctx.createBuffer(clipData.numberOfChannels, clipData.length, sr)
      const fadeInSamples = Math.floor(fadeIn * sr)
      const fadeOutSamples = Math.floor(fadeOut * sr)
      for (let ch = 0; ch < clipData.numberOfChannels; ch++) {
        const input = clipData.getChannelData(ch)
        const output = faded.getChannelData(ch)
        for (let i = 0; i < input.length; i++) {
          let gain = 1
          if (i < fadeInSamples) gain = i / fadeInSamples
          if (i >= input.length - fadeOutSamples) gain = Math.min(gain, (input.length - i) / fadeOutSamples)
          output[i] = input[i] * gain
        }
      }
      clipData = faded
    }

    let newBuffer: AudioBuffer

    if (mode === 'insert') {
      newBuffer = insertRegion(track.buffer, clipData, insertSample)
    } else if (mode === 'overwrite') {
      const ctx = new OfflineAudioContext(track.buffer.numberOfChannels, track.buffer.length, track.buffer.sampleRate)
      newBuffer = ctx.createBuffer(track.buffer.numberOfChannels, track.buffer.length, track.buffer.sampleRate)
      for (let ch = 0; ch < track.buffer.numberOfChannels; ch++) {
        newBuffer.getChannelData(ch).set(track.buffer.getChannelData(ch))
      }
      for (let ch = 0; ch < Math.min(clipData.numberOfChannels, track.buffer.numberOfChannels); ch++) {
        const src = clipData.getChannelData(ch)
        const dst = newBuffer.getChannelData(ch)
        for (let i = 0; i < src.length && insertSample + i < dst.length; i++) {
          dst[insertSample + i] = src[i]
        }
      }
    } else {
      const ctx = new OfflineAudioContext(track.buffer.numberOfChannels, track.buffer.length, track.buffer.sampleRate)
      newBuffer = ctx.createBuffer(track.buffer.numberOfChannels, track.buffer.length, track.buffer.sampleRate)
      for (let ch = 0; ch < track.buffer.numberOfChannels; ch++) {
        newBuffer.getChannelData(ch).set(track.buffer.getChannelData(ch))
      }
      for (let ch = 0; ch < Math.min(clipData.numberOfChannels, track.buffer.numberOfChannels); ch++) {
        const src = clipData.getChannelData(ch)
        const dst = newBuffer.getChannelData(ch)
        for (let i = 0; i < src.length && insertSample + i < dst.length; i++) {
          dst[insertSample + i] += src[i]
        }
      }
    }

    dispatch({ type: 'PUSH_UNDO', payload: `Mix Paste (${mode})` })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: selectedTrack, buffer: newBuffer } })
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div className="bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl w-[420px]" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-surface-50/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Mix Paste</h3>
          <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={handleClose}>&times;</button>
        </div>
        {!clipboard ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Nothing on clipboard. Copy audio first (Ctrl+C).
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <div className="text-xs text-gray-500">
              Clipboard: {clipboard.duration.toFixed(3)}s, {clipboard.numberOfChannels}ch
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Paste Mode</label>
              <div className="flex gap-1">
                {[
                  { value: 'insert' as const, label: 'Insert' },
                  { value: 'overwrite' as const, label: 'Overwrite' },
                  { value: 'mix' as const, label: 'Mix' },
                ].map(m => (
                  <button
                    key={m.value}
                    className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${mode === m.value ? 'bg-accent text-white' : 'bg-surface-50 text-gray-400 hover:text-gray-200'}`}
                    onClick={() => setMode(m.value)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-400">Volume</label>
                <span className="text-xs text-gray-500 font-mono">{Math.round(volume * 100)}%</span>
              </div>
              <input type="range" min={0} max={2} step={0.01} value={volume} onChange={e => setVolume(Number(e.target.value))} className="w-full" />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Fade In</label>
                  <span className="text-xs text-gray-500 font-mono">{fadeIn.toFixed(2)}s</span>
                </div>
                <input type="range" min={0} max={2} step={0.01} value={fadeIn} onChange={e => setFadeIn(Number(e.target.value))} className="w-full" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-400">Fade Out</label>
                  <span className="text-xs text-gray-500 font-mono">{fadeOut.toFixed(2)}s</span>
                </div>
                <input type="range" min={0} max={2} step={0.01} value={fadeOut} onChange={e => setFadeOut(Number(e.target.value))} className="w-full" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} />
              Loop paste (repeat clipboard)
            </label>
          </div>
        )}
        <div className="px-4 py-3 border-t border-surface-50/30 flex justify-end gap-2">
          <button className="btn-secondary text-xs" onClick={handleClose}>Cancel</button>
          <button className="btn-primary text-xs" onClick={handleApply} disabled={!clipboard}>Paste</button>
        </div>
      </div>
    </div>
  )
}
