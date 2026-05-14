import { create } from 'zustand'
import { AudioTrack, EditorState, EditorAction, ViewMode, Selection, TransportState, ActiveDialog, PasteMode, Marker } from '../types'
import { generateId, getNextTrackColor } from '../utils/helpers'

const initialTransport: TransportState = {
  isPlaying: false,
  isRecording: false,
  isPaused: false,
  position: 0,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 0,
}

const initialState: EditorState = {
  tracks: [],
  selectedTrack: null,
  selection: null,
  zoom: 100,
  scrollX: 0,
  scrollY: 0,
  viewMode: 'waveform',
  transport: initialTransport,
  sampleRate: 44100,
  duration: 0,
  cursorPosition: 0,
  snapToGrid: false,
  snapToZeroCrossing: false,
  gridInterval: 1,
  undoStack: [],
  redoStack: [],
  clipboard: null,
  pasteMode: 'insert' as PasteMode,
  markers: [] as Marker[],
  activeDialog: null,
}

export const useEditorStore = create<EditorState & { dispatch: (action: EditorAction) => void }>((set, get) => ({
  ...initialState,

  dispatch: (action: EditorAction) => {
    switch (action.type) {
      case 'ADD_TRACK':
        set(state => {
          const tracks = [...state.tracks, action.payload]
          const duration = Math.max(state.duration, action.payload.buffer ? action.payload.buffer.duration : 0)
          const selectedTrack = state.selectedTrack || action.payload.id
          return { tracks, duration, selectedTrack }
        })
        break

      case 'REMOVE_TRACK':
        set(state => ({
          tracks: state.tracks.filter(t => t.id !== action.payload),
          selectedTrack: state.selectedTrack === action.payload
            ? (state.tracks.find(t => t.id !== action.payload)?.id ?? null)
            : state.selectedTrack,
        }))
        break

      case 'SELECT_TRACK':
        set({ selectedTrack: action.payload })
        break

      case 'UPDATE_TRACK':
        set(state => ({
          tracks: state.tracks.map(t =>
            t.id === action.payload.id ? { ...t, ...action.payload.changes } : t
          ),
        }))
        break

      case 'SET_TRACK_BUFFER':
        set(state => ({
          tracks: state.tracks.map(t =>
            t.id === action.payload.id ? { ...t, buffer: action.payload.buffer } : t
          ),
          duration: Math.max(state.duration, action.payload.buffer?.duration ?? 0),
        }))
        break

      case 'SET_SELECTION':
        set({ selection: action.payload })
        break

      case 'SET_ZOOM':
        set({ zoom: action.payload })
        break

      case 'SET_SCROLL':
        set(state => ({
          scrollX: action.payload.x !== undefined ? action.payload.x : state.scrollX,
          scrollY: action.payload.y !== undefined ? action.payload.y : state.scrollY,
        }))
        break

      case 'SET_VIEW_MODE':
        set({ viewMode: action.payload })
        break

      case 'SET_TRANSPORT':
        set(state => ({
          transport: { ...state.transport, ...action.payload },
        }))
        break

      case 'SET_CURSOR':
        set({ cursorPosition: action.payload })
        break

      case 'SET_CLIPBOARD':
        set({ clipboard: action.payload })
        break

      case 'SET_DURATION':
        set({ duration: action.payload })
        break

      case 'PUSH_UNDO':
        set(state => ({
          undoStack: [...state.undoStack.slice(-49), { tracks: JSON.parse(JSON.stringify(state.tracks.map(t => ({
            ...t,
            buffer: null,
          })))), description: action.payload }],
          redoStack: [],
        }))
        break

      case 'UNDO':
        set(state => {
          if (state.undoStack.length === 0) return state
          const entry = state.undoStack[state.undoStack.length - 1]
          return {
            undoStack: state.undoStack.slice(0, -1),
            redoStack: [...state.redoStack, entry],
          }
        })
        break

      case 'REDO':
        set(state => {
          if (state.redoStack.length === 0) return state
          const entry = state.redoStack[state.redoStack.length - 1]
          return {
            redoStack: state.redoStack.slice(0, -1),
            undoStack: [...state.undoStack, entry],
          }
        })
        break

      case 'NEW_PROJECT':
        set({ ...initialState })
        break

      case 'LOAD_PROJECT':
        set(state => ({ ...state, ...action.payload }))
        break

      case 'SET_ACTIVE_DIALOG':
        set({ activeDialog: action.payload })
        break

      case 'SET_PASTE_MODE':
        set({ pasteMode: action.payload })
        break

      case 'SET_SNAP_TO_ZERO':
        set({ snapToZeroCrossing: action.payload })
        break

      case 'ADD_MARKER':
        set(state => ({ markers: [...state.markers, action.payload] }))
        break

      case 'REMOVE_MARKER':
        set(state => ({ markers: state.markers.filter(m => m.id !== action.payload) }))
        break

      case 'UPDATE_MARKER':
        set(state => ({
          markers: state.markers.map(m =>
            m.id === action.payload.id ? { ...m, ...action.payload.changes } : m
          ),
        }))
        break
    }
  },
}))

export function createTrack(existingTracks: { color: string }[], buffer?: AudioBuffer, name?: string): AudioTrack {
  return {
    id: generateId(),
    name: name || `Track ${existingTracks.length + 1}`,
    buffer: buffer || null,
    regions: [],
    muted: false,
    solo: false,
    volume: 1,
    pan: 0,
    color: getNextTrackColor(existingTracks),
    height: 120,
  }
}
