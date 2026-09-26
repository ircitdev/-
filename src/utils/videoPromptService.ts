import { VoiceSegment, VideoPromptDetails } from '../types';

/**
 * Service to generate detailed cinematic video prompt breakdown using Gemini API
 */
export async function generateVideoPromptWithGemini(
  segment: VoiceSegment
): Promise<VideoPromptDetails> {
  try {
    const res = await fetch('/api/video-prompt/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sceneVisual: segment.sceneVisual,
        cameraMovement: segment.cameraMovement,
        emotionKey: segment.emotionKey,
        emotionDescription: segment.emotionDescription,
        text: segment.text,
        category: segment.category,
        duration: segment.duration,
        sceneTitle: segment.sceneTitle,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.prompt && data.prompt.cameraMovement) {
        return {
          cameraMovement: data.prompt.cameraMovement,
          lighting: data.prompt.lighting,
          style: data.prompt.style,
          composition: data.prompt.composition || 'Cinematic medium close-up, rule of thirds, shallow depth of field',
          fullPrompt: data.prompt.fullPrompt,
          fullPromptEn: data.prompt.fullPromptEn,
          generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
      }
    }
  } catch (e) {
    console.warn('Server Gemini call failed, using cinematic director fallback:', e);
  }

  // High-fidelity cinematic director heuristic fallback
  return generateCinematicPromptFallback(segment);
}

/**
 * Detailed fallback generator calibrated to cinematic commercial aesthetic
 */
function generateCinematicPromptFallback(segment: VoiceSegment): VideoPromptDetails {
  const { sceneVisual, cameraMovement, emotionKey, category } = segment;

  let lighting = 'Теплый рассеянный кинематографичный свет золотого часа (golden hour), мягкий контровой контур, нежные блики на оптике и естественные полутени.';
  let style = '35mm анаморфотная кинооптика Panavision, камера Arri Alexa Mini LF, Kodak Vision3 500T, натуральное мелкое пленочное зерно, кинематографичный грейдинг.';
  let composition = 'Крупный или средний кинематографичный план с акцентом на выразительные глаза и динамику движений, гармоничное разделение планов и кремовое боке на фоне.';
  let camera = `${cameraMovement}. Плавное кинематографичное движение стедикама с микро-дрейфом фокуса (shallow DOF f/1.8), подчеркивающее интимность и масштаб момента.`;

  if (category === 'childhood') {
    lighting = 'Мягкий ностальгический утренний свет, пробивающийся сквозь легкие шторы или листву, золотистые пылинки в воздухе, теплая палитра воспоминаний.';
    style = 'Винтажный пленочный тон Kodak Portra 400, 50mm f/1.4, мягкий контраст, деликатное виньетирование, эмоциональный арт-хаусный реализм.';
    composition = 'Нижний ракурс с точки зрения ребенка, акцент на детали и жесты, мягко размытое окружение.';
  } else if (category === 'motherhood') {
    lighting = 'Нежный рассеянный свет закатного солнца, персиковые и медовые тона кожи, легкий контровой ореол волос, уютная теплая гамма.';
    style = 'Премиальная реклама Apple/Nike, 85mm f/1.8 Cine lens, естественная цветопередача, эмоциональная документальная эстетика.';
    composition = 'Интимный двухплановый портрет (мать и дочь), диагональная композиция, живой эмоциональный контакт.';
  } else if (category === 'sport') {
    lighting = 'Холодный резкий свет софитов спортивной арены или катка, контрастные лучи сквозь морозный пар, искрящиеся микрочастицы льда и пота.';
    style = 'Спортивная кинематография Phantom Flex 4K, 120fps slow-motion, динамичная глубина резкости, гиперреалистичные текстуры.';
    composition = 'Динамичный ракурс следования за движением тела, центрирование грациозного силуэта, стремительные линии перспективы.';
  } else if (category === 'recovery') {
    lighting = 'Глубокий приглушенный полумрак, узкий драматичный направленный пучок света из окна, глубокие сине-серые тени и пронзительный теплый фокус надежды.';
    style = 'Драматический арт-синема, 35mm монохромно-приглушенная палитра, фактурные тени, глубокий психологизм кадра.';
    composition = 'Фронтальный минималистичный план, символичное пространство пустоты вокруг героини, акцент на преодоление и волевой взгляд.';
  } else if (category === 'triumph') {
    lighting = 'Ослепительные вспышки сотен фотокамер, сияющие прожекторы подиума, мерцающие золотые отражения в короне и пайетках вечернего платья.';
    style = 'High-fashion editorial Vogue / Cannes Film Festival, 70mm IMAX формат, кристальная четкость, роскошный блеск и глубокие контрасты.';
    composition = 'Величественный средний план снизу вверх, триумфальная поза победительницы, заполняющий кадр ореол аплодисментов и огней.';
  } else {
    // present (50 years)
    lighting = 'Благородный вечерний свет дизайнерских интерьеров, мягкое мерцание свечей и теплых ламп, изысканный зеркальный отблеск и сияние уверенности.';
    style = 'Кинокартина в духе Паоло Соррентино, Panavision Ultra Prime, глубокий бархатистый грейдинг, безупречная эстетика зрелой женской красоты.';
    composition = 'Симметричный портрет перед зеркалом, многослойный взгляд в объектив, визуальное воплощение гармонии и внутренней силы.';
  }

  const fullPrompt = `${sceneVisual}. Камера: ${camera}. Освещение: ${lighting}. Стиль: ${style}. Настроение: ${emotionKey}.`;
  
  const fullPromptEn = `Cinematic 8k video shot of ${sceneVisual}, ${category} phase, feeling ${emotionKey}. Camera movement: ${cameraMovement}, smooth cinematic gimbal, 35mm anamorphic lens, shallow depth of field f/1.8. Lighting: ${lighting.includes('золот') ? 'golden hour volumetric lighting' : 'dramatic cinematic lighting with soft rim light'}. Film look: Arri Alexa Mini LF, Kodak Vision3 500T 35mm film grain, masterpiece cinematography, hyperrealistic, award-winning commercial aesthetic.`;

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
