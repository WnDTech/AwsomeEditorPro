import { useState, useRef, useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'
import { audioEngine } from '../audio/AudioEngine'
import { readAudioFile } from '../audio/AudioFileIO'
import { createTrack } from '../store/editorStore'
import { downloadWav } from '../audio/AudioFileIO'
import { applyEffectToSelection } from '../hooks/useAudioEngine'
import { clipboardCopy, clipboardCut, clipboardPaste, clipboardDelete, selectAll } from '../hooks/useClipboard'
import { EffectParamDef } from '../types'

interface MenuItem {
  label: string
  accelerator?: string
  separator?: boolean
  disabled?: boolean
  action?: () => void
  hasDialog?: boolean
}

interface MenuDef {
  label: string
  items: MenuItem[]
}

const effectDialogDefs: Record<string, { name: string; params: EffectParamDef[] }> = {
  amplify: {
    name: 'Amplify',
    params: [{ key: 'gainDb', label: 'Gain', min: -60, max: 60, step: 0.1, defaultValue: 6, unit: 'dB' }],
  },
  normalize: {
    name: 'Normalize',
    params: [{ key: 'targetDb', label: 'Target Level', min: -30, max: 0, step: 0.1, defaultValue: -1, unit: 'dB' }],
  },
  eq: {
    name: 'Equalizer',
    params: [
      { key: 'low', label: '60 Hz', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'dB' },
      { key: 'lowMid', label: '250 Hz', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'dB' },
      { key: 'mid', label: '1 kHz', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'dB' },
      { key: 'highMid', label: '4 kHz', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'dB' },
      { key: 'high', label: '12 kHz', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'dB' },
    ],
  },
  compressor: {
    name: 'Compressor',
    params: [
      { key: 'threshold', label: 'Threshold', min: -60, max: 0, step: 1, defaultValue: -24, unit: 'dB' },
      { key: 'ratio', label: 'Ratio', min: 1, max: 20, step: 0.5, defaultValue: 4, unit: ':1' },
      { key: 'attack', label: 'Attack', min: 0, max: 1, step: 0.001, defaultValue: 0.003, unit: 's' },
      { key: 'release', label: 'Release', min: 0.01, max: 1, step: 0.01, defaultValue: 0.25, unit: 's' },
    ],
  },
  reverb: {
    name: 'Reverb',
    params: [
      { key: 'decay', label: 'Decay', min: 0.1, max: 10, step: 0.1, defaultValue: 2, unit: 's' },
      { key: 'mix', label: 'Wet Mix', min: 0, max: 1, step: 0.01, defaultValue: 0.3, unit: '%' },
    ],
  },
  delay: {
    name: 'Delay / Echo',
    params: [
      { key: 'delayTime', label: 'Delay Time', min: 0.01, max: 5, step: 0.01, defaultValue: 0.3, unit: 's' },
      { key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.01, defaultValue: 0.4, unit: '' },
      { key: 'mix', label: 'Wet Mix', min: 0, max: 1, step: 0.01, defaultValue: 0.3, unit: '' },
    ],
  },
  chorus: {
    name: 'Chorus',
    params: [
      { key: 'rate', label: 'Rate', min: 0.1, max: 10, step: 0.1, defaultValue: 1.5, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0.001, max: 0.01, step: 0.001, defaultValue: 0.002, unit: 's' },
      { key: 'mix', label: 'Wet Mix', min: 0, max: 1, step: 0.01, defaultValue: 0.5, unit: '' },
    ],
  },
  flanger: {
    name: 'Flanger',
    params: [
      { key: 'rate', label: 'Rate', min: 0.1, max: 5, step: 0.1, defaultValue: 0.5, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0.001, max: 0.01, step: 0.001, defaultValue: 0.003, unit: 's' },
      { key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.01, defaultValue: 0.5, unit: '' },
      { key: 'mix', label: 'Wet Mix', min: 0, max: 1, step: 0.01, defaultValue: 0.5, unit: '' },
    ],
  },
  phaser: {
    name: 'Phaser',
    params: [
      { key: 'rate', label: 'Rate', min: 0.1, max: 5, step: 0.1, defaultValue: 0.5, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 100, max: 5000, step: 100, defaultValue: 1000, unit: '' },
      { key: 'feedback', label: 'Feedback', min: 0, max: 0.95, step: 0.01, defaultValue: 0.5, unit: '' },
      { key: 'mix', label: 'Wet Mix', min: 0, max: 1, step: 0.01, defaultValue: 0.5, unit: '' },
    ],
  },
  distortion: {
    name: 'Distortion',
    params: [
      { key: 'amount', label: 'Amount', min: 1, max: 100, step: 1, defaultValue: 50, unit: '' },
      { key: 'tone', label: 'Tone', min: 0, max: 1, step: 0.01, defaultValue: 0.5, unit: '' },
    ],
  },
  pitchshift: {
    name: 'Pitch Shift',
    params: [
      { key: 'semitones', label: 'Semitones', min: -12, max: 12, step: 0.5, defaultValue: 0, unit: 'st' },
    ],
  },
  timestretch: {
    name: 'Time Stretch',
    params: [
      { key: 'ratio', label: 'Ratio', min: 0.25, max: 4, step: 0.05, defaultValue: 1, unit: 'x' },
    ],
  },
  noisegate: {
    name: 'Noise Gate',
    params: [
      { key: 'threshold', label: 'Threshold', min: -80, max: 0, step: 1, defaultValue: -40, unit: 'dB' },
      { key: 'attack', label: 'Attack', min: 0.001, max: 0.1, step: 0.001, defaultValue: 0.01, unit: 's' },
      { key: 'release', label: 'Release', min: 0.01, max: 1, step: 0.01, defaultValue: 0.1, unit: 's' },
    ],
  },
  speedchange: {
    name: 'Speed Change',
    params: [
      { key: 'speed', label: 'Speed', min: 0.25, max: 4, step: 0.05, defaultValue: 1, unit: 'x' },
    ],
  },
  tremolo: {
    name: 'Tremolo',
    params: [
      { key: 'rate', label: 'Rate', min: 0.5, max: 20, step: 0.5, defaultValue: 5, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0, max: 1, step: 0.01, defaultValue: 0.5, unit: '' },
    ],
  },
  vibrato: {
    name: 'Vibrato',
    params: [
      { key: 'rate', label: 'Rate', min: 0.5, max: 20, step: 0.5, defaultValue: 5, unit: 'Hz' },
      { key: 'depth', label: 'Depth', min: 0.001, max: 0.01, step: 0.001, defaultValue: 0.003, unit: 's' },
    ],
  },
}

const generateDialogDefs: Record<string, { name: string; params: EffectParamDef[] }> = {
  'generate-silence': {
    name: 'Generate Silence',
    params: [{ key: 'duration', label: 'Duration', min: 0.1, max: 300, step: 0.1, defaultValue: 1, unit: 's' }],
  },
  'generate-tone': {
    name: 'Generate Tone',
    params: [
      { key: 'frequency', label: 'Frequency', min: 20, max: 20000, step: 1, defaultValue: 440, unit: 'Hz' },
      { key: 'duration', label: 'Duration', min: 0.1, max: 300, step: 0.1, defaultValue: 1, unit: 's' },
      { key: 'amplitude', label: 'Amplitude', min: 0, max: 1, step: 0.01, defaultValue: 0.8, unit: '' },
    ],
  },
  'generate-noise': {
    name: 'Generate Noise',
    params: [{ key: 'duration', label: 'Duration', min: 0.1, max: 300, step: 0.1, defaultValue: 1, unit: 's' }],
  },
  'generate-dtmf': {
    name: 'Generate DTMF',
    params: [
      { key: 'digits', label: 'Digits (0-9,*,#)', min: 0, max: 999999999, step: 1, defaultValue: 1234, unit: '' },
      { key: 'duration', label: 'Tone Duration', min: 0.05, max: 1, step: 0.05, defaultValue: 0.1, unit: 's' },
    ],
  },
  'generate-sweep': {
    name: 'Generate Frequency Sweep',
    params: [
      { key: 'startFreq', label: 'Start Freq', min: 20, max: 20000, step: 1, defaultValue: 20, unit: 'Hz' },
      { key: 'endFreq', label: 'End Freq', min: 20, max: 20000, step: 1, defaultValue: 20000, unit: 'Hz' },
      { key: 'duration', label: 'Duration', min: 0.1, max: 60, step: 0.1, defaultValue: 3, unit: 's' },
      { key: 'amplitude', label: 'Amplitude', min: 0, max: 1, step: 0.01, defaultValue: 0.8, unit: '' },
    ],
  },
}

export function getEffectDialogDef(effectType: string) {
  return effectDialogDefs[effectType] ?? null
}

export function getGenerateDialogDef(effectType: string) {
  return generateDialogDefs[effectType] ?? null
}

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)
  const { tracks, dispatch, selectedTrack, selection, cursorPosition, transport, clipboard } = useEditorStore()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasSelection = !!selection && selection.start !== selection.end
  const hasClipboard = !!clipboard

  const handleOpenFile = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.wav,.mp3,.ogg,.flac,.aiff,.aac'
    input.multiple = true
    input.onchange = async () => {
      if (!input.files) return
      for (const file of Array.from(input.files)) {
        try {
          const { buffer, name } = await readAudioFile(file)
          const currentTracks = useEditorStore.getState().tracks
          const track = createTrack(currentTracks, buffer, name.replace(/\.[^/.]+$/, ''))
          dispatch({ type: 'ADD_TRACK', payload: track })
        } catch (err) {
          console.error('Failed to load file:', err)
        }
      }
    }
    input.click()
  }

  const handleSave = () => {
    const track = tracks.find(t => t.id === selectedTrack) || tracks[0]
    if (track?.buffer) {
      downloadWav(track.buffer, track.name)
    }
  }

  const handleSaveAs = () => {
    const track = tracks.find(t => t.id === selectedTrack) || tracks[0]
    if (track?.buffer) {
      const name = prompt('Save as:', track.name)
      if (name) downloadWav(track.buffer, name)
    }
  }

  const handleNew = () => {
    audioEngine.stopAll()
    dispatch({ type: 'NEW_PROJECT' })
  }

  const openEffectDialog = (effectType: string) => {
    const def = effectDialogDefs[effectType]
    if (def) {
      dispatch({
        type: 'SET_ACTIVE_DIALOG',
        payload: { type: 'effect', effectType, name: def.name, params: def.params },
      })
    } else {
      applyEffectToSelection(effectType)
    }
  }

  const openGenerateDialog = (generateType: string) => {
    const def = generateDialogDefs[generateType]
    if (def) {
      dispatch({
        type: 'SET_ACTIVE_DIALOG',
        payload: { type: 'generate', effectType: generateType, name: def.name, params: def.params },
      })
    }
  }

  const openToolDialog = (dialogType: string, name: string) => {
    dispatch({
      type: 'SET_ACTIVE_DIALOG',
      payload: { type: dialogType as any, effectType: '', name, params: [] },
    })
  }

  const hasTrack = !!tracks.find(t => t.id === selectedTrack)?.buffer || !!tracks[0]?.buffer

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New', accelerator: 'Ctrl+N', action: handleNew },
        { label: 'Open...', accelerator: 'Ctrl+O', action: handleOpenFile },
        { separator: true, label: '' },
        { label: 'Save', accelerator: 'Ctrl+S', action: handleSave, disabled: !hasTrack },
        { label: 'Save As...', accelerator: 'Ctrl+Shift+S', action: handleSaveAs, disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Export WAV...', accelerator: 'Ctrl+E', action: handleSave, disabled: !hasTrack },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', accelerator: 'Ctrl+Z', action: () => dispatch({ type: 'UNDO' }) },
        { label: 'Redo', accelerator: 'Ctrl+Shift+Z', action: () => dispatch({ type: 'REDO' }) },
        { separator: true, label: '' },
        { label: 'Cut', accelerator: 'Ctrl+X', action: clipboardCut, disabled: !hasSelection },
        { label: 'Copy', accelerator: 'Ctrl+C', action: clipboardCopy, disabled: !hasSelection },
        { label: 'Paste', accelerator: 'Ctrl+V', action: clipboardPaste, disabled: !hasClipboard },
        { separator: true, label: '' },
        { label: 'Delete Selection', accelerator: 'Del', action: clipboardDelete, disabled: !hasSelection },
        { separator: true, label: '' },
        { label: 'Select All', accelerator: 'Ctrl+A', action: selectAll, disabled: !hasTrack },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Waveform View', action: () => dispatch({ type: 'SET_VIEW_MODE', payload: 'waveform' }) },
        { label: 'Spectral View', action: () => dispatch({ type: 'SET_VIEW_MODE', payload: 'spectral' }) },
        { label: 'Split View', action: () => dispatch({ type: 'SET_VIEW_MODE', payload: 'split' }) },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Frequency Analysis...', action: () => openToolDialog('frequency-analysis', 'Frequency Analysis'), disabled: !hasTrack },
        { label: 'Audio Statistics...', action: () => openToolDialog('audio-statistics', 'Audio Statistics'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Split at Cursor', accelerator: 'B', action: () => {}, disabled: !hasTrack },
        { label: 'Trim to Selection', action: () => {}, disabled: !selection },
        { label: 'Duplicate Selection', accelerator: 'D', action: () => {}, disabled: !hasTrack },
        { label: 'Mix Paste...', action: () => openToolDialog('mix-paste', 'Mix Paste') },
        { label: 'Crossfade...', action: () => openToolDialog('crossfade', 'Crossfade'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Channel Mixer...', action: () => openToolDialog('channel-mixer', 'Channel Mixer'), disabled: !hasTrack },
        { label: 'Resample...', action: () => openToolDialog('resample', 'Resample'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Mix Down to New Track', action: () => {}, disabled: tracks.length === 0 },
        { separator: true, label: '' },
        { label: 'Add Marker at Cursor', accelerator: 'M', action: () => {} },
        { separator: true, label: '' },
        { label: 'Zoom to Selection', action: () => {}, disabled: !selection },
        { label: 'Fit to Window', action: () => {}, disabled: !hasTrack },
      ],
    },
    {
      label: 'Effects',
      items: [
        { label: 'Amplify...', action: () => openEffectDialog('amplify'), disabled: !hasTrack },
        { label: 'Normalize...', action: () => openEffectDialog('normalize'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Fade In', action: () => applyEffectToSelection('fadein'), disabled: !hasTrack },
        { label: 'Fade Out', action: () => applyEffectToSelection('fadeout'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Equalizer...', action: () => openEffectDialog('eq'), disabled: !hasTrack },
        { label: 'Compressor...', action: () => openEffectDialog('compressor'), disabled: !hasTrack },
        { label: 'Noise Gate...', action: () => openEffectDialog('noisegate'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Reverb...', action: () => openEffectDialog('reverb'), disabled: !hasTrack },
        { label: 'Delay / Echo...', action: () => openEffectDialog('delay'), disabled: !hasTrack },
        { label: 'Chorus...', action: () => openEffectDialog('chorus'), disabled: !hasTrack },
        { label: 'Flanger...', action: () => openEffectDialog('flanger'), disabled: !hasTrack },
        { label: 'Phaser...', action: () => openEffectDialog('phaser'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Distortion...', action: () => openEffectDialog('distortion'), disabled: !hasTrack },
        { label: 'Tremolo...', action: () => openEffectDialog('tremolo'), disabled: !hasTrack },
        { label: 'Vibrato...', action: () => openEffectDialog('vibrato'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Pitch Shift...', action: () => openEffectDialog('pitchshift'), disabled: !hasTrack },
        { label: 'Time Stretch...', action: () => openEffectDialog('timestretch'), disabled: !hasTrack },
        { label: 'Speed Change...', action: () => openEffectDialog('speedchange'), disabled: !hasTrack },
        { separator: true, label: '' },
        { label: 'Invert', action: () => applyEffectToSelection('invert'), disabled: !hasTrack },
        { label: 'Reverse', action: () => applyEffectToSelection('reverse'), disabled: !hasTrack },
      ],
    },
    {
      label: 'Generate',
      items: [
        { label: 'Silence...', action: () => openGenerateDialog('generate-silence') },
        { label: 'Tone...', action: () => openGenerateDialog('generate-tone') },
        { label: 'Noise...', action: () => openGenerateDialog('generate-noise') },
        { separator: true, label: '' },
        { label: 'DTMF Tones...', action: () => openGenerateDialog('generate-dtmf') },
        { label: 'Frequency Sweep...', action: () => openGenerateDialog('generate-sweep') },
      ],
    },
  ]

  return (
    <div ref={menuBarRef} className="h-7 bg-surface-500 flex items-center px-1 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      {menus.map((menu, menuIdx) => (
        <div key={menu.label} className="relative" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            className={`px-3 py-0.5 text-xs font-medium rounded transition-colors ${
              openMenu === menuIdx ? 'bg-surface-50 text-gray-200' : 'text-gray-400 hover:bg-surface-50/50 hover:text-gray-300'
            }`}
            onClick={() => setOpenMenu(openMenu === menuIdx ? null : menuIdx)}
            onMouseEnter={() => { if (openMenu !== null) setOpenMenu(menuIdx) }}
          >
            {menu.label}
          </button>

          {openMenu === menuIdx && (
            <div className="absolute top-full left-0 mt-0.5 bg-surface-300 border border-surface-50/50 rounded shadow-xl py-1 min-w-[220px] z-50">
              {menu.items.map((item, itemIdx) => (
                item.separator ? (
                  <div key={itemIdx} className="h-px bg-surface-50/30 my-1 mx-2" />
                ) : (
                  <button
                    key={itemIdx}
                    className={`w-full flex items-center justify-between px-4 py-1.5 text-xs transition-colors ${
                      item.disabled ? 'text-gray-600 cursor-default' : 'text-gray-300 hover:bg-accent hover:text-white'
                    }`}
                    onClick={() => {
                      if (!item.disabled && item.action) {
                        item.action()
                        setOpenMenu(null)
                      }
                    }}
                    disabled={item.disabled}
                  >
                    <span>{item.label}</span>
                    {item.accelerator && <span className="text-gray-600 ml-6 text-[10px]">{item.accelerator}</span>}
                  </button>
                )
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
