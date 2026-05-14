import { useEditorStore } from '../store/editorStore'
import { extractRegion } from '../audio/AudioEffects'

export function AudioStatisticsDialog() {
  const { activeDialog, dispatch, selectedTrack, tracks, selection } = useEditorStore()
  const track = tracks.find(t => t.id === selectedTrack)

  if (!activeDialog || activeDialog.type !== 'audio-statistics') return null

  const handleClose = () => dispatch({ type: 'SET_ACTIVE_DIALOG', payload: null })

  let stats: Record<string, string> = {}
  if (track?.buffer) {
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

    let min = Infinity, max = -Infinity, sum = 0, sumSq = 0
    let zeroCrossings = 0
    let peakSample = 0
    let peakValue = 0

    for (let i = 0; i < data.length; i++) {
      const s = data[i]
      if (s < min) min = s
      if (s > max) max = s
      sum += s
      sumSq += s * s
      if (Math.abs(s) > peakValue) {
        peakValue = Math.abs(s)
        peakSample = i
      }
      if (i > 0 && ((data[i - 1] >= 0 && s < 0) || (data[i - 1] < 0 && s >= 0))) {
        zeroCrossings++
      }
    }

    const rms = Math.sqrt(sumSq / data.length)
    const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity
    const peakDb = peakValue > 0 ? 20 * Math.log10(peakValue) : -Infinity
    const dcOffset = sum / data.length
    const duration = data.length / track.buffer.sampleRate
    const avgFreq = zeroCrossings > 0 ? (zeroCrossings / 2) / duration : 0

    stats = {
      'Sample Count': data.length.toLocaleString(),
      'Duration': `${duration.toFixed(6)} s`,
      'Sample Rate': `${track.buffer.sampleRate} Hz`,
      'Channels': `${track.buffer.numberOfChannels}`,
      'Bit Depth (est.)': '32-bit float',
      'Minimum Sample': min.toFixed(6),
      'Maximum Sample': max.toFixed(6),
      'Peak Amplitude': `${peakValue.toFixed(6)} (${Number.isFinite(peakDb) ? peakDb.toFixed(2) : '-Inf'} dB)`,
      'Peak Position': `sample ${peakSample.toLocaleString()} (${(peakSample / track.buffer.sampleRate).toFixed(6)} s)`,
      'RMS Level': `${rms.toFixed(6)} (${Number.isFinite(rmsDb) ? rmsDb.toFixed(2) : '-Inf'} dB)`,
      'DC Offset': dcOffset.toFixed(6),
      'Dynamic Range': Number.isFinite(peakDb) && Number.isFinite(rmsDb) ? `${(peakDb - rmsDb).toFixed(2)} dB` : 'N/A',
      'Zero Crossings': zeroCrossings.toLocaleString(),
      'Estimated Fund. Freq': avgFreq > 0 ? `${avgFreq.toFixed(1)} Hz` : 'N/A',
      'Crest Factor': rms > 0 ? `${(peakValue / rms).toFixed(2)} (${Number.isFinite(peakDb) && Number.isFinite(rmsDb) ? (peakDb - rmsDb).toFixed(1) : 'N/A'} dB)` : 'N/A',
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="bg-surface-300 border border-surface-50/50 rounded-lg shadow-2xl w-[500px]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-surface-50/30 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Audio Statistics</h3>
          <button className="text-gray-500 hover:text-gray-300 text-lg leading-none" onClick={handleClose}>&times;</button>
        </div>
        <div className="p-4">
          {track?.buffer ? (
            <div className="space-y-1">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="flex justify-between text-xs py-1 border-b border-surface-50/20">
                  <span className="text-gray-400">{key}</span>
                  <span className="text-gray-200 font-mono">{value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-8">No track selected</div>
          )}
          <div className="flex justify-between mt-3 text-[10px] text-gray-500">
            <span>{selection ? 'Selection' : 'Full track'}: {track?.name}</span>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-surface-50/30 flex justify-end">
          <button className="btn-secondary text-xs" onClick={handleClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
