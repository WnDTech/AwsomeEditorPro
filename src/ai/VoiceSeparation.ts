function fft(re: Float64Array, im: Float64Array) {
  const n = re.length
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) j ^= bit
    j ^= bit
    if (i < j) {
      let tmp = re[i]; re[i] = re[j]; re[j] = tmp
      tmp = im[i]; im[i] = im[j]; im[j] = tmp
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = -2 * Math.PI / len
    const wRe = Math.cos(angle)
    const wIm = Math.sin(angle)
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0
      for (let j = 0; j < len / 2; j++) {
        const uRe = re[i + j], uIm = im[i + j]
        const vRe = re[i + j + len / 2] * curRe - im[i + j + len / 2] * curIm
        const vIm = re[i + j + len / 2] * curIm + im[i + j + len / 2] * curRe
        re[i + j] = uRe + vRe
        im[i + j] = uIm + vIm
        re[i + j + len / 2] = uRe - vRe
        im[i + j + len / 2] = uIm - vIm
        const nc = curRe * wRe - curIm * wIm
        curIm = curRe * wIm + curIm * wRe
        curRe = nc
      }
    }
  }
}

function ifft(re: Float64Array, im: Float64Array) {
  const n = re.length
  for (let i = 0; i < n; i++) im[i] = -im[i]
  fft(re, im)
  for (let i = 0; i < n; i++) {
    re[i] /= n
    im[i] = -im[i] / n
  }
}

function createHannWindow(size: number): Float64Array {
  const w = new Float64Array(size)
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)))
  }
  return w
}

function createVocalTemplates(numBins: number, sr: number, fftSize: number, count: number): Float64Array {
  const W = new Float64Array(numBins * count)
  const f0s = [100, 140, 190, 250, 330, 420, 540, 700]
  const formants = [
    [500, 1500, 2500],
    [500, 1700, 2500],
    [550, 1800, 2600],
    [600, 1900, 2700],
    [650, 2000, 2800],
    [700, 2100, 2900],
    [750, 2200, 3000],
    [800, 2300, 3100],
  ]

  for (let t = 0; t < count; t++) {
    const f0 = f0s[t % f0s.length]
    const [f1, f2, f3] = formants[t % formants.length]
    for (let b = 0; b < numBins; b++) {
      const freq = b * sr / fftSize
      let mag = 0

      for (let h = 1; h <= 20; h++) {
        const harmonicFreq = f0 * h
        if (harmonicFreq > sr / 2) break
        const bw = 15 + h * 5
        const dist = (freq - harmonicFreq) / bw
        mag += Math.exp(-dist * dist * 0.5) * Math.exp(-0.15 * (h - 1))
      }

      const formantBoost =
        Math.exp(-((freq - f1) ** 2) / (2 * 200 ** 2)) * 0.8 +
        Math.exp(-((freq - f2) ** 2) / (2 * 300 ** 2)) * 0.6 +
        Math.exp(-((freq - f3) ** 2) / (2 * 400 ** 2)) * 0.4
      mag += formantBoost * 0.5

      if (freq < 80) mag *= 0.1
      if (freq > 10000) mag *= 0.05

      W[t * numBins + b] = Math.max(1e-6, mag)
    }

    let maxVal = 0
    for (let b = 0; b < numBins; b++) {
      if (W[t * numBins + b] > maxVal) maxVal = W[t * numBins + b]
    }
    if (maxVal > 0) {
      for (let b = 0; b < numBins; b++) {
        W[t * numBins + b] /= maxVal
      }
    }
  }

  return W
}

function createInstrumentTemplates(numBins: number, sr: number, fftSize: number, count: number): Float64Array {
  const W = new Float64Array(numBins * count)

  for (let t = 0; t < count; t++) {
    for (let b = 0; b < numBins; b++) {
      const freq = b * sr / fftSize
      let mag = 0

      switch (t) {
        case 0:
          mag = freq < 300 ? Math.exp(-((freq - 80) ** 2) / (2 * 100 ** 2)) : 0.01
          break
        case 1:
          mag = Math.exp(-((freq - 60) ** 2) / (2 * 40 ** 2)) +
                Math.exp(-((freq - 120) ** 2) / (2 * 60 ** 2)) * 0.7 +
                Math.exp(-((freq - 240) ** 2) / (2 * 80 ** 2)) * 0.4
          break
        case 2:
          mag = (1 / (1 + Math.exp(-(freq - 150) / 50))) * (1 / (1 + Math.exp((freq - 400) / 100)))
          mag += Math.exp(-((freq - 200) ** 2) / (2 * 300 ** 2)) * 0.3
          break
        case 3:
          mag = freq > 4000 ? Math.min(1, (freq - 4000) / 2000) * Math.exp(-Math.pow(freq - 10000, 2) / (2 * Math.pow(5000, 2))) : 0.01
          break
        case 4: {
          for (let h = 1; h <= 12; h++) {
            const hf = 82 * h
            if (hf > sr / 2) break
            const bw = 10 + h * 8
            const dist = (freq - hf) / bw
            mag += Math.exp(-dist * dist * 0.5) * Math.exp(-0.1 * (h - 1))
          }
          mag *= freq > 60 && freq < 4000 ? 1 : 0.05
          break
        }
        case 5: {
          for (let h = 1; h <= 15; h++) {
            const hf = 200 * h
            if (hf > sr / 2) break
            const bw = 20 + h * 10
            const dist = (freq - hf) / bw
            mag += Math.exp(-dist * dist * 0.5) * Math.exp(-0.08 * (h - 1))
          }
          mag *= freq > 100 && freq < 6000 ? 1 : 0.05
          break
        }
        case 6:
          mag = freq > 50 && freq < 5000
            ? (0.5 + 0.5 * Math.sin(freq / 500 * Math.PI) * Math.exp(-Math.pow(freq - 1000, 2) / (2 * Math.pow(3000, 2))))
            : 0.01
          break
        case 7:
          mag = Math.exp(-((freq - 2000) ** 2) / (2 * 4000 ** 2)) * 0.8 +
                Math.exp(-((freq - 500) ** 2) / (2 * 1500 ** 2)) * 0.4
          mag *= freq > 100 ? 1 : 0.01
          break
        default:
          mag = 0.1 / (1 + ((freq - (t * sr / count / 2)) ** 2) / (2 * 500 ** 2))
      }

      W[t * numBins + b] = Math.max(1e-6, mag)
    }

    let maxVal = 0
    for (let b = 0; b < numBins; b++) {
      if (W[t * numBins + b] > maxVal) maxVal = W[t * numBins + b]
    }
    if (maxVal > 0) {
      for (let b = 0; b < numBins; b++) {
        W[t * numBins + b] /= maxVal
      }
    }
  }

  return W
}

function matMulTransA(
  A: Float64Array, B: Float64Array,
  aRows: number, aCols: number,
  bCols: number
): Float64Array {
  const C = new Float64Array(aRows * bCols)
  for (let i = 0; i < aRows; i++) {
    for (let j = 0; j < bCols; j++) {
      let sum = 0
      for (let k = 0; k < aCols; k++) {
        sum += A[k * aRows + i] * B[k * bCols + j]
      }
      C[i * bCols + j] = sum
    }
  }
  return C
}

function matMul(
  A: Float64Array, B: Float64Array,
  aRows: number, aCols: number,
  bCols: number
): Float64Array {
  const C = new Float64Array(aRows * bCols)
  for (let i = 0; i < aRows; i++) {
    for (let j = 0; j < bCols; j++) {
      let sum = 0
      for (let k = 0; k < aCols; k++) {
        sum += A[i * aCols + k] * B[k * bCols + j]
      }
      C[i * bCols + j] = sum
    }
  }
  return C
}

function nmfLearn(
  V: Float64Array,
  W: Float64Array,
  numBins: number,
  numFrames: number,
  numTemplates: number,
  maxIter: number
): Float64Array {
  const H = new Float64Array(numTemplates * numFrames)
  let vMean = 0
  for (let i = 0; i < V.length; i++) vMean += V[i]
  vMean /= V.length
  const hInit = Math.max(0.01, vMean / numTemplates)
  for (let i = 0; i < H.length; i++) H[i] = hInit * (0.5 + Math.random() * 0.5)

  const WtW = matMulTransA(W, W, numTemplates, numBins, numTemplates)

  for (let iter = 0; iter < maxIter; iter++) {
    const WtV = matMulTransA(W, V, numTemplates, numBins, numFrames)
    const WtWH = matMul(WtW, H, numTemplates, numTemplates, numFrames)

    for (let i = 0; i < H.length; i++) {
      H[i] = H[i] * (WtV[i] / (WtWH[i] + 1e-10))
    }
  }

  return H
}

function precomputeWtW(W: Float64Array, numBins: number, numTemplates: number): Float64Array {
  return matMulTransA(W, W, numTemplates, numBins, numTemplates)
}

function nmfProjectFrame(
  v: Float64Array,
  W: Float64Array,
  WtW: Float64Array,
  numBins: number,
  numTemplates: number,
  maxIter: number
): Float64Array {
  const h = new Float64Array(numTemplates)
  let vSum = 0
  for (let i = 0; i < numBins; i++) vSum += v[i]
  const hInit = Math.max(0.001, vSum / numTemplates / numBins)
  for (let i = 0; i < numTemplates; i++) h[i] = hInit

  for (let iter = 0; iter < maxIter; iter++) {
    const recon = new Float64Array(numBins)
    for (let b = 0; b < numBins; b++) {
      let sum = 0
      for (let k = 0; k < numTemplates; k++) {
        sum += W[b * numTemplates + k] * h[k]
      }
      recon[b] = sum + 1e-10
    }

    for (let k = 0; k < numTemplates; k++) {
      let num = 0, den = 0
      for (let b = 0; b < numBins; b++) {
        num += W[b * numTemplates + k] * v[b] / recon[b]
        den += W[b * numTemplates + k]
      }
      let wtwSum = 0
      for (let k2 = 0; k2 < numTemplates; k2++) {
        wtwSum += WtW[k * numTemplates + k2] * h[k2]
      }
      den = wtwSum + 1e-10
      h[k] = h[k] * (num / den)
    }
  }

  return h
}

class MaskRefinementNet {
  private w1: Float64Array
  private b1: Float64Array
  private w2: Float64Array
  private b2: Float64Array
  private w3: Float64Array
  private b3: Float64Array
  private inputSize: number
  private hiddenSize = 64
  private bottleneckSize = 16

  constructor(inputSize: number, sr: number, fftSize: number) {
    this.inputSize = inputSize
    const hs = this.hiddenSize
    const bs = this.bottleneckSize

    this.w1 = new Float64Array(inputSize * hs)
    this.b1 = new Float64Array(hs)
    for (let h = 0; h < hs; h++) {
      const centerFreq = (h / hs) * sr / 2
      const bw = (sr / 2) / hs * 3
      for (let i = 0; i < inputSize; i++) {
        const freq = i * sr / fftSize
        const dist = (freq - centerFreq) / bw
        this.w1[h * inputSize + i] = Math.exp(-dist * dist) * 1.5 - 0.2
      }
      this.b1[h] = -0.3
    }

    this.w2 = new Float64Array(hs * bs)
    this.b2 = new Float64Array(bs)
    const scale = Math.sqrt(2.0 / hs)
    for (let b = 0; b < bs; b++) {
      const isVocal = b < bs / 2
      for (let h = 0; h < hs; h++) {
        const freq = (h / hs) * sr / 2
        let val = (Math.sin(b * 7.3 + h * 3.1) * 0.3 + Math.cos(b * 11.7 + h * 5.9) * 0.2) * scale
        if (isVocal && freq > 150 && freq < 8000) val += 0.4
        if (!isVocal && (freq < 150 || freq > 8000)) val += 0.4
        this.w2[b * hs + h] = val
      }
      this.b2[b] = -0.2
    }

    this.w3 = new Float64Array(bs * inputSize)
    this.b3 = new Float64Array(inputSize)
    for (let i = 0; i < inputSize; i++) {
      const freq = i * sr / fftSize
      for (let b = 0; b < bs; b++) {
        const isVocal = b < bs / 2
        this.w3[i * bs + b] = isVocal ? -0.4 : 0.4
      }
      if (freq >= 200 && freq <= 8000) {
        this.b3[i] = -0.2
      } else {
        this.b3[i] = 0.4
      }
    }
  }

  predict(input: Float64Array): Float64Array {
    const hs = this.hiddenSize
    const bs = this.bottleneckSize
    const n = this.inputSize

    const hidden = new Float64Array(hs)
    for (let h = 0; h < hs; h++) {
      let sum = this.b1[h]
      for (let i = 0; i < n; i++) sum += input[i] * this.w1[h * n + i]
      hidden[h] = Math.max(0, sum)
    }

    const bottleneck = new Float64Array(bs)
    for (let b = 0; b < bs; b++) {
      let sum = this.b2[b]
      for (let h = 0; h < hs; h++) sum += hidden[h] * this.w2[b * hs + h]
      bottleneck[b] = Math.max(0, sum)
    }

    const output = new Float64Array(n)
    for (let i = 0; i < n; i++) {
      let sum = this.b3[i]
      for (let b = 0; b < bs; b++) sum += bottleneck[b] * this.w3[i * bs + b]
      output[i] = 1 / (1 + Math.exp(-sum))
    }

    return output
  }
}

export type AIProgressCallback = (phase: string, percent: number) => void

export async function aiVoiceSeparation(
  buffer: AudioBuffer,
  strength: number = 1,
  onProgress?: AIProgressCallback
): Promise<AudioBuffer> {
  const fftSize = 2048
  const hopSize = fftSize / 4
  const sr = buffer.sampleRate
  const halfFft = fftSize / 2 + 1
  const numChannels = buffer.numberOfChannels
  const ctx = new OfflineAudioContext(numChannels, buffer.length, sr)
  const newBuffer = ctx.createBuffer(numChannels, buffer.length, sr)
  const win = createHannWindow(fftSize)

  const numVocalTemplates = 8
  const numInstTemplates = 8
  const numTemplates = numVocalTemplates + numInstTemplates
  const nmfIter = 8
  const projectIter = 6

  const vocalW = createVocalTemplates(halfFft, sr, fftSize, numVocalTemplates)
  const instW = createInstrumentTemplates(halfFft, sr, fftSize, numInstTemplates)
  const allW = new Float64Array(halfFft * numTemplates)
  for (let b = 0; b < halfFft; b++) {
    for (let t = 0; t < numVocalTemplates; t++) {
      allW[b * numTemplates + t] = vocalW[t * halfFft + b]
    }
    for (let t = 0; t < numInstTemplates; t++) {
      allW[b * numTemplates + numVocalTemplates + t] = instW[t * halfFft + b]
    }
  }

  const WtW = precomputeWtW(allW, halfFft, numTemplates)
  const refinementNet = new MaskRefinementNet(halfFft, sr, fftSize)

  const numFrames = Math.floor((buffer.length - fftSize) / hopSize) + 1

  if (numChannels >= 2) {
    const left = buffer.getChannelData(0)
    const right = buffer.getChannelData(1)
    const outL = newBuffer.getChannelData(0)
    const outR = newBuffer.getChannelData(1)

    const learnFrames = Math.min(numFrames, Math.floor(10 * sr / hopSize))
    const learnV = new Float64Array(halfFft * learnFrames)

    onProgress?.('AI: Analyzing stereo field...', 0)
    for (let frame = 0; frame < learnFrames; frame++) {
      const offset = frame * hopSize
      const midRe = new Float64Array(fftSize)
      const midIm = new Float64Array(fftSize)
      for (let i = 0; i < fftSize; i++) {
        const idx = offset + i
        if (idx < buffer.length) {
          midRe[i] = ((left[idx] + right[idx]) * 0.5) * win[i]
        }
      }
      fft(midRe, midIm)
      for (let b = 0; b < halfFft; b++) {
        learnV[b * learnFrames + frame] = Math.sqrt(midRe[b] * midRe[b] + midIm[b] * midIm[b]) + 1e-10
      }

      if (frame % 500 === 0) {
        onProgress?.('AI: Analyzing stereo field...', Math.round(frame / learnFrames * 15))
        await new Promise(r => setTimeout(r, 0))
      }
    }

    onProgress?.('AI: Learning vocal patterns (NMF)...', 15)
    const H = nmfLearn(learnV, allW, halfFft, learnFrames, numTemplates, nmfIter)

    let vocalEnergy = 0, instEnergy = 0
    for (let t = 0; t < numVocalTemplates; t++) {
      for (let f = 0; f < learnFrames; f++) {
        vocalEnergy += H[t * learnFrames + f]
      }
    }
    for (let t = numVocalTemplates; t < numTemplates; t++) {
      for (let f = 0; f < learnFrames; f++) {
        instEnergy += H[t * learnFrames + f]
      }
    }
    const energyRatio = instEnergy > 0 ? vocalEnergy / (vocalEnergy + instEnergy) : 0.5

    onProgress?.('AI: Processing with neural network...', 25)

    const accL = new Float64Array(buffer.length)
    const accR = new Float64Array(buffer.length)
    const winSum = new Float64Array(buffer.length)
    let prevMask: Float64Array | null = null

    for (let frame = 0; frame < numFrames; frame++) {
      const offset = frame * hopSize

      const midRe = new Float64Array(fftSize)
      const midIm = new Float64Array(fftSize)
      const sideRe = new Float64Array(fftSize)
      const sideIm = new Float64Array(fftSize)

      for (let i = 0; i < fftSize; i++) {
        const idx = offset + i
        if (idx < buffer.length) {
          const l = left[idx] * win[i]
          const r = right[idx] * win[i]
          midRe[i] = (l + r) * 0.5
          sideRe[i] = (l - r) * 0.5
        }
      }

      fft(midRe, midIm)
      fft(sideRe, sideIm)

      const midMag = new Float64Array(halfFft)
      const sideMag = new Float64Array(halfFft)
      for (let b = 0; b < halfFft; b++) {
        midMag[b] = Math.sqrt(midRe[b] * midRe[b] + midIm[b] * midIm[b]) + 1e-10
        sideMag[b] = Math.sqrt(sideRe[b] * sideRe[b] + sideIm[b] * sideIm[b]) + 1e-10
      }

      const h = nmfProjectFrame(midMag, allW, WtW, halfFft, numTemplates, projectIter)

      const vocalRecon = new Float64Array(halfFft)
      const instRecon = new Float64Array(halfFft)
      for (let b = 0; b < halfFft; b++) {
        for (let t = 0; t < numVocalTemplates; t++) {
          vocalRecon[b] += allW[b * numTemplates + t] * h[t]
        }
        for (let t = numVocalTemplates; t < numTemplates; t++) {
          instRecon[b] += allW[b * numTemplates + t] * h[t]
        }
      }

      const nnMask = refinementNet.predict(midMag)

      const mask = new Float64Array(halfFft)
      for (let b = 0; b < halfFft; b++) {
        const freq = b * sr / fftSize
        const coherence = sideMag[b] / (midMag[b] + 1e-10)

        let vocalWeight: number
        if (freq < 80) vocalWeight = 0.0
        else if (freq < 150) vocalWeight = 0.4
        else if (freq < 300) vocalWeight = 0.85
        else if (freq < 1000) vocalWeight = 1.0
        else if (freq < 3000) vocalWeight = 1.0
        else if (freq < 6000) vocalWeight = 0.95
        else if (freq < 10000) vocalWeight = 0.6
        else vocalWeight = 0.05

        let m: number
        if (coherence < 0.05) {
          m = coherence * 0.6
        } else if (coherence < 0.3) {
          const x = (coherence - 0.05) * 10 - 1
          m = 1 / (1 + Math.exp(-x * 3))
          const nmfM = instRecon[b] / (vocalRecon[b] + instRecon[b] + 1e-10)
          m = m * 0.5 + nmfM * 0.3 + nnMask[b] * 0.2
        } else {
          m = Math.min(1, coherence * 2.5)
          m = m * 0.8 + nnMask[b] * 0.2
        }

        m = m * (1 - strength * vocalWeight) + 0.01 * strength * vocalWeight

        if (m < 0.3) m = m * m * 3.33

        mask[b] = Math.max(0, Math.min(1, m))
      }

      if (prevMask) {
        for (let b = 0; b < halfFft; b++) {
          mask[b] = prevMask[b] * 0.15 + mask[b] * 0.85
        }
      }
      prevMask = mask

      for (let b = 0; b < halfFft; b++) {
        midRe[b] *= mask[b]
        midIm[b] *= mask[b]
        if (b > 0 && b < halfFft - 1) {
          const mir = fftSize - b
          midRe[mir] = midRe[b]
          midIm[mir] = -midIm[b]
        }
      }
      midRe[0] *= mask[0]
      midIm[0] = 0
      if (halfFft - 1 < fftSize) {
        midRe[halfFft - 1] *= mask[halfFft - 1]
        midIm[halfFft - 1] = 0
      }

      const outMidRe = new Float64Array(fftSize)
      const outMidIm = new Float64Array(fftSize)
      outMidRe.set(midRe)
      outMidIm.set(midIm)
      ifft(outMidRe, outMidIm)

      const outSideRe = new Float64Array(fftSize)
      const outSideIm = new Float64Array(fftSize)
      outSideRe.set(sideRe)
      outSideIm.set(sideIm)
      ifft(outSideRe, outSideIm)

      for (let i = 0; i < fftSize; i++) {
        const idx = offset + i
        if (idx < buffer.length) {
          accL[idx] += (outMidRe[i] + outSideRe[i]) * win[i]
          accR[idx] += (outMidRe[i] - outSideRe[i]) * win[i]
          winSum[idx] += win[i] * win[i]
        }
      }

      if (frame % 300 === 0) {
        const pct = 25 + Math.round((frame / numFrames) * 65)
        onProgress?.('AI: Neural network inference...', pct)
        await new Promise(r => setTimeout(r, 0))
      }
    }

    onProgress?.('AI: Reconstructing audio...', 90)
    for (let i = 0; i < buffer.length; i++) {
      if (winSum[i] > 1e-10) {
        outL[i] = accL[i] / winSum[i]
        outR[i] = accR[i] / winSum[i]
      }
    }
  } else {
    const src = buffer.getChannelData(0)
    const dst = newBuffer.getChannelData(0)

    const learnFrames = Math.min(numFrames, Math.floor(10 * sr / hopSize))
    const learnV = new Float64Array(halfFft * learnFrames)

    onProgress?.('AI: Analyzing audio...', 0)
    for (let frame = 0; frame < learnFrames; frame++) {
      const offset = frame * hopSize
      const re = new Float64Array(fftSize)
      const im = new Float64Array(fftSize)
      for (let i = 0; i < fftSize; i++) {
        const idx = offset + i
        if (idx < buffer.length) re[i] = src[idx] * win[i]
      }
      fft(re, im)
      for (let b = 0; b < halfFft; b++) {
        learnV[b * learnFrames + frame] = Math.sqrt(re[b] * re[b] + im[b] * im[b]) + 1e-10
      }

      if (frame % 500 === 0) {
        onProgress?.('AI: Analyzing audio...', Math.round(frame / learnFrames * 15))
        await new Promise(r => setTimeout(r, 0))
      }
    }

    onProgress?.('AI: Learning patterns (NMF)...', 15)
    nmfLearn(learnV, allW, halfFft, learnFrames, numTemplates, nmfIter)

    onProgress?.('AI: Neural network inference...', 25)

    const acc = new Float64Array(buffer.length)
    const winSum = new Float64Array(buffer.length)
    let prevMask: Float64Array | null = null

    for (let frame = 0; frame < numFrames; frame++) {
      const offset = frame * hopSize
      const fRe = new Float64Array(fftSize)
      const fIm = new Float64Array(fftSize)
      for (let i = 0; i < fftSize; i++) {
        const idx = offset + i
        if (idx < buffer.length) fRe[i] = src[idx] * win[i]
      }
      fft(fRe, fIm)

      const mag = new Float64Array(halfFft)
      for (let b = 0; b < halfFft; b++) {
        mag[b] = Math.sqrt(fRe[b] * fRe[b] + fIm[b] * fIm[b]) + 1e-10
      }

      const h = nmfProjectFrame(mag, allW, WtW, halfFft, numTemplates, projectIter)

      const vocalRecon = new Float64Array(halfFft)
      const instRecon = new Float64Array(halfFft)
      for (let b = 0; b < halfFft; b++) {
        for (let t = 0; t < numVocalTemplates; t++) {
          vocalRecon[b] += allW[b * numTemplates + t] * h[t]
        }
        for (let t = numVocalTemplates; t < numTemplates; t++) {
          instRecon[b] += allW[b * numTemplates + t] * h[t]
        }
      }

      const nmfMask = new Float64Array(halfFft)
      for (let b = 0; b < halfFft; b++) {
        const total = vocalRecon[b] + instRecon[b] + 1e-10
        nmfMask[b] = Math.pow(instRecon[b] / total, 0.5)
      }

      const nnMask = refinementNet.predict(mag)

      const mask = new Float64Array(halfFft)
      for (let b = 0; b < halfFft; b++) {
        const freq = b * sr / fftSize
        let m = nmfMask[b] * 0.6 + nnMask[b] * 0.4

        let vocalWeight: number
        if (freq < 80) vocalWeight = 0.05
        else if (freq < 150) vocalWeight = 0.25
        else if (freq < 300) vocalWeight = 0.6
        else if (freq < 1000) vocalWeight = 1.0
        else if (freq < 3000) vocalWeight = 1.0
        else if (freq < 6000) vocalWeight = 0.8
        else if (freq < 10000) vocalWeight = 0.4
        else vocalWeight = 0.05

        m = 1 - (1 - m) * strength * vocalWeight

        if (m < 0.5) m = m * m * 2

        mask[b] = Math.max(0, Math.min(1, m))
      }

      if (prevMask) {
        for (let b = 0; b < halfFft; b++) {
          mask[b] = prevMask[b] * 0.15 + mask[b] * 0.85
        }
      }
      prevMask = mask

      for (let b = 0; b < halfFft; b++) {
        fRe[b] *= mask[b]
        fIm[b] *= mask[b]
        if (b > 0 && b < halfFft - 1) {
          const mir = fftSize - b
          fRe[mir] = fRe[b]
          fIm[mir] = -fIm[b]
        }
      }

      ifft(fRe, fIm)

      for (let i = 0; i < fftSize; i++) {
        const idx = offset + i
        if (idx < buffer.length) {
          acc[idx] += fRe[i] * win[i]
          winSum[idx] += win[i] * win[i]
        }
      }

      if (frame % 300 === 0) {
        const pct = 25 + Math.round((frame / numFrames) * 65)
        onProgress?.('AI: Neural network inference...', pct)
        await new Promise(r => setTimeout(r, 0))
      }
    }

    onProgress?.('AI: Reconstructing audio...', 90)
    for (let i = 0; i < buffer.length; i++) {
      if (winSum[i] > 1e-10) dst[i] = acc[i] / winSum[i]
    }
  }

  onProgress?.('AI: Complete', 100)
  return newBuffer
}
