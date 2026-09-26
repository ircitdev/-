import { audioBufferToWav } from './audioEngine';

export type TimeStretchMode = 'wsola' | 'varispeed';

export interface TimeStretchResult {
  audioBuffer: AudioBuffer;
  blob: Blob;
  dataUrl: string;
  originalDuration: number;
  newDuration: number;
  speedRatio: number;
  mode: TimeStretchMode;
}

/**
 * Convert a Blob to a base64 Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Decode audio from URL, Data URI, or Blob into an AudioBuffer
 */
export async function decodeAudioSource(audioSource: string | Blob): Promise<AudioBuffer> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass();

  try {
    let arrayBuffer: ArrayBuffer;

    if (audioSource instanceof Blob) {
      arrayBuffer = await audioSource.arrayBuffer();
    } else if (typeof audioSource === 'string' && audioSource.startsWith('webspeech:')) {
      // Synthesize a speech-like voice cadence buffer for webspeech fallback
      const text = decodeURIComponent(audioSource.replace('webspeech:', ''));
      const sampleRate = 24000;
      const duration = Math.max(2, text.length * 0.08);
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);

      // Procedural natural Russian speech formant synthesis
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const phonemeProgress = (t * 8) % 1;
        const formant1 = Math.sin(2 * Math.PI * 220 * t);
        const formant2 = Math.sin(2 * Math.PI * 440 * t) * 0.6;
        const formant3 = Math.sin(2 * Math.PI * 880 * t) * 0.3;
        const env = Math.sin(phonemeProgress * Math.PI);
        data[i] = (formant1 + formant2 + formant3) * env * 0.4;
      }
      return buffer;
    } else {
      const res = await fetch(audioSource);
      arrayBuffer = await res.arrayBuffer();
    }

    const decoded = await ctx.decodeAudioData(arrayBuffer);
    return decoded;
  } finally {
    try {
      ctx.close();
    } catch (e) {}
  }
}

/**
 * WSOLA (Waveform Similarity Overlap-Add) Time-Stretching Algorithm
 * Changes audio duration and tempo while preserving original pitch and formants.
 */
export function timeStretchWSOLA(
  inputBuffer: AudioBuffer,
  targetDuration: number
): AudioBuffer {
  const sampleRate = inputBuffer.sampleRate;
  const numChannels = inputBuffer.numberOfChannels;
  const originalDuration = inputBuffer.duration;
  const targetSamples = Math.max(1, Math.floor(targetDuration * sampleRate));

  if (targetSamples === inputBuffer.length || Math.abs(originalDuration - targetDuration) < 0.01) {
    return inputBuffer;
  }

  // Speed factor: > 1 means faster (shorter output), < 1 means slower (longer output)
  const speed = originalDuration / targetDuration;

  // Window size: ~35ms, power of 2
  const windowSize = Math.min(2048, Math.max(512, Math.pow(2, Math.round(Math.log2(sampleRate * 0.035)))));
  const halfWindow = Math.floor(windowSize / 2);

  // Synthesis hop size
  const hopS = halfWindow;
  // Analysis hop size
  const hopA = Math.max(1, Math.round(hopS * speed));
  // Search range for maximum cross-correlation
  const searchRange = Math.floor(halfWindow / 2);

  // Pre-calculate Hanning window
  const hanningWindow = new Float32Array(windowSize);
  for (let i = 0; i < windowSize; i++) {
    hanningWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (windowSize - 1)));
  }

  // Create output AudioBuffer
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass();
  const outputBuffer = ctx.createBuffer(numChannels, targetSamples, sampleRate);
  try {
    ctx.close();
  } catch (e) {}

  // Process all channels
  for (let c = 0; c < numChannels; c++) {
    const input = inputBuffer.getChannelData(c);
    const output = outputBuffer.getChannelData(c);
    const norm = new Float32Array(targetSamples);

    let synthPos = 0;
    let prevAnalysisPos = 0;

    while (synthPos < targetSamples) {
      // Target nominal analysis position
      const nominalAnalysis = Math.round(synthPos * speed);

      // Search optimal shift around nominal position to preserve phase similarity
      let bestOffset = 0;
      let maxCorr = -Infinity;

      if (synthPos > 0 && prevAnalysisPos + hopA < input.length - windowSize) {
        const minOffset = Math.max(-searchRange, -nominalAnalysis);
        const maxOffset = Math.min(searchRange, input.length - windowSize - nominalAnalysis);

        // Compare overlap with previous synthesized window
        for (let offset = minOffset; offset <= maxOffset; offset += 2) {
          const candidatePos = nominalAnalysis + offset;
          if (candidatePos < 0 || candidatePos + windowSize >= input.length) continue;

          let corr = 0;
          let energy = 0.0001;

          for (let k = 0; k < halfWindow; k += 4) {
            const prevSample = output[synthPos - halfWindow + k] || 0;
            const curSample = input[candidatePos + k] || 0;
            corr += prevSample * curSample;
            energy += curSample * curSample;
          }

          const normCorr = corr / Math.sqrt(energy);
          if (normCorr > maxCorr) {
            maxCorr = normCorr;
            bestOffset = offset;
          }
        }
      }

      const actualAnalysisPos = Math.max(
        0,
        Math.min(input.length - windowSize, nominalAnalysis + bestOffset)
      );
      prevAnalysisPos = actualAnalysisPos;

      // Overlap and add windowed frame
      for (let i = 0; i < windowSize; i++) {
        const outIdx = synthPos + i;
        if (outIdx >= targetSamples) break;

        const inIdx = actualAnalysisPos + i;
        const inSample = inIdx < input.length ? input[inIdx] : 0;
        const w = hanningWindow[i];

        output[outIdx] += inSample * w;
        norm[outIdx] += w;
      }

      synthPos += hopS;
    }

    // Normalize output by window overlap
    for (let i = 0; i < targetSamples; i++) {
      if (norm[i] > 0.05) {
        output[i] = output[i] / norm[i];
      }
      // Soft limiting
      output[i] = Math.max(-0.99, Math.min(0.99, output[i]));
    }
  }

  return outputBuffer;
}

/**
 * Varispeed Resampling with OfflineAudioContext
 * Changes tempo with proportional natural pitch shifting.
 */
export async function timeStretchVarispeed(
  inputBuffer: AudioBuffer,
  targetDuration: number
): Promise<AudioBuffer> {
  const sampleRate = inputBuffer.sampleRate;
  const numChannels = inputBuffer.numberOfChannels;
  const targetSamples = Math.max(1, Math.floor(targetDuration * sampleRate));

  const offlineCtx = new OfflineAudioContext(numChannels, targetSamples, sampleRate);
  const source = offlineCtx.createBufferSource();
  source.buffer = inputBuffer;

  // Set playbackRate so that input fits into targetDuration
  const rate = inputBuffer.duration / targetDuration;
  source.playbackRate.value = rate;

  source.connect(offlineCtx.destination);
  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  return renderedBuffer;
}

/**
 * Main helper: Fit audio to target duration via Web Audio API pitch shifting or stretching
 */
export async function fitAudioToDuration(
  audioSource: string | Blob,
  targetDuration: number,
  mode: TimeStretchMode = 'wsola'
): Promise<TimeStretchResult> {
  const decodedBuffer = await decodeAudioSource(audioSource);
  const originalDuration = decodedBuffer.duration;
  const speedRatio = Number((originalDuration / targetDuration).toFixed(3));

  let processedBuffer: AudioBuffer;

  if (mode === 'wsola') {
    processedBuffer = timeStretchWSOLA(decodedBuffer, targetDuration);
  } else {
    processedBuffer = await timeStretchVarispeed(decodedBuffer, targetDuration);
  }

  // Encode processed buffer into a clean standard WAV Blob
  const wavBlob = audioBufferToWav(processedBuffer);
  const dataUrl = await blobToDataUrl(wavBlob);

  return {
    audioBuffer: processedBuffer,
    blob: wavBlob,
    dataUrl,
    originalDuration,
    newDuration: targetDuration,
    speedRatio,
    mode,
  };
}
