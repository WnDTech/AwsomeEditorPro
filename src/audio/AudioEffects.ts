import { AudioEngine } from './AudioEngine'

export function applyAmplify(buffer: AudioBuffer, gainDb: number): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const factor = Math.pow(10, gainDb / 20)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] * factor
    }
  }
  return newBuffer
}

export function applyNormalize(buffer: AudioBuffer, targetDb: number = -1): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  let maxPeak = 0
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch)
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i])
      if (abs > maxPeak) maxPeak = abs
    }
  }

  if (maxPeak === 0) return buffer
  const targetLinear = Math.pow(10, targetDb / 20)
  const factor = targetLinear / maxPeak
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    for (let i = 0; i < input.length; i++) {
      output[i] = input[i] * factor
    }
  }
  return newBuffer
}

export function applyFadeIn(buffer: AudioBuffer, durationSamples: number): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const fadeLen = Math.min(durationSamples, buffer.length)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    for (let i = 0; i < buffer.length; i++) {
      if (i < fadeLen) {
        output[i] = input[i] * (i / fadeLen)
      } else {
        output[i] = input[i]
      }
    }
  }
  return newBuffer
}

export function applyFadeOut(buffer: AudioBuffer, durationSamples: number): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const fadeLen = Math.min(durationSamples, buffer.length)
  const fadeStart = buffer.length - fadeLen

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    for (let i = 0; i < buffer.length; i++) {
      if (i >= fadeStart) {
        output[i] = input[i] * (1 - (i - fadeStart) / fadeLen)
      } else {
        output[i] = input[i]
      }
    }
  }
  return newBuffer
}

export function applyInvert(buffer: AudioBuffer): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    for (let i = 0; i < input.length; i++) {
      output[i] = -input[i]
    }
  }
  return newBuffer
}

export function applyReverse(buffer: AudioBuffer): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    for (let i = 0; i < input.length; i++) {
      output[i] = input[input.length - 1 - i]
    }
  }
  return newBuffer
}

export async function applyEq(buffer: AudioBuffer, bands: { freq: number; gain: number; Q: number }[]): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  let lastNode: AudioNode = source
  for (const band of bands) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'peaking'
    filter.frequency.value = band.freq
    filter.gain.value = band.gain
    filter.Q.value = band.Q
    lastNode.connect(filter)
    lastNode = filter
  }

  lastNode.connect(ctx.destination)
  source.start()
  return await ctx.startRendering()
}

export async function applyCompressor(
  buffer: AudioBuffer,
  threshold: number = -24,
  ratio: number = 4,
  attack: number = 0.003,
  release: number = 0.25,
  knee: number = 30
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const compressor = ctx.createDynamicsCompressor()
  compressor.threshold.value = threshold
  compressor.ratio.value = ratio
  compressor.attack.value = attack
  compressor.release.value = release
  compressor.knee.value = knee

  source.connect(compressor)
  compressor.connect(ctx.destination)
  source.start()
  return await ctx.startRendering()
}

export async function applyReverb(
  buffer: AudioBuffer,
  decay: number = 2,
  mix: number = 0.3
): Promise<AudioBuffer> {
  const sampleRate = buffer.sampleRate
  const length = sampleRate * decay
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const convolver = ctx.createConvolver()
  const impulseBuffer = ctx.createBuffer(2, length, sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const data = impulseBuffer.getChannelData(ch)
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  convolver.buffer = impulseBuffer

  const dryGain = ctx.createGain()
  dryGain.gain.value = 1 - mix
  const wetGain = ctx.createGain()
  wetGain.gain.value = mix

  source.connect(dryGain)
  source.connect(convolver)
  convolver.connect(wetGain)
  dryGain.connect(ctx.destination)
  wetGain.connect(ctx.destination)
  source.start()
  return await ctx.startRendering()
}

export function extractRegion(buffer: AudioBuffer, startSample: number, endSample: number): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, endSample - startSample, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, endSample - startSample, buffer.sampleRate)
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    for (let i = 0; i < output.length; i++) {
      const srcIdx = startSample + i
      if (srcIdx >= 0 && srcIdx < input.length) {
        output[i] = input[srcIdx]
      }
    }
  }
  return newBuffer
}

export function insertRegion(buffer: AudioBuffer, region: AudioBuffer, insertSample: number): AudioBuffer {
  const newLength = buffer.length + region.length
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, newLength, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const regionData = region.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    let outIdx = 0
    for (let i = 0; i < insertSample && i < buffer.length; i++) {
      output[outIdx++] = input[i]
    }
    for (let i = 0; i < regionData.length; i++) {
      output[outIdx++] = regionData[i]
    }
    for (let i = insertSample; i < buffer.length; i++) {
      output[outIdx++] = input[i]
    }
  }
  return newBuffer
}

export function deleteRegion(buffer: AudioBuffer, startSample: number, endSample: number): AudioBuffer {
  const newLength = buffer.length - (endSample - startSample)
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, newLength, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    let outIdx = 0
    for (let i = 0; i < startSample; i++) {
      output[outIdx++] = input[i]
    }
    for (let i = endSample; i < buffer.length; i++) {
      output[outIdx++] = input[i]
    }
  }
  return newBuffer
}

export function generateSilence(channels: number, sampleRate: number, durationSeconds: number): AudioBuffer {
  const length = Math.floor(sampleRate * durationSeconds)
  const ctx = new OfflineAudioContext(channels, length, sampleRate)
  return ctx.createBuffer(channels, length, sampleRate)
}

export async function generateTone(
  frequency: number,
  durationSeconds: number,
  sampleRate: number = 44100,
  amplitude: number = 0.8,
  waveType: OscillatorType = 'sine'
): Promise<AudioBuffer> {
  const length = Math.floor(sampleRate * durationSeconds)
  const ctx = new OfflineAudioContext(1, length, sampleRate)
  const oscillator = ctx.createOscillator()
  oscillator.type = waveType
  oscillator.frequency.value = frequency
  const gain = ctx.createGain()
  gain.gain.value = amplitude
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  return await ctx.startRendering()
}

export function generateNoise(durationSeconds: number, sampleRate: number = 44100): AudioBuffer {
  const length = Math.floor(sampleRate * durationSeconds)
  const ctx = new OfflineAudioContext(1, length, sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

export async function applyDelay(
  buffer: AudioBuffer,
  delayTime: number = 0.3,
  feedback: number = 0.4,
  mix: number = 0.3
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const delayNode = ctx.createDelay(5)
  delayNode.delayTime.value = delayTime
  const feedbackGain = ctx.createGain()
  feedbackGain.gain.value = feedback
  const dryGain = ctx.createGain()
  dryGain.gain.value = 1 - mix
  const wetGain = ctx.createGain()
  wetGain.gain.value = mix

  source.connect(dryGain)
  source.connect(delayNode)
  delayNode.connect(feedbackGain)
  feedbackGain.connect(delayNode)
  delayNode.connect(wetGain)
  dryGain.connect(ctx.destination)
  wetGain.connect(ctx.destination)
  source.start()
  return await ctx.startRendering()
}

export async function applyChorus(
  buffer: AudioBuffer,
  rate: number = 1.5,
  depth: number = 0.002,
  mix: number = 0.5
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const delayNode = ctx.createDelay(0.05)
  delayNode.delayTime.value = 0.005
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rate
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = depth
  lfo.connect(lfoGain)
  lfoGain.connect(delayNode.delayTime)

  const dryGain = ctx.createGain()
  dryGain.gain.value = 1 - mix
  const wetGain = ctx.createGain()
  wetGain.gain.value = mix

  source.connect(dryGain)
  source.connect(delayNode)
  delayNode.connect(wetGain)
  dryGain.connect(ctx.destination)
  wetGain.connect(ctx.destination)
  lfo.start()
  source.start()
  return await ctx.startRendering()
}

export async function applyFlanger(
  buffer: AudioBuffer,
  rate: number = 0.5,
  depth: number = 0.003,
  feedback: number = 0.5,
  mix: number = 0.5
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const delayNode = ctx.createDelay(0.05)
  delayNode.delayTime.value = 0.003
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rate
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = depth
  lfo.connect(lfoGain)
  lfoGain.connect(delayNode.delayTime)

  const feedbackGain = ctx.createGain()
  feedbackGain.gain.value = feedback
  const dryGain = ctx.createGain()
  dryGain.gain.value = 1 - mix
  const wetGain = ctx.createGain()
  wetGain.gain.value = mix

  source.connect(dryGain)
  source.connect(delayNode)
  delayNode.connect(feedbackGain)
  feedbackGain.connect(delayNode)
  delayNode.connect(wetGain)
  dryGain.connect(ctx.destination)
  wetGain.connect(ctx.destination)
  lfo.start()
  source.start()
  return await ctx.startRendering()
}

export async function applyPhaser(
  buffer: AudioBuffer,
  rate: number = 0.5,
  depth: number = 1000,
  feedback: number = 0.5,
  mix: number = 0.5
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const filters: BiquadFilterNode[] = []
  let lastNode: AudioNode = source
  for (let i = 0; i < 4; i++) {
    const filter = ctx.createBiquadFilter()
    filter.type = 'allpass'
    filter.frequency.value = 1000
    filter.Q.value = 5
    lastNode.connect(filter)
    lastNode = filter
    filters.push(filter)
  }

  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rate
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = depth
  lfo.connect(lfoGain)
  for (const filter of filters) {
    lfoGain.connect(filter.frequency)
  }

  const feedbackGain = ctx.createGain()
  feedbackGain.gain.value = feedback
  lastNode.connect(feedbackGain)
  feedbackGain.connect(source)

  const dryGain = ctx.createGain()
  dryGain.gain.value = 1 - mix
  const wetGain = ctx.createGain()
  wetGain.gain.value = mix

  source.connect(dryGain)
  lastNode.connect(wetGain)
  dryGain.connect(ctx.destination)
  wetGain.connect(ctx.destination)
  lfo.start()
  source.start()
  return await ctx.startRendering()
}

export function applyDistortion(buffer: AudioBuffer, amount: number = 50, tone: number = 0.5): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const k = amount

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    for (let i = 0; i < input.length; i++) {
      const x = input[i]
      const distorted = ((1 + k) * x) / (1 + k * Math.abs(x))
      output[i] = distorted * tone + x * (1 - tone)
    }
  }
  return newBuffer
}

export function applyPitchShift(buffer: AudioBuffer, semitones: number): AudioBuffer {
  const ratio = Math.pow(2, semitones / 12)
  const newLength = Math.round(buffer.length / ratio)
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, newLength, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    const grainSize = 1024
    const overlap = grainSize / 2

    for (let i = 0; i < newLength; i++) {
      const srcPos = i * ratio
      const srcIdx = Math.floor(srcPos)
      const frac = srcPos - srcIdx

      if (srcIdx + 1 < input.length) {
        output[i] = input[srcIdx] * (1 - frac) + input[srcIdx + 1] * frac
      } else if (srcIdx < input.length) {
        output[i] = input[srcIdx]
      }
    }
  }
  return newBuffer
}

export function applyTimeStretch(buffer: AudioBuffer, ratio: number): AudioBuffer {
  const newLength = Math.round(buffer.length * ratio)
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, newLength, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)

    for (let i = 0; i < newLength; i++) {
      const srcPos = i / ratio
      const srcIdx = Math.floor(srcPos)
      const frac = srcPos - srcIdx

      if (srcIdx + 1 < input.length) {
        output[i] = input[srcIdx] * (1 - frac) + input[srcIdx + 1] * frac
      } else if (srcIdx < input.length) {
        output[i] = input[srcIdx]
      }
    }
  }
  return newBuffer
}

export function applyNoiseGate(
  buffer: AudioBuffer,
  threshold: number = -40,
  attack: number = 0.01,
  release: number = 0.1
): AudioBuffer {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const thresholdLin = Math.pow(10, threshold / 20)
  const attackSamples = Math.floor(attack * buffer.sampleRate)
  const releaseSamples = Math.floor(release * buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)
    let gateOpen = false
    let envelope = 0

    for (let i = 0; i < input.length; i++) {
      const abs = Math.abs(input[i])
      if (abs > thresholdLin) {
        gateOpen = true
      } else if (gateOpen) {
        let sustained = false
        for (let j = i; j < Math.min(i + releaseSamples, input.length); j++) {
          if (Math.abs(input[j]) > thresholdLin) {
            sustained = true
            break
          }
        }
        if (!sustained) gateOpen = false
      }

      if (gateOpen) {
        envelope = Math.min(1, envelope + 1 / Math.max(1, attackSamples))
      } else {
        envelope = Math.max(0, envelope - 1 / Math.max(1, releaseSamples))
      }
      output[i] = input[i] * envelope
    }
  }
  return newBuffer
}

export function applySpeedChange(buffer: AudioBuffer, speed: number): AudioBuffer {
  const newLength = Math.round(buffer.length / speed)
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, newLength, buffer.sampleRate * speed)
  const newBuffer = ctx.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate)

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const input = buffer.getChannelData(ch)
    const output = newBuffer.getChannelData(ch)

    for (let i = 0; i < newLength; i++) {
      const srcPos = i * speed
      const srcIdx = Math.floor(srcPos)
      const frac = srcPos - srcIdx

      if (srcIdx + 1 < input.length) {
        output[i] = input[srcIdx] * (1 - frac) + input[srcIdx + 1] * frac
      } else if (srcIdx < input.length) {
        output[i] = input[srcIdx]
      }
    }
  }
  return newBuffer
}

export async function applyTremolo(
  buffer: AudioBuffer,
  rate: number = 5,
  depth: number = 0.5
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rate
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = depth
  const depthOffset = ctx.createGain()
  depthOffset.gain.value = 1 - depth

  lfo.connect(lfoGain)
  lfoGain.connect(depthOffset.gain)

  source.connect(depthOffset)
  depthOffset.connect(ctx.destination)
  lfo.start()
  source.start()
  return await ctx.startRendering()
}

export async function applyVibrato(
  buffer: AudioBuffer,
  rate: number = 5,
  depth: number = 0.003
): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate)
  const source = ctx.createBufferSource()
  source.buffer = buffer

  const delayNode = ctx.createDelay(0.05)
  delayNode.delayTime.value = 0.005
  const lfo = ctx.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = rate
  const lfoGain = ctx.createGain()
  lfoGain.gain.value = depth
  lfo.connect(lfoGain)
  lfoGain.connect(delayNode.delayTime)

  source.connect(delayNode)
  delayNode.connect(ctx.destination)
  lfo.start()
  source.start()
  return await ctx.startRendering()
}

export async function generateDTMF(
  digits: string,
  durationSeconds: number = 0.1,
  sampleRate: number = 44100
): Promise<AudioBuffer> {
  const dtmfFreqs: Record<string, [number, number]> = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
  }

  const digitDuration = Math.floor(sampleRate * durationSeconds)
  const pauseDuration = Math.floor(sampleRate * 0.05)
  const totalLength = digits.length * (digitDuration + pauseDuration)
  const ctx = new OfflineAudioContext(1, totalLength, sampleRate)
  const buffer = ctx.createBuffer(1, totalLength, sampleRate)
  const data = buffer.getChannelData(0)

  let offset = 0
  for (const digit of digits) {
    const freqs = dtmfFreqs[digit]
    if (!freqs) continue
    for (let i = 0; i < digitDuration; i++) {
      const t = i / sampleRate
      data[offset + i] = 0.5 * (Math.sin(2 * Math.PI * freqs[0] * t) + Math.sin(2 * Math.PI * freqs[1] * t)) * 0.5
    }
    offset += digitDuration + pauseDuration
  }

  return buffer
}

export { aiVoiceSeparation as applyVoiceRemoval } from '../ai/VoiceSeparation'
export type { AIProgressCallback } from '../ai/VoiceSeparation'

export async function generateSweep(
  startFreq: number = 20,
  endFreq: number = 20000,
  durationSeconds: number = 3,
  sampleRate: number = 44100,
  amplitude: number = 0.8
): Promise<AudioBuffer> {
  const length = Math.floor(sampleRate * durationSeconds)
  const ctx = new OfflineAudioContext(1, length, sampleRate)
  const buffer = ctx.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)

  let currentPhase = 0
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate
    const progress = t / durationSeconds
    const freq = startFreq * Math.pow(endFreq / startFreq, progress)
    currentPhase += (2 * Math.PI * freq) / sampleRate
    data[i] = amplitude * Math.sin(currentPhase)
  }

  return buffer
}
