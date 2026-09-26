/**
 * Speech-to-Text (STT) Client Service
 * Transcribes audio files into Russian text using Gemini API
 */

export interface TranscribeResult {
  text: string;
  audioUrl: string;
  duration: number;
}

/**
 * Helper to convert a File/Blob to Base64 string
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      resolve(res);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Measure audio duration using Web Audio API AudioContext
 */
export async function getAudioDuration(file: File | Blob): Promise<number> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    const arrayBuffer = await file.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const dur = decoded.duration;
    ctx.close().catch(() => {});
    return dur;
  } catch (err) {
    console.warn('AudioContext failed to decode duration, falling back to HTMLAudioElement:', err);
    return new Promise<number>((resolve) => {
      const audio = document.createElement('audio');
      const url = URL.createObjectURL(file);
      audio.src = url;
      audio.onloadedmetadata = () => {
        const d = audio.duration || 4.0;
        URL.revokeObjectURL(url);
        resolve(d);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(4.0);
      };
    });
  }
}

/**
 * Transcribe an uploaded audio file using Gemini STT via backend
 */
export async function transcribeAudioFile(
  file: File,
  sceneContext?: string
): Promise<TranscribeResult> {
  const [base64WithPrefix, duration] = await Promise.all([
    fileToBase64(file),
    getAudioDuration(file),
  ]);

  const mimeType = file.type || 'audio/wav';

  const response = await fetch('/api/stt/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: base64WithPrefix,
      mimeType,
      fileName: file.name,
      sceneContext,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP ${response.status}: Ошибка распознавания речи`);
  }

  const data = await response.json();
  const text = (data.text || '').trim();

  return {
    text,
    audioUrl: base64WithPrefix,
    duration: Number(duration.toFixed(2)),
  };
}
