import { useEditorStore } from '../store/editorStore'
import { formatTime } from '../utils/helpers'

export function StatusBar() {
  const { tracks, selectedTrack, selection, zoom, sampleRate, viewMode, transport, markers, cursorPosition } = useEditorStore()
  const track = tracks.find(t => t.id === selectedTrack)

  const nearestMarker = markers.length > 0
    ? markers.reduce((prev, curr) => Math.abs(curr.position - cursorPosition) < Math.abs(prev.position - cursorPosition) ? curr : prev)
    : null

  return (
    <div className="h-6 bg-surface-500 border-t border-surface-50/30 flex items-center px-3 gap-4 text-[10px] text-gray-600">
      <span>Sample Rate: {sampleRate} Hz</span>
      <span>View: {viewMode}</span>
      <span>Zoom: {zoom}px/s</span>
      {track?.buffer && (
        <>
          <span>Channels: {track.buffer.numberOfChannels}</span>
          <span>Duration: {track.buffer.duration.toFixed(3)}s</span>
          <span>Samples: {track.buffer.length.toLocaleString()}</span>
        </>
      )}
      {selection && (
        <span className="text-accent">
          Sel: {selection.start.toFixed(3)}s → {selection.end.toFixed(3)}s ({(selection.end - selection.start).toFixed(3)}s)
        </span>
      )}
      {markers.length > 0 && (
        <span className="text-yellow-500">
          {markers.length} marker{markers.length !== 1 ? 's' : ''}
        </span>
      )}
      {transport.isRecording && (
        <span className="text-red-400 recording-indicator ml-auto">● RECORDING</span>
      )}
      <span className="ml-auto text-gray-700">Awsome Editor Pro v1.0.0</span>
    </div>
  )
}
