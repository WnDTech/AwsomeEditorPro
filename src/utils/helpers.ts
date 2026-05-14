const defaultTrackColors = [
  '#6366f1', '#22d3ee', '#f472b6', '#a78bfa',
  '#34d399', '#fbbf24', '#fb923c', '#f87171',
]

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36)
}

export function getNextTrackColor(existingTracks: { color: string }[]): string {
  const usedColors = existingTracks.map(t => t.color)
  const available = defaultTrackColors.filter(c => !usedColors.includes(c))
  return available.length > 0 ? available[0] : defaultTrackColors[Math.floor(Math.random() * defaultTrackColors.length)]
}

export function formatTime(seconds: number, sampleRate: number = 44100): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`
}

export function formatSamples(samples: number, sampleRate: number = 44100): string {
  return samples.toLocaleString() + ` (${formatTime(samples / sampleRate, sampleRate)})`
}

export function samplesToPixels(samples: number, zoom: number, sampleRate: number): number {
  return (samples / sampleRate) * zoom
}

export function pixelsToSamples(pixels: number, zoom: number, sampleRate: number): number {
  return (pixels / zoom) * sampleRate
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function linearToDecibel(linear: number): number {
  if (linear <= 0) return -Infinity
  return 20 * Math.log10(linear)
}

export function decibelToLinear(db: number): number {
  return Math.pow(10, db / 20)
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
