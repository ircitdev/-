import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '20mb' }));

// Helper to convert 16-bit PCM 24000Hz mono buffer to WAV
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Gemini Client initialization
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Endpoint: Generate Speech for a single segment
app.post('/api/tts/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, voice = 'Kore', stylePrompt, targetDuration } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const ai = getGenAIClient();
    const voiceName = voice || 'Kore'; // 'Kore' is a warm, elegant female voice; 'Aoede' is lyrical/expressive

    const defaultStyle = 'Beautiful, warm, inspiring, reflective female voice speaking fluent Russian. Natural conversational pacing with emotional depth and confident maturity.';
    const finalStyle = stylePrompt ? `${defaultStyle} ${stylePrompt}` : defaultStyle;

    // Try primary recommended TTS model
    const candidateModels = ['gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts', 'gemini-3.8-flash-tts'];
    let lastError: any = null;
    let audioPcmBase64: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: text,
                  speechMetadata: {
                    style: finalStyle,
                  },
                },
              ],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
          },
        });

        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData?.data) {
          audioPcmBase64 = part.inlineData.data;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed, trying next fallback:`, err?.message || err);
      }
    }

    if (!audioPcmBase64) {
      throw lastError || new Error('No audio data received from Gemini TTS');
    }

    const pcmBuffer = Buffer.from(audioPcmBase64, 'base64');
    const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);
    const wavBase64 = wavBuffer.toString('base64');
    const durationSeconds = pcmBuffer.length / (24000 * 2);

    res.json({
      success: true,
      audioBase64: wavBase64,
      audioUrl: `data:audio/wav;base64,${wavBase64}`,
      duration: durationSeconds,
      sampleRate: 24000,
    });
  } catch (err: any) {
    console.error('Error generating TTS:', err);
    res.status(500).json({
      error: err?.message || 'Failed to generate voiceover',
      details: err?.toString(),
    });
  }
});

// Endpoint: Check TTS API availability & health
app.get('/api/tts/status', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY);
  res.json({
    hasKey,
    models: ['gemini-3.8-flash-lite-tts', 'gemini-2.5-flash-preview-tts'],
    voices: [
      { id: 'Kore', name: 'Коре (Kore)', desc: 'Тёплый, глубокий, элегантный женский голос' },
      { id: 'Aoede', name: 'Аэда (Aoede)', desc: 'Искренний, выразительный, кинематографичный' },
      { id: 'Zephyr', name: 'Зефир (Zephyr)', desc: 'Мягкий, проникновенный, доверительный' },
    ],
  });
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (http://localhost:${port})`);
  });
}

startServer().catch(console.error);
