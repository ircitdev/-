import { VoiceSegment, AudioSettings } from '../types';

// Convert AudioBuffer to WAV Blob for master download
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const length = buffer.length * numChannels * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
  
  // RIFF identifier
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);
  
  // Write interleaved PCM samples
  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) {
    channels.push(buffer.getChannelData(c));
  }
  
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][i];
      // Clamp to -1 .. 1
      sample = Math.max(-1, Math.min(1, sample));
      // Scale to 16-bit signed integer
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([view], { type: 'audio/wav' });
}

// Format seconds into MM:SS.ms or SRT format
export function formatTimeDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
}

export function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Generate standard SRT subtitles
export function generateSRT(segments: VoiceSegment[]): string {
  return segments
    .map((seg, idx) => {
      const start = formatSRTTime(seg.startTime);
      const end = formatSRTTime(seg.endTime);
      return `${idx + 1}\n${start} --> ${end}\n${seg.text}\n`;
    })
    .join('\n');
}

// Generate Web Speech API fallback audio as an AudioBuffer
export async function synthesizeWebSpeechFallback(
  text: string,
  rate = 1.0
): Promise<{ audioUrl: string; duration: number }> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve({ audioUrl: '', duration: 3.0 });
      return;
    }

    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = rate;

    // Pick a Russian female voice if available
    const voices = synth.getVoices();
    const ruVoices = voices.filter((v) => v.lang.startsWith('ru') || v.lang.startsWith('RU'));
    const femaleVoice = ruVoices.find((v) =>
      /female|milena|irina|tatyana|daria|yandex|google/i.test(v.name)
    ) || ruVoices[0];

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    // Since Web Speech doesn't yield a direct Blob in standard API,
    // we can return a marker that triggers speech on play, or use AudioContext synth.
    resolve({
      audioUrl: 'webspeech:' + encodeURIComponent(text),
      duration: Math.max(2, text.length * 0.08),
    });
  });
}

// Sound FX generator using Web Audio API
export function playSoundFX(ctx: AudioContext, type: 'shutter' | 'applause' | 'crutch' | 'chime', volume = 0.5) {
  if (ctx.state === 'suspended') ctx.resume();
  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, now);
  masterGain.connect(ctx.destination);

  if (type === 'shutter') {
    // Camera shutter click
    const bufferSize = ctx.sampleRate * 0.15;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1500, now);
    noise.connect(filter);
    filter.connect(masterGain);
    noise.start(now);
  } else if (type === 'applause') {
    // Soft auditorium applause
    const dur = 2.5;
    const bufferSize = ctx.sampleRate * dur;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      output[i] = (Math.random() * 2 - 1) * env * (0.3 + 0.7 * Math.sin(i * 0.005));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.Q.setValueAtTime(1.2, now);
    noise.connect(filter);
    filter.connect(masterGain);
    noise.start(now);
  } else if (type === 'crutch') {
    // Resonant wooden/metallic step
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    oscGain.gain.setValueAtTime(volume * 0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.35);
  } else if (type === 'chime') {
    // Gentle golden chime
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      g.gain.setValueAtTime(0.2, now + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 1.2);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 1.2);
    });
  }
}

// Generate continuous 70-second procedural cinematic soundtrack
export function createCinematicBackingBuffer(ctx: AudioContext, duration = 70): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, numSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Musical structure over 70 seconds:
  // 0-13s: Calm nostalgic piano arpeggio (C maj - G maj - Am - F)
  // 13-22s: Warm rhythmic pulse (Motherhood, Soccer, Daughter)
  // 22-32s: Graceful flowing ice-skating theme
  // 32-41s: Dramatic hospital silence / deep ambient drone / quiet pulse
  // 41-57s: Ascending triumphant pageant theme & runway rhythm
  // 57-70s: Deep reflective mirror ambiance building into majestic emotional finale

  const chords = [
    { start: 0, end: 8, freqs: [261.63, 329.63, 392.0] }, // C
    { start: 8, end: 17, freqs: [220.0, 261.63, 329.63] }, // Am
    { start: 17, end: 26, freqs: [174.61, 220.0, 261.63] }, // F
    { start: 26, end: 32, freqs: [196.0, 246.94, 293.66] }, // G
    { start: 32, end: 37, freqs: [130.81, 196.0] }, // C drone quiet
    { start: 37, end: 41, freqs: [146.83, 220.0] }, // Dm drone
    { start: 41, end: 51, freqs: [174.61, 261.63, 329.63, 392.0] }, // Fmaj7 triumph
    { start: 51, end: 57, freqs: [196.0, 246.94, 293.66, 392.0] }, // G
    { start: 57, end: 63, freqs: [220.0, 261.63, 329.63, 440.0] }, // Am
    { start: 63, end: 70, freqs: [261.63, 329.63, 392.0, 523.25] }, // High C majestic
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const currentChord = chords.find((c) => t >= c.start && t < c.end) || chords[0];

    // Gentle string pad synthesis
    let valL = 0;
    let valR = 0;

    currentChord.freqs.forEach((f, idx) => {
      // Warm detuned sine/saw
      const detuneL = 1 + idx * 0.002;
      const detuneR = 1 - idx * 0.002;
      const waveL = Math.sin(2 * Math.PI * f * detuneL * t);
      const waveR = Math.sin(2 * Math.PI * f * detuneR * t);
      valL += waveL * 0.06;
      valR += waveR * 0.06;
    });

    // Soft rhythmic pulse in mid sections (41-57s runway)
    if (t >= 41 && t <= 57) {
      const beat = (t * 2) % 1; // 120 bpm pulse
      const kick = Math.sin(2 * Math.PI * 65 * beat) * Math.exp(-beat * 8) * 0.12;
      valL += kick;
      valR += kick;
    }

    // Dynamic overall envelope
    let masterEnv = 0.5;
    if (t < 2) masterEnv = t / 2; // fade in
    if (t >= 32 && t <= 39) masterEnv = 0.15; // dramatic hospital dip
    if (t >= 40 && t <= 62) masterEnv = 0.7; // triumphant rise
    if (t >= 63 && t <= 68) masterEnv = 0.9; // grand finale
    if (t > 68) masterEnv = (70 - t) / 2; // fade out

    left[i] = valL * masterEnv;
    right[i] = valR * masterEnv;
  }

  return buffer;
}
