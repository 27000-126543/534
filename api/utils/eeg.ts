import { mean, std, linspace, gaussian } from './math';

export function detrend(signal: number[]): number[] {
  const n = signal.length;
  const x = linspace(0, n - 1, n);
  const xMean = mean(x);
  const yMean = mean(signal);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - xMean) * (signal[i] - yMean);
    denominator += Math.pow(x[i] - xMean, 2);
  }
  
  const slope = numerator / denominator;
  const intercept = yMean - slope * xMean;
  
  return signal.map((val, i) => val - (slope * x[i] + intercept));
}

export function baselineCorrection(signal: number[], baselineStart: number = 0, baselineEnd: number = 100): number[] {
  const baseline = signal.slice(baselineStart, baselineEnd);
  const baselineMean = mean(baseline);
  return signal.map(val => val - baselineMean);
}

export function bandpassFilter(signal: number[], lowCut: number, highCut: number, samplingRate: number): number[] {
  const nyquist = samplingRate / 2;
  const low = lowCut / nyquist;
  const high = highCut / nyquist;
  const order = 4;
  
  const filtered = [...signal];
  const b = new Array(order + 1).fill(0);
  const a = new Array(order + 1).fill(0);
  
  b[0] = Math.pow(high - low, order);
  for (let i = 1; i <= order; i++) {
    b[i] = b[i - 1] * (order - i + 1) / i;
  }
  
  a[0] = 1;
  for (let i = 1; i <= order; i++) {
    a[i] = 0;
  }
  
  for (let i = order; i < filtered.length; i++) {
    let sum = 0;
    for (let j = 0; j <= order; j++) {
      sum += b[j] * filtered[i - j];
      if (j > 0) {
        sum -= a[j] * filtered[i - j];
      }
    }
    filtered[i] = sum;
  }
  
  return filtered;
}

export function notchFilter(signal: number[], freq: number, samplingRate: number, q: number = 30): number[] {
  const w0 = 2 * Math.PI * freq / samplingRate;
  const alpha = Math.sin(w0) / (2 * q);
  
  const b0 = 1;
  const b1 = -2 * Math.cos(w0);
  const b2 = 1;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;
  
  const filtered = [...signal];
  
  for (let i = 2; i < signal.length; i++) {
    filtered[i] = (
      b0 * signal[i] + b1 * signal[i - 1] + b2 * signal[i - 2] -
      a1 * filtered[i - 1] - a2 * filtered[i - 2]
    ) / a0;
  }
  
  return filtered;
}

export function fft(signal: number[]): { magnitudes: number[]; frequencies: number[] } {
  const n = signal.length;
  const magnitudes = new Array(n / 2).fill(0);
  const frequencies = new Array(n / 2).fill(0);
  
  for (let k = 0; k < n / 2; k++) {
    let re = 0;
    let im = 0;
    for (let t = 0; t < n; t++) {
      const angle = -2 * Math.PI * k * t / n;
      re += signal[t] * Math.cos(angle);
      im += signal[t] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(re * re + im * im);
    frequencies[k] = k;
  }
  
  return { magnitudes, frequencies };
}

export function powerSpectralDensity(signal: number[], samplingRate: number, windowSize: number = 256, overlap: number = 0.5): { psd: number[]; frequencies: number[] } {
  const step = Math.floor(windowSize * (1 - overlap));
  const nSegments = Math.floor((signal.length - windowSize) / step) + 1;
  const nFreq = windowSize / 2;
  const psd = new Array(nFreq).fill(0);
  
  const window = hanningWindow(windowSize);
  
  for (let i = 0; i < nSegments; i++) {
    const start = i * step;
    const segment = signal.slice(start, start + windowSize);
    const windowed = segment.map((val, j) => val * window[j]);
    
    const { magnitudes } = fft(windowed);
    for (let k = 0; k < nFreq; k++) {
      psd[k] += magnitudes[k] * magnitudes[k];
    }
  }
  
  for (let k = 0; k < nFreq; k++) {
    psd[k] /= (nSegments * windowSize * samplingRate);
  }
  
  const frequencies = new Array(nFreq).fill(0).map((_, k) => k * samplingRate / windowSize);
  
  return { psd, frequencies };
}

export function hanningWindow(n: number): number[] {
  return new Array(n).fill(0).map((_, i) => 0.5 * (1 - Math.cos(2 * Math.PI * i / (n - 1))));
}

export function extractFrequencyBand(signal: number[], samplingRate: number, band: { low: number; high: number }): number[] {
  return bandpassFilter(signal, band.low, band.high, samplingRate);
}

export function calculateBandPower(signal: number[], samplingRate: number, band: { low: number; high: number }): number {
  const { psd, frequencies } = powerSpectralDensity(signal, samplingRate);
  let power = 0;
  
  for (let i = 0; i < frequencies.length; i++) {
    if (frequencies[i] >= band.low && frequencies[i] <= band.high) {
      power += psd[i] * (frequencies[i] - (i > 0 ? frequencies[i - 1] : 0));
    }
  }
  
  return power;
}

export function calculateRelativeBandPower(signal: number[], samplingRate: number, band: { low: number; high: number }): number {
  const bandPower = calculateBandPower(signal, samplingRate, band);
  const totalPower = calculateBandPower(signal, samplingRate, { low: 1, high: 100 });
  return totalPower > 0 ? bandPower / totalPower : 0;
}

export function signalToNoiseRatio(signal: number[], noiseStart: number = 0, noiseEnd: number = 100): number {
  const noise = signal.slice(noiseStart, noiseEnd);
  const signalPart = signal.slice(noiseEnd);
  
  const signalPower = mean(signalPart.map(v => v * v));
  const noisePower = mean(noise.map(v => v * v));
  
  return noisePower > 0 ? 10 * Math.log10(signalPower / noisePower) : 0;
}

export function artifactDetection(signal: number[], threshold: number = 5, windowSize: number = 200): number[][] {
  const artifacts: number[][] = [];
  const signalMean = mean(signal);
  const signalStd = std(signal);
  const zThreshold = threshold;
  
  let inArtifact = false;
  let artifactStart = 0;
  
  for (let i = 0; i < signal.length; i++) {
    const zScore = Math.abs((signal[i] - signalMean) / signalStd);
    
    if (zScore > zThreshold && !inArtifact) {
      inArtifact = true;
      artifactStart = i;
    } else if (zScore <= zThreshold && inArtifact) {
      inArtifact = false;
      if (i - artifactStart > 10) {
        artifacts.push([artifactStart, i - 1]);
      }
    }
  }
  
  if (inArtifact) {
    artifacts.push([artifactStart, signal.length - 1]);
  }
  
  return artifacts;
}

export function removeArtifacts(signal: number[], artifacts: number[][]): number[] {
  const cleaned = [...signal];
  
  for (const [start, end] of artifacts) {
    const before = start > 0 ? signal[start - 1] : 0;
    const after = end < signal.length - 1 ? signal[end + 1] : 0;
    
    for (let i = start; i <= end; i++) {
      const t = (i - start) / (end - start || 1);
      cleaned[i] = before + (after - before) * t;
    }
  }
  
  return cleaned;
}

export function calculateResidualError(measured: number[], predicted: number[]): number {
  if (measured.length !== predicted.length) {
    throw new Error('信号长度不匹配');
  }
  
  let numerator = 0;
  let denominator = 0;
  const measuredMean = mean(measured);
  
  for (let i = 0; i < measured.length; i++) {
    numerator += Math.pow(measured[i] - predicted[i], 2);
    denominator += Math.pow(measured[i] - measuredMean, 2);
  }
  
  return denominator > 0 ? Math.sqrt(numerator / denominator) * 100 : 0;
}

export function goodnessOfFit(measured: number[], predicted: number[]): number {
  const residual = calculateResidualError(measured, predicted);
  return Math.max(0, 100 - residual);
}

export function sourceLocalizationAccuracy(estimated: number[], trueLocation: number[]): number {
  return Math.sqrt(
    Math.pow(estimated[0] - trueLocation[0], 2) +
    Math.pow(estimated[1] - trueLocation[1], 2) +
    Math.pow(estimated[2] - trueLocation[2], 2)
  );
}

export function spatialSmoothing(data: number[][], sigma: number = 2): number[][] {
  const nRows = data.length;
  const nCols = data[0].length;
  const smoothed = new Array(nRows).fill(null).map(() => new Array(nCols).fill(0));
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
  const halfKernel = Math.floor(kernelSize / 2);
  
  for (let i = 0; i < nRows; i++) {
    for (let j = 0; j < nCols; j++) {
      let sum = 0;
      let weightSum = 0;
      
      for (let di = -halfKernel; di <= halfKernel; di++) {
        for (let dj = -halfKernel; dj <= halfKernel; dj++) {
          const ni = i + di;
          const nj = j + dj;
          
          if (ni >= 0 && ni < nRows && nj >= 0 && nj < nCols) {
            const dist = Math.sqrt(di * di + dj * dj);
            const weight = gaussian(dist, 0, sigma);
            sum += data[ni][nj] * weight;
            weightSum += weight;
          }
        }
      }
      
      smoothed[i][j] = weightSum > 0 ? sum / weightSum : data[i][j];
    }
  }
  
  return smoothed;
}

export function downsample(signal: number[], factor: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < signal.length; i += factor) {
    const end = Math.min(i + factor, signal.length);
    const segment = signal.slice(i, end);
    result.push(mean(segment));
  }
  return result;
}

export function epochSignal(signal: number[], epochLength: number, overlap: number = 0): number[][] {
  const step = Math.floor(epochLength * (1 - overlap));
  const epochs: number[][] = [];
  
  for (let i = 0; i <= signal.length - epochLength; i += step) {
    epochs.push(signal.slice(i, i + epochLength));
  }
  
  return epochs;
}

export function averageEpochs(epochs: number[][]): number[] {
  if (epochs.length === 0) return [];
  const epochLength = epochs[0].length;
  const averaged = new Array(epochLength).fill(0);
  
  for (let i = 0; i < epochLength; i++) {
    let sum = 0;
    for (const epoch of epochs) {
      sum += epoch[i];
    }
    averaged[i] = sum / epochs.length;
  }
  
  return averaged;
}
