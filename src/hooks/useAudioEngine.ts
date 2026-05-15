import { useEditorStore, createTrack } from '../store/editorStore'
import {
  applyAmplify,
  applyNormalize,
  applyFadeIn,
  applyFadeOut,
  applyEq,
  applyCompressor,
  applyReverb,
  applyInvert,
  applyReverse,
  applyDelay,
  applyChorus,
  applyFlanger,
  applyPhaser,
  applyDistortion,
  applyPitchShift,
  applyTimeStretch,
  applyNoiseGate,
  applySpeedChange,
  applyTremolo,
  applyVibrato,
  applyVoiceRemoval,
  AIProgressCallback,
  extractRegion,
  generateSilence,
  generateTone,
  generateNoise,
  generateDTMF,
  generateSweep,
} from '../audio/AudioEffects'

export async function applyEffectToSelection(effectType: string, params?: Record<string, number>) {
  const state = useEditorStore.getState()
  const { selectedTrack, tracks, selection, dispatch } = state
  const track = tracks.find(t => t.id === selectedTrack)
  if (!track?.buffer) return

  const buffer = track.buffer
  const sr = buffer.sampleRate

  if (selection && selection.trackId === track.id) {
    const startSample = Math.floor(selection.start * sr)
    const endSample = Math.floor(selection.end * sr)
    const region = extractRegion(buffer, startSample, endSample)

    let processed: AudioBuffer
    switch (effectType) {
      case 'amplify':
        processed = applyAmplify(region, params?.gainDb ?? 6)
        break
      case 'normalize':
        processed = applyNormalize(region, params?.targetDb ?? -1)
        break
      case 'fadein':
        processed = applyFadeIn(region, region.length)
        break
      case 'fadeout':
        processed = applyFadeOut(region, region.length)
        break
      case 'eq':
        processed = await applyEq(region, [
          { freq: 60, gain: params?.low ?? 0, Q: 1 },
          { freq: 250, gain: params?.lowMid ?? 0, Q: 1 },
          { freq: 1000, gain: params?.mid ?? 0, Q: 1 },
          { freq: 4000, gain: params?.highMid ?? 0, Q: 1 },
          { freq: 12000, gain: params?.high ?? 0, Q: 1 },
        ])
        break
      case 'compressor':
        processed = await applyCompressor(region,
          params?.threshold ?? -24,
          params?.ratio ?? 4,
          params?.attack ?? 0.003,
          params?.release ?? 0.25,
        )
        break
      case 'reverb':
        processed = await applyReverb(region,
          params?.decay ?? 2,
          params?.mix ?? 0.3,
        )
        break
      case 'invert':
        processed = applyInvert(region)
        break
      case 'reverse':
        processed = applyReverse(region)
        break
      case 'delay':
        processed = await applyDelay(region, params?.delayTime ?? 0.3, params?.feedback ?? 0.4, params?.mix ?? 0.3)
        break
      case 'chorus':
        processed = await applyChorus(region, params?.rate ?? 1.5, params?.depth ?? 0.002, params?.mix ?? 0.5)
        break
      case 'flanger':
        processed = await applyFlanger(region, params?.rate ?? 0.5, params?.depth ?? 0.003, params?.feedback ?? 0.5, params?.mix ?? 0.5)
        break
      case 'phaser':
        processed = await applyPhaser(region, params?.rate ?? 0.5, params?.depth ?? 1000, params?.feedback ?? 0.5, params?.mix ?? 0.5)
        break
      case 'distortion':
        processed = applyDistortion(region, params?.amount ?? 50, params?.tone ?? 0.5)
        break
      case 'pitchshift':
        processed = applyPitchShift(region, params?.semitones ?? 0)
        break
      case 'timestretch':
        processed = applyTimeStretch(region, params?.ratio ?? 1)
        break
      case 'noisegate':
        processed = applyNoiseGate(region, params?.threshold ?? -40, params?.attack ?? 0.01, params?.release ?? 0.1)
        break
      case 'speedchange':
        processed = applySpeedChange(region, params?.speed ?? 1)
        break
      case 'tremolo':
        processed = await applyTremolo(region, params?.rate ?? 5, params?.depth ?? 0.5)
        break
      case 'vibrato':
        processed = await applyVibrato(region, params?.rate ?? 5, params?.depth ?? 0.003)
        break
      case 'voiceremoval':
        processed = await applyVoiceRemoval(region, params?.strength ?? 1, makeAIProgress(dispatch))
        break
      default:
        return
    }

    const newBuffer = replaceRegion(buffer, processed, startSample, endSample)
    dispatch({ type: 'PUSH_UNDO', payload: `Apply ${effectType}` })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: track.id, buffer: newBuffer } })
  } else {
    let processed: AudioBuffer
    switch (effectType) {
      case 'amplify':
        processed = applyAmplify(buffer, params?.gainDb ?? 6)
        break
      case 'normalize':
        processed = applyNormalize(buffer, params?.targetDb ?? -1)
        break
      case 'fadein':
        processed = applyFadeIn(buffer, buffer.length)
        break
      case 'fadeout':
        processed = applyFadeOut(buffer, buffer.length)
        break
      case 'eq':
        processed = await applyEq(buffer, [
          { freq: 60, gain: params?.low ?? 0, Q: 1 },
          { freq: 250, gain: params?.lowMid ?? 0, Q: 1 },
          { freq: 1000, gain: params?.mid ?? 0, Q: 1 },
          { freq: 4000, gain: params?.highMid ?? 0, Q: 1 },
          { freq: 12000, gain: params?.high ?? 0, Q: 1 },
        ])
        break
      case 'compressor':
        processed = await applyCompressor(buffer,
          params?.threshold ?? -24,
          params?.ratio ?? 4,
          params?.attack ?? 0.003,
          params?.release ?? 0.25,
        )
        break
      case 'reverb':
        processed = await applyReverb(buffer,
          params?.decay ?? 2,
          params?.mix ?? 0.3,
        )
        break
      case 'invert':
        processed = applyInvert(buffer)
        break
      case 'reverse':
        processed = applyReverse(buffer)
        break
      case 'delay':
        processed = await applyDelay(buffer, params?.delayTime ?? 0.3, params?.feedback ?? 0.4, params?.mix ?? 0.3)
        break
      case 'chorus':
        processed = await applyChorus(buffer, params?.rate ?? 1.5, params?.depth ?? 0.002, params?.mix ?? 0.5)
        break
      case 'flanger':
        processed = await applyFlanger(buffer, params?.rate ?? 0.5, params?.depth ?? 0.003, params?.feedback ?? 0.5, params?.mix ?? 0.5)
        break
      case 'phaser':
        processed = await applyPhaser(buffer, params?.rate ?? 0.5, params?.depth ?? 1000, params?.feedback ?? 0.5, params?.mix ?? 0.5)
        break
      case 'distortion':
        processed = applyDistortion(buffer, params?.amount ?? 50, params?.tone ?? 0.5)
        break
      case 'pitchshift':
        processed = applyPitchShift(buffer, params?.semitones ?? 0)
        break
      case 'timestretch':
        processed = applyTimeStretch(buffer, params?.ratio ?? 1)
        break
      case 'noisegate':
        processed = applyNoiseGate(buffer, params?.threshold ?? -40, params?.attack ?? 0.01, params?.release ?? 0.1)
        break
      case 'speedchange':
        processed = applySpeedChange(buffer, params?.speed ?? 1)
        break
      case 'tremolo':
        processed = await applyTremolo(buffer, params?.rate ?? 5, params?.depth ?? 0.5)
        break
      case 'vibrato':
        processed = await applyVibrato(buffer, params?.rate ?? 5, params?.depth ?? 0.003)
        break
      case 'voiceremoval':
        processed = await applyVoiceRemoval(buffer, params?.strength ?? 1, makeAIProgress(dispatch))
        break
      default:
        return
    }

    dispatch({ type: 'PUSH_UNDO', payload: `Apply ${effectType}` })
    dispatch({ type: 'SET_TRACK_BUFFER', payload: { id: track.id, buffer: processed } })
  }
}

export async function applyGenerate(effectType: string, params: Record<string, number>) {
  const state = useEditorStore.getState()
  const { dispatch, tracks } = state

  let buffer: AudioBuffer
  switch (effectType) {
    case 'generate-silence':
      buffer = generateSilence(1, 44100, params.duration ?? 1)
      break
    case 'generate-tone':
      buffer = await generateTone(
        params.frequency ?? 440,
        params.duration ?? 1,
        44100,
        params.amplitude ?? 0.8,
      )
      break
    case 'generate-noise':
      buffer = generateNoise(params.duration ?? 1, 44100)
      break
    case 'generate-dtmf':
      buffer = await generateDTMF(params.digits ? String(params.digits) : '1234', params.duration ?? 0.1, 44100)
      break
    case 'generate-sweep':
      buffer = await generateSweep(params.startFreq ?? 20, params.endFreq ?? 20000, params.duration ?? 3, 44100, params.amplitude ?? 0.8)
      break
    default:
      return
  }

  const track = createTrack(tracks, buffer, effectType.replace('generate-', ''))
  dispatch({ type: 'ADD_TRACK', payload: track })
}

function replaceRegion(
  buffer: AudioBuffer,
  replacement: AudioBuffer,
  startSample: number,
  endSample: number
): AudioBuffer {
  const newLength = buffer.length - (endSample - startSample) + replacement.length
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, newLength, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const replData = replacement.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    let outIdx = 0
    for (let i = 0; i < startSample && i < input.length; i++) {
      output[outIdx++] = input[i]
    }
    for (let i = 0; i < replData.length; i++) {
      output[outIdx++] = replData[i]
    }
    for (let i = endSample; i < input.length; i++) {
      output[outIdx++] = input[i]
    }
  }
  return newBuffer
}

function makeAIProgress(dispatch: (a: any) => void): AIProgressCallback {
  return (phase: string, percent: number) => {
    dispatch({ type: 'SET_AI_STATUS', payload: { phase, percent } })
  }
}
