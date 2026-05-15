import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { applyEffectToSelection } from '../hooks/useAudioEngine'
import { EffectParamDef } from '../types'

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
      { key: 'mix', label: 'Wet Mix', min: 0, max: 1, step: 0.01, defaultValue: 0.3, unit: '' },
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
  voiceremoval: {
    name: 'AI - Voice Removal',
    params: [
      { key: 'strength', label: 'Strength', min: 0, max: 1, step: 0.05, defaultValue: 1, unit: '' },
    ],
  },
}

const toolItems = [
  { id: 'frequency-analysis', name: 'Freq Analysis', icon: '&#128200;', dialogType: 'frequency-analysis' as const },
  { id: 'audio-statistics', name: 'Statistics', icon: '&#128202;', dialogType: 'audio-statistics' as const },
  { id: 'channel-mixer', name: 'Channel Mixer', icon: '&#128256;', dialogType: 'channel-mixer' as const },
  { id: 'resample', name: 'Resample', icon: '&#128257;', dialogType: 'resample' as const },
  { id: 'mix-paste', name: 'Mix Paste', icon: '&#128203;', dialogType: 'mix-paste' as const },
  { id: 'crossfade', name: 'Crossfade', icon: '&#10566;', dialogType: 'crossfade' as const },
]

const aiEffects = [
  { id: 'voiceremoval', name: 'Voice Removal', icon: '&#127908;', hasDialog: true },
]

const effects = [
  { id: 'amplify', name: 'Amplify', icon: '&#128266;', hasDialog: true },
  { id: 'normalize', name: 'Normalize', icon: '&#128202;', hasDialog: true },
  { id: 'fadein', name: 'Fade In', icon: '&#128200;', hasDialog: false },
  { id: 'fadeout', name: 'Fade Out', icon: '&#128201;', hasDialog: false },
  { id: 'eq', name: 'Equalizer', icon: '&#127890;', hasDialog: true },
  { id: 'compressor', name: 'Compressor', icon: '&#127919;', hasDialog: true },
  { id: 'reverb', name: 'Reverb', icon: '&#127963;', hasDialog: true },
  { id: 'delay', name: 'Delay / Echo', icon: '&#128276;', hasDialog: true },
  { id: 'chorus', name: 'Chorus', icon: '&#127925;', hasDialog: true },
  { id: 'flanger', name: 'Flanger', icon: '&#127926;', hasDialog: true },
  { id: 'phaser', name: 'Phaser', icon: '&#127927;', hasDialog: true },
  { id: 'distortion', name: 'Distortion', icon: '&#9889;', hasDialog: true },
  { id: 'tremolo', name: 'Tremolo', icon: '&#128167;', hasDialog: true },
  { id: 'vibrato', name: 'Vibrato', icon: '&#127944;', hasDialog: true },
  { id: 'pitchshift', name: 'Pitch Shift', icon: '&#127908;', hasDialog: true },
  { id: 'timestretch', name: 'Time Stretch', icon: '&#9201;', hasDialog: true },
  { id: 'speedchange', name: 'Speed Change', icon: '&#9193;', hasDialog: true },
  { id: 'noisegate', name: 'Noise Gate', icon: '&#128276;', hasDialog: true },
  { id: 'invert', name: 'Invert', icon: '&#128260;', hasDialog: false },
  { id: 'reverse', name: 'Reverse', icon: '&#9194;', hasDialog: false },
]

export function EffectsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const { selectedTrack, tracks, selection, dispatch } = useEditorStore()
  const track = tracks.find(t => t.id === selectedTrack)

  const handleEffectClick = (fxId: string, hasDialog: boolean) => {
    if (hasDialog) {
      const def = effectDialogDefs[fxId]
      if (def) {
        dispatch({
          type: 'SET_ACTIVE_DIALOG',
          payload: { type: 'effect', effectType: fxId, name: def.name, params: def.params },
        })
      }
    } else {
      applyEffectToSelection(fxId)
    }
  }

  if (!isOpen) {
    return (
      <div className="w-8 bg-surface-300 border-l border-surface-50/50 flex flex-col items-center py-2">
        <button
          className="btn-icon text-gray-500 hover:text-gray-300"
          onClick={() => setIsOpen(true)}
          title="Effects Panel"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="w-56 bg-surface-300 border-l border-surface-50/50 flex flex-col">
      <div className="flex items-center justify-between p-2 border-b border-surface-50/30">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Effects</span>
        <button className="btn-icon text-gray-500" onClick={() => setIsOpen(false)}>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M6 6l12 12M6 18L18 6" /></svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        <div className="text-[9px] text-gray-600 uppercase tracking-wider mb-1 px-1">Tools</div>
        {toolItems.map(tool => (
          <button
            key={tool.id}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400 hover:bg-accent hover:text-white transition-colors text-left disabled:text-gray-600 disabled:hover:bg-transparent disabled:hover:text-gray-600"
            onClick={() => dispatch({
              type: 'SET_ACTIVE_DIALOG',
              payload: { type: tool.dialogType, effectType: '', name: tool.name, params: [] },
            })}
          >
            <span className="text-xs" dangerouslySetInnerHTML={{ __html: tool.icon }} />
            <span className="flex-1">{tool.name}</span>
          </button>
        ))}
        <div className="text-[9px] text-gray-600 uppercase tracking-wider mt-2 mb-1 px-1">AI</div>
        {aiEffects.map(fx => (
          <button
            key={fx.id}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-purple-400 hover:bg-purple-600/20 hover:text-purple-300 transition-colors text-left disabled:text-gray-600 disabled:hover:bg-transparent disabled:hover:text-gray-600"
            onClick={() => handleEffectClick(fx.id, fx.hasDialog)}
            disabled={!track?.buffer}
          >
            <span className="text-xs" dangerouslySetInnerHTML={{ __html: fx.icon }} />
            <span className="flex-1">{fx.name}</span>
            {fx.hasDialog && <span className="text-[10px] text-gray-600">...</span>}
          </button>
        ))}
        <div className="text-[9px] text-gray-600 uppercase tracking-wider mt-2 mb-1 px-1">Effects</div>
        {effects.map(fx => (
          <button
            key={fx.id}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-400 hover:bg-accent hover:text-white transition-colors text-left disabled:text-gray-600 disabled:hover:bg-transparent disabled:hover:text-gray-600"
            onClick={() => handleEffectClick(fx.id, fx.hasDialog)}
            disabled={!track?.buffer}
          >
            <span className="text-xs" dangerouslySetInnerHTML={{ __html: fx.icon }} />
            <span className="flex-1">{fx.name}</span>
            {fx.hasDialog && <span className="text-[10px] text-gray-600">...</span>}
          </button>
        ))}
      </div>

      {track?.buffer && (
        <div className="p-2 border-t border-surface-50/30">
          <div className="text-[10px] text-gray-600 mb-1">
            {selection
              ? `Selection: ${selection.start.toFixed(3)}s - ${selection.end.toFixed(3)}s`
              : 'No selection (applies to whole track)'
            }
          </div>
          <div className="text-[10px] text-gray-600">
            Track: {track.name}
          </div>
        </div>
      )}
    </div>
  )
}
