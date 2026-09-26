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

// Endpoint: Generate Detailed Cinematic Video Prompt using Gemini API
app.post('/api/video-prompt/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      sceneVisual,
      cameraMovement,
      emotionKey,
      emotionDescription,
      text,
      category,
      duration,
      sceneTitle,
    } = req.body;

    if (!sceneVisual || typeof sceneVisual !== 'string') {
      res.status(400).json({ error: 'sceneVisual is required' });
      return;
    }

    const ai = getGenAIClient();
    const systemPrompt = `You are an award-winning cinematic Director of Photography (DP) and AI video prompt engineer for high-end cinematic commercials, documentary portraits, and generative video tools (Runway Gen-3, Sora, Kling, Luma Dream Machine, Midjourney v6).
Your task is to take a scene description from a 70-second emotional film celebrating a woman's transformative life journey (childhood, motherhood, rhythmic gymnastics/sport, overcoming severe injury, beauty pageants/triumph, confident present at 50) and generate a rich, professional, cinematic video prompt breakdown.

Return ONLY a valid JSON object with the following fields:
- cameraMovement: Detailed camera movement (focal length, lens, steadicam/dolly/crane, panning, speed, depth of field).
- lighting: Lighting design, color temperature, time of day, atmosphere, shadows, volumetric rays, highlights.
- style: Cinematic visual aesthetic, camera body, lens type, film stock (e.g. Arri Alexa LF, Panavision Anamorphic, 35mm Kodak 5219 grain, subtle color grade, photorealism).
- composition: Framing, rule of thirds, subject placement, foreground/background depth, bokeh.
- fullPrompt: A master cinematic description in Russian (2-3 evocative sentences).
- fullPromptEn: An exact, professional, comma-separated English prompt optimized for AI video models (Runway Gen-3, Kling, Sora), including technical camera specs, lighting, movement, 8k, photorealistic, cinematic.`;

    const userPrompt = `Scene details:
- Scene title: "${sceneTitle || ''}"
- Visual concept: "${sceneVisual}"
- Current camera guidance: "${cameraMovement || 'Cinematic movement'}"
- Scene phase / category: ${category || 'general'}
- Emotional tone: "${emotionKey || ''}: ${emotionDescription || ''}"
- Voiceover line: "${text || ''}"
- Scene duration: ${duration || 5.0} seconds

Generate a detailed, cinematic video generation prompt breakdown in JSON format.`;

    const candidateTextModels = ['gemini-3.8-flash', 'gemini-3.8-flash-lite', 'gemini-2.5-flash'];
    const modelErrors: Record<string, string> = {};
    let data: any = null;

    for (const model of candidateTextModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        console.log('Gemini model response candidates:', JSON.stringify(response.candidates));
        console.log('Gemini response.text:', response.text);

        const responseText = response.text || '';
        try {
          data = JSON.parse(responseText);
        } catch (parseErr: any) {
          modelErrors[model] = `Keys: ${Object.keys(response).join(',')}; Full: ${JSON.stringify(response)}`;
          continue;
        }

        if (data && data.cameraMovement) {
          break;
        }
      } catch (err: any) {
        modelErrors[model] = err?.message || String(err);
        console.warn(`Text model ${model} failed:`, err?.message || err);
      }
    }

    if (!data) {
      console.warn('Gemini quota reached or model unavailable, using cinematic director fallback');
      const fallback = generateServerPromptFallback(req.body);
      res.json({
        success: true,
        prompt: fallback,
        source: 'director_engine',
      });
      return;
    }

    res.json({
      success: true,
      prompt: data,
      source: 'gemini',
    });
  } catch (err: any) {
    console.warn('Error in prompt route, serving fallback prompt:', err?.message);
    const fallback = generateServerPromptFallback(req.body);
    res.json({
      success: true,
      prompt: fallback,
      source: 'director_engine',
    });
  }
});

// Helper for fallback cinematic prompt generation
function generateServerPromptFallback(body: any) {
  const { sceneVisual = '', cameraMovement = '', emotionKey = '', category = 'general' } = body;

  let lighting = 'Теплый рассеянный кинематографичный свет золотого часа (golden hour), мягкий контровой ореол волос, деликатные блики на оптике и естественные полутени.';
  let style = '35mm анаморфотная кинооптика Panavision, камера Arri Alexa Mini LF, Kodak Vision3 500T, натуральное мелкое пленочное зерно, кинематографичный грейдинг.';
  let composition = 'Крупный или средний кинематографичный план с акцентом на выразительные глаза и динамику движений, гармоничное разделение планов и кремовое боке на фоне.';
  let camera = `${cameraMovement || 'Плавное кинематографичное движение'}. Плавный проезд стедикама с микро-дрейфом фокуса (shallow DOF f/1.8), подчеркивающий интимность и масштаб момента.`;

  if (category === 'childhood') {
    lighting = 'Мягкий ностальгический утренний свет сквозь легкие занавески, золотистые пылинки в воздухе, теплая палитра первых воспоминаний.';
    style = 'Винтажный пленочный тон Kodak Portra 400, 50mm f/1.4, мягкий контраст, деликатное виньетирование, эмоциональный арт-хаусный реализм.';
    composition = 'Нижний ракурс с точки зрения ребенка, акцент на детали и жесты, мягко размытое окружение.';
  } else if (category === 'motherhood') {
    lighting = 'Нежный рассеянный свет закатного солнца, персиковые и медовые тона кожи, легкий контровой ореол, уютная теплая гамма.';
    style = 'Премиальная реклама Apple/Nike, 85mm f/1.8 Cine lens, естественная цветопередача, эмоциональная документальная эстетика.';
    composition = 'Интимный двухплановый портрет (мать и дочь), диагональная композиция, живой эмоциональный контакт.';
  } else if (category === 'sport') {
    lighting = 'Холодный резкий свет софитов спортивной арены или катка, контрастные лучи сквозь морозный пар, искрящиеся микрочастицы льда.';
    style = 'Спортивная кинематография Phantom Flex 4K, 120fps slow-motion, динамичная глубина резкости, гиперреалистичные текстуры.';
    composition = 'Динамичный ракурс следования за движением тела, центрирование грациозного силуэта, стремительные линии перспективы.';
  } else if (category === 'recovery') {
    lighting = 'Глубокий приглушенный полумрак, узкий драматичный направленный луч надежды из окна, фактурные сине-серые тени.';
    style = 'Драматический арт-синема, 35mm монохромно-приглушенная палитра, глубокий психологизм кадра.';
    composition = 'Фронтальный минималистичный план, символичное пространство преодоления, акцент на волевой взгляд героини.';
  } else if (category === 'triumph') {
    lighting = 'Ослепительные вспышки сотен фотокамер, сияющие прожекторы подиума, мерцающие золотые отражения в пайетках вечернего платья.';
    style = 'High-fashion editorial Vogue / Cannes Film Festival, 70mm IMAX формат, кристальная четкость, роскошный блеск и глубокие контрасты.';
    composition = 'Величественный средний план снизу вверх, триумфальная поза победительницы, заполняющий кадр ореол огней.';
  } else {
    lighting = 'Благородный вечерний свет дизайнерских интерьеров, мягкое мерцание свечей, изысканный зеркальный отблеск и сияние уверенности.';
    style = 'Кинокартина в духе Паоло Соррентино, Panavision Ultra Prime, глубокий бархатистый грейдинг, безупречная эстетика зрелой женской красоты.';
    composition = 'Симметричный портрет перед зеркалом, многослойный взгляд в объектив, визуальное воплощение гармонии и внутренней силы.';
  }

  const fullPrompt = `${sceneVisual}. Камера: ${camera}. Освещение: ${lighting}. Стиль: ${style}. Настроение: ${emotionKey}.`;
  const fullPromptEn = `Cinematic 8k video shot of ${sceneVisual}, ${category} phase, feeling ${emotionKey}. Camera movement: ${cameraMovement}, smooth cinematic gimbal, 35mm anamorphic lens, shallow depth of field f/1.8. Lighting: golden hour volumetric lighting with soft rim light. Film look: Arri Alexa Mini LF, Kodak Vision3 500T 35mm film grain, masterpiece cinematography, hyperrealistic, award-winning commercial aesthetic.`;

  return {
    cameraMovement: camera,
    lighting,
    style,
    composition,
    fullPrompt,
    fullPromptEn,
    generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

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
