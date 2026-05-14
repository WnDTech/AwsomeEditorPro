# Awsome Editor Pro

Professional desktop audio editor built with Electron, React, TypeScript, and the Web Audio API.

![Version](https://img.shields.io/badge/version-1.0.0-blue)

## Features

### File Operations
- Open multiple audio files simultaneously (**WAV, MP3, OGG, FLAC, AIFF, AAC**)
- Save / Save As / Export as 16-bit WAV
- Native OS file dialogs via Electron IPC

### Playback Engine
- Multi-track synchronized playback with per-track gain and stereo pan
- Master volume control and real-time level metering (L/R)
- Solo/Mute logic with automatic track routing
- Loop playback support

### Audio Recording
- Record from microphone via `getUserMedia`
- WebM/Opus capture with auto-track creation

### 21 Audio Effects
Apply to a selected region or the entire track:

| Category | Effects |
|----------|---------|
| **Volume & Dynamics** | Amplify, Normalize, Compressor, Noise Gate |
| **Time & Pitch** | Pitch Shift, Time Stretch, Speed Change |
| **Modulation** | Chorus, Flanger, Phaser, Tremolo, Vibrato |
| **Delay & Reverb** | Delay/Echo, Reverb |
| **Distortion** | Distortion |
| **Fades & Utility** | Fade In, Fade Out, Invert, Reverse |
| **Equalizer** | 5-Band EQ (60Hz, 250Hz, 1kHz, 4kHz, 12kHz) |

### Audio Generation
Generate **Silence, Tones, White Noise, DTMF Tones**, and **Frequency Sweeps** with configurable parameters.

### Editing
- Copy / Cut / Paste / Delete with `AudioBuffer` clipboard
- **Mix Paste** — Insert, Overwrite, or Mix modes with volume, fade, and loop options
- **Crossfade** — Linear, Equal Power, or S-Curve fade curves
- Split at Cursor, Duplicate, Trim to Selection
- **Undo/Redo** — Up to 50 levels

### Multi-Track System
- Add, remove, rename, and color-code tracks
- Per-track volume (0–200%) and pan (L100–R100)
- Mute/Solo per track
- **Mix Down** all tracks into a single stereo track

### Channel Mixer
- Stereo ↔ Mono conversion
- Swap Channels
- Extract Left / Right channel

### Resample
- Resample to any target rate (presets: 22050 – 192000 Hz)
- Linear interpolation with before/after duration preview

### Analysis Tools
- **Frequency Analysis** — FFT spectrum analyzer (4096-point, Hann window, averaged)
- **Audio Statistics** — Peak amplitude, RMS, DC offset, dynamic range, zero crossings, estimated fundamental frequency, crest factor, and more

### Markers
- Add markers at cursor position with visual pins on the timeline

### View Modes
- **Waveform** — Min/max envelope with gradient fill
- **Spectral** — FFT-based spectrogram with color-mapped magnitude
- **Split** — Waveform + Spectral combined

### Zoom & Navigation
- Zoom in/out (slider + buttons), Zoom to Selection, Fit to Window
- Auto-scroll during playback with cursor lookahead
- Transport controls: Skip to Start/End, Rewind/Forward ±5s

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy |
| `Ctrl+X` | Cut |
| `Ctrl+V` | Paste |
| `Ctrl+A` | Select All |
| `Delete` | Delete selection |
| `B` | Split at cursor |
| `D` | Duplicate |
| `M` | Add marker |
| `Home` | Go to start |
| `Ctrl+N` | New project |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+E` | Export |

## Tech Stack

- **Electron** — Desktop shell with frameless window
- **React 18** — UI components
- **TypeScript** — Type-safe codebase
- **Zustand** — State management
- **Web Audio API** — Audio engine, effects, and analysis
- **Vite** — Build tooling
- **Tailwind CSS** — Styling

## Getting Started

### Prerequisites
- Node.js >= 18
- npm

### Install
```bash
npm install
```

### Development
```bash
npm run dev          # Vite dev server
npm run electron:dev # Electron + Vite dev
```

### Build
```bash
npm run electron:build
```

Output binaries are placed in `release/` (NSIS installer + Portable for Windows x64).

## Project Structure

```
├── electron/          # Electron main & preload scripts
├── src/
│   ├── audio/         # AudioEngine, AudioEffects, AudioFileIO
│   ├── components/    # React UI components
│   ├── hooks/         # useAudioEngine hook
│   ├── store/         # Zustand state store
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Helper functions
├── resources/         # App icons
└── scripts/           # Build scripts
```

## License

All rights reserved.
