import { useEditorStore } from '../store/editorStore'
import { extractRegion, insertRegion, deleteRegion } from '../audio/AudioEffects'

export function clipboardCopy() {
  const state = useEditorStore.getState()
  const { selection, selectedTrack, tracks, dispatch } = state
  if (!selection || !selectedTrack) return
  const track = tracks.find(t => t.id === selectedTrack)
  if (!track?.buffer) return
  const sr = track.buffer.sampleRate
  const startSample = Math.floor(selection.start * sr)
  const endSample = Math.floor(selection.end * sr)
  if (startSample === endSample) return
  const region = extractRegion(track.buffer, startSample, endSample)
  dispatch({ type: 'SET_CLIPBOARD', payload: region })
}

export function clipboardCut() {
  const state = useEditorStore.getState()
  const { selection, selectedTrack, tracks, dispatch } = state
  if (!selection || !selectedTrack) return
  const track = tracks.find(t => t.id === selectedTrack)
  if (!track?.buffer) return
  const sr = track.buffer.sampleRate
  const startSample = Math.floor(selection.start * sr)
  const endSample = Math.floor(selection.end * sr)
  if (startSample === endSample) return
  const region = extractRegion(track.buffer, startSample, endSample)
  dispatch({ type: 'SET_CLIPBOARD', payload: region })
  const newBuffer = deleteRegion(track.buffer, startSample, endSample)
  dispatch({ type: 'PUSH_UNDO', payload: 'Cut' })
  dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: selectedTrack, buffer: newBuffer } })
  dispatch({ type: 'SET_SELECTION', payload: null })
}

export function clipboardPaste() {
  const state = useEditorStore.getState()
  const { clipboard, selectedTrack, cursorPosition, tracks, dispatch } = state
  if (!clipboard || !selectedTrack) return
  const track = tracks.find(t => t.id === selectedTrack)
  if (!track?.buffer) return
  const insertSample = Math.floor(cursorPosition * track.buffer.sampleRate)
  const newBuffer = insertRegion(track.buffer, clipboard, insertSample)
  dispatch({ type: 'PUSH_UNDO', payload: 'Paste' })
  dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: selectedTrack, buffer: newBuffer } })
}

export function clipboardDelete() {
  const state = useEditorStore.getState()
  const { selection, selectedTrack, tracks, dispatch } = state
  if (!selection || !selectedTrack) return
  const track = tracks.find(t => t.id === selectedTrack)
  if (!track?.buffer) return
  const sr = track.buffer.sampleRate
  const startSample = Math.floor(selection.start * sr)
  const endSample = Math.floor(selection.end * sr)
  if (startSample === endSample) return
  const newBuffer = deleteRegion(track.buffer, startSample, endSample)
  dispatch({ type: 'PUSH_UNDO', payload: 'Delete' })
  dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: selectedTrack, buffer: newBuffer } })
  dispatch({ type: 'SET_SELECTION', payload: null })
}

export function selectAll() {
  const state = useEditorStore.getState()
  const track = state.tracks.find(t => t.id === state.selectedTrack) || state.tracks[0]
  if (!track?.buffer) return
  state.dispatch({ type: 'SET_SELECTION', payload: { start: 0, end: track.buffer.duration, trackId: track.id } })
}
