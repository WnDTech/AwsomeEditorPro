export interface Marker {
  id: string
  position: number
  name: string
  color: string
}

export type PasteMode = 'insert' | 'overwrite' | 'mix'

export type ToolDialogType =
  | 'effect'
  | 'generate'
  | 'frequency-analysis'
  | 'audio-statistics'
  | 'channel-mixer'
  | 'resample'
  | 'crossfade'
  | 'mix-paste'

export interface AudioTrack {
  id: string
  name: string
  buffer: AudioBuffer | null
  regions: AudioRegion[]
  muted: boolean
  solo: boolean
  volume: number
  pan: number
  color: string
  height: number
}

export interface AudioRegion {
  id: string
  trackId: string
  start: number
  offset: number
  duration: number
  buffer: AudioBuffer | null
  name: string
}

export interface Selection {
  start: number
  end: number
  trackId: string | null
}

export interface EffectPreset {
  name: string
  type: EffectType
  params: Record<string, number>
}

export type EffectType =
  | 'amplify'
  | 'normalize'
  | 'fadein'
  | 'fadeout'
  | 'eq'
  | 'compressor'
  | 'reverb'
  | 'noisereduction'
  | 'invert'
  | 'reverse'
  | 'delay'
  | 'chorus'
  | 'flanger'
  | 'phaser'
  | 'distortion'
  | 'pitchshift'
  | 'timestretch'
  | 'noisegate'
  | 'speedchange'
  | 'tremolo'
  | 'vibrato'
  | 'voiceremoval'

export type ViewMode = 'waveform' | 'spectral' | 'split'

export interface TransportState {
  isPlaying: boolean
  isRecording: boolean
  isPaused: boolean
  position: number
  loopEnabled: boolean
  loopStart: number
  loopEnd: number
}

export interface EffectParamDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  defaultValue: number
  unit: string
}

export interface ActiveDialog {
  type: ToolDialogType
  effectType: string
  name: string
  params: EffectParamDef[]
}

export interface AIStatus {
  phase: string
  percent: number
}

export interface EditorState {
  tracks: AudioTrack[]
  selectedTrack: string | null
  selection: Selection | null
  zoom: number
  scrollX: number
  scrollY: number
  viewMode: ViewMode
  transport: TransportState
  sampleRate: number
  duration: number
  cursorPosition: number
  snapToGrid: boolean
  snapToZeroCrossing: boolean
  gridInterval: number
  undoStack: UndoEntry[]
  redoStack: UndoEntry[]
  clipboard: AudioBuffer | null
  pasteMode: PasteMode
  markers: Marker[]
  activeDialog: ActiveDialog | null
  aiStatus: AIStatus | null
}

export interface UndoEntry {
  tracks: AudioTrack[]
  description: string
}

export type EditorAction =
  | { type: 'ADD_TRACK'; payload: AudioTrack }
  | { type: 'REMOVE_TRACK'; payload: string }
  | { type: 'SELECT_TRACK'; payload: string | null }
  | { type: 'UPDATE_TRACK'; payload: { id: string; changes: Partial<AudioTrack> } }
  | { type: 'SET_TRACK_BUFFER'; payload: { id: string; buffer: AudioBuffer } }
  | { type: 'SET_SELECTION'; payload: Selection | null }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_SCROLL'; payload: { x?: number; y?: number } }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SET_TRANSPORT'; payload: Partial<TransportState> }
  | { type: 'SET_CURSOR'; payload: number }
  | { type: 'SET_CLIPBOARD'; payload: AudioBuffer | null }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'PUSH_UNDO'; payload: string }
  | { type: 'NEW_PROJECT' }
  | { type: 'LOAD_PROJECT'; payload: Partial<EditorState> }
  | { type: 'SET_ACTIVE_DIALOG'; payload: ActiveDialog | null }
  | { type: 'SET_PASTE_MODE'; payload: PasteMode }
  | { type: 'SET_SNAP_TO_ZERO'; payload: boolean }
  | { type: 'SET_AI_STATUS'; payload: AIStatus | null }
  | { type: 'ADD_MARKER'; payload: Marker }
  | { type: 'REMOVE_MARKER'; payload: string }
  | { type: 'UPDATE_MARKER'; payload: { id: string; changes: Partial<Marker> } }
