export class AudioEngine {
  private context: AudioContext
  private masterGain: GainNode
  private analyser: AnalyserNode
  private sourceNodes: Map<string, AudioBufferSourceNode> = new Map()
  private trackGains: Map<string, GainNode> = new Map()
  private trackPanners: Map<string, StereoPannerNode> = new Map()
  private trackVolumes: Map<string, number> = new Map()
  private isPlaying = false
  private isRecording = false
  private startOffset = 0
  private startTime = 0
  private mediaStreamDest: MediaStreamAudioDestinationNode | null = null
  private mediaRecorder: MediaRecorder | null = null
  private recordedChunks: Blob[] = []
  private animFrameId: number | null = null
  private onPositionChange: ((position: number) => void) | null = null
  private onLevelChange: ((levels: { left: number; right: number }) => void) | null = null
  private micStream: MediaStream | null = null
  private micSource: MediaStreamAudioSourceNode | null = null
  private micProcessor: ScriptProcessorNode | null = null
  private micRecordedChunks: Blob[] = []
  private micRecorder: MediaRecorder | null = null

  constructor() {
    this.context = new AudioContext({ sampleRate: 44100 })
    this.masterGain = this.context.createGain()
    this.analyser = this.context.createAnalyser()
    this.analyser.fftSize = 2048
    this.masterGain.connect(this.analyser)
    this.analyser.connect(this.context.destination)
  }

  get sampleRate(): number {
    return this.context.sampleRate
  }

  get currentTime(): number {
    return this.context.currentTime
  }

  getAudioContext(): AudioContext {
    return this.context
  }

  setPositionCallback(cb: (position: number) => void) {
    this.onPositionChange = cb
  }

  setLevelCallback(cb: (levels: { left: number; right: number }) => void) {
    this.onLevelChange = cb
  }

  async decodeAudio(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
    return this.context.decodeAudioData(arrayBuffer)
  }

  createTrackNodes(trackId: string, volume: number = 1, pan: number = 0) {
    const gain = this.context.createGain()
    gain.gain.value = volume
    const panner = this.context.createStereoPanner()
    panner.pan.value = pan
    gain.connect(panner)
    panner.connect(this.masterGain)
    this.trackGains.set(trackId, gain)
    this.trackPanners.set(trackId, panner)
    this.trackVolumes.set(trackId, volume)
    return { gain, panner }
  }

  removeTrackNodes(trackId: string) {
    const source = this.sourceNodes.get(trackId)
    if (source) {
      try { source.stop() } catch {}
      source.disconnect()
      this.sourceNodes.delete(trackId)
    }
    const gain = this.trackGains.get(trackId)
    if (gain) {
      gain.disconnect()
      this.trackGains.delete(trackId)
    }
    const panner = this.trackPanners.get(trackId)
    if (panner) {
      panner.disconnect()
      this.trackPanners.delete(trackId)
    }
    this.trackVolumes.delete(trackId)
  }

  setTrackVolume(trackId: string, volume: number) {
    this.trackVolumes.set(trackId, volume)
    const gain = this.trackGains.get(trackId)
    if (gain) gain.gain.value = volume
  }

  setTrackPan(trackId: string, pan: number) {
    const panner = this.trackPanners.get(trackId)
    if (panner) panner.pan.value = pan
  }

  setMasterVolume(volume: number) {
    this.masterGain.gain.value = volume
  }

  updateTrackStates(tracks: { id: string; muted: boolean; solo: boolean; volume: number }[]) {
    const hasSolo = tracks.some(t => t.solo)
    for (const track of tracks) {
      const gain = this.trackGains.get(track.id)
      if (!gain) continue
      const vol = this.trackVolumes.get(track.id) ?? track.volume
      if (hasSolo) {
        gain.gain.value = track.solo ? vol : 0
      } else {
        gain.gain.value = track.muted ? 0 : vol
      }
    }
  }

  play(tracks: { id: string; buffer: AudioBuffer | null; muted: boolean; solo: boolean; volume: number; pan: number }[], offset: number = 0) {
    this.stopAll()
    if (this.context.state === 'suspended') {
      this.context.resume()
    }

    const hasSolo = tracks.some(t => t.solo)
    this.startOffset = offset
    this.startTime = this.context.currentTime
    this.isPlaying = true

    for (const track of tracks) {
      if (!track.buffer) continue
      if (track.muted) continue
      if (hasSolo && !track.solo) continue

      this.createTrackNodes(track.id, track.volume, track.pan)
      const source = this.context.createBufferSource()
      source.buffer = track.buffer

      const gain = this.trackGains.get(track.id)!
      source.connect(gain)

      const startOffset = Math.max(0, offset)
      source.start(0, startOffset)
      this.sourceNodes.set(track.id, source)
    }

    this.startPositionUpdates()
  }

  stopAll() {
    for (const [id, source] of this.sourceNodes) {
      try { source.stop() } catch {}
      source.disconnect()
      this.removeTrackNodes(id)
    }
    this.sourceNodes.clear()
    this.isPlaying = false
    this.stopPositionUpdates()
  }

  pause() {
    if (this.isPlaying) {
      this.startOffset = this.getCurrentPosition()
      this.stopAll()
    }
  }

  getCurrentPosition(): number {
    if (!this.isPlaying) return this.startOffset
    return this.startOffset + (this.context.currentTime - this.startTime)
  }

  private startPositionUpdates() {
    const update = () => {
      if (!this.isPlaying) return
      const position = this.getCurrentPosition()
      this.onPositionChange?.(position)
      this.updateLevels()
      this.animFrameId = requestAnimationFrame(update)
    }
    this.animFrameId = requestAnimationFrame(update)
  }

  private stopPositionUpdates() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
  }

  private updateLevels() {
    if (!this.onLevelChange) return
    const data = new Float32Array(this.analyser.fftSize)
    this.analyser.getFloatTimeDomainData(data)
    let peak = 0
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i])
      if (abs > peak) peak = abs
    }
    this.onLevelChange({ left: peak, right: peak })
  }

  async startMicRecording(): Promise<void> {
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
    })

    this.micSource = this.context.createMediaStreamSource(this.micStream)

    const dest = this.context.createMediaStreamDestination()
    this.micSource.connect(dest)

    this.micRecordedChunks = []
    this.micRecorder = new MediaRecorder(dest.stream, {
      mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
    })

    this.micRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.micRecordedChunks.push(e.data)
    }

    this.micRecorder.start(100)
    this.isRecording = true
  }

  async stopMicRecording(): Promise<AudioBuffer | null> {
    if (!this.micRecorder || !this.isRecording) return null

    return new Promise((resolve) => {
      this.micRecorder!.onstop = async () => {
        if (this.micSource) {
          this.micSource.disconnect()
          this.micSource = null
        }
        if (this.micStream) {
          this.micStream.getTracks().forEach(t => t.stop())
          this.micStream = null
        }

        if (this.micRecordedChunks.length === 0) {
          resolve(null)
          return
        }

        const blob = new Blob(this.micRecordedChunks, { type: 'audio/webm' })
        try {
          const arrayBuffer = await blob.arrayBuffer()
          const buffer = await this.context.decodeAudioData(arrayBuffer)
          resolve(buffer)
        } catch {
          resolve(null)
        }
      }
      this.micRecorder!.stop()
      this.isRecording = false
    })
  }

  getAnalyserData(): Float32Array {
    const data = new Float32Array(this.analyser.frequencyBinCount)
    this.analyser.getFloatTimeDomainData(data)
    return data
  }

  getFrequencyData(): Uint8Array {
    const data = new Uint8Array(this.analyser.frequencyBinCount)
    this.analyser.getByteFrequencyData(data)
    return data
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }

  getIsRecording(): boolean {
    return this.isRecording
  }

  destroy() {
    this.stopAll()
    this.context.close()
  }
}

export const audioEngine = new AudioEngine()
