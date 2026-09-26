export type EmotionToneCategory =
  | 'warmth'     // Ностальгия, тепло, нежность, материнство
  | 'energy'     // Драйв, бодрость, спорт, движение
  | 'resilience' // Драма, воля, стальной стержень, преодоление
  | 'triumph'    // Триумф, победа, сияние, торжество
  | 'glamour'    // Магнетизм, стиль, подиум, роскошь
  | 'wisdom';    // Осознанность, манифест, гармония, глубина

export interface EmotionAnalysis {
  category: EmotionToneCategory;
  label: string;          // e.g. "Тепло & Нежность"
  secondaryLabel: string; // e.g. "Ностальгический тон"
  color: string;          // text color
  bgClass: string;        // pill bg
  borderClass: string;    // pill border
  badgeClass: string;     // full badge classes
  iconName: 'heart' | 'zap' | 'shield' | 'trophy' | 'sparkles' | 'sun';
  energyLevel: number;    // 1 to 5
  keywordsDetected: string[];
  summary: string;
}

/**
 * Semantic keyword dictionaries for emotional tone detection in scene descriptions
 */
const EMOTION_DICTIONARIES: Record<
  EmotionToneCategory,
  {
    keywords: string[];
    label: string;
    secondaryLabel: string;
    color: string;
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    iconName: EmotionAnalysis['iconName'];
    energyLevel: number;
    summary: string;
  }
> = {
  warmth: {
    keywords: [
      'тепл',
      'нежн',
      'ностальг',
      'спокойн',
      'детств',
      'ласк',
      'трепет',
      'улыбк',
      'воспоминан',
      'умиротворен',
      'любов',
      'благоговейн',
      'материнск',
      'малыш',
      'ребенк',
      'домашн',
      'уют',
      'зачин',
      'добр',
    ],
    label: 'Тепло & Нежность',
    secondaryLabel: 'Ностальгия и душевность',
    color: 'text-amber-300',
    bgClass: 'bg-amber-500/15',
    borderClass: 'border-amber-500/35',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/35 shadow-amber-950/20',
    iconName: 'heart',
    energyLevel: 2,
    summary: 'Мягкий, душевный, ностальгический тон с теплой интонацией и доверительным дыханием.',
  },
  energy: {
    keywords: [
      'драйв',
      'энергич',
      'бодр',
      'спорт',
      'движен',
      'пластик',
      'парящ',
      'футбол',
      'лед',
      'танец',
      'ритм',
      'вдохновен',
      'тренировк',
      'матч',
      'команд',
      'скорост',
      'быстр',
      'динамик',
    ],
    label: 'Драйв & Энергия',
    secondaryLabel: 'Спортивный импульс',
    color: 'text-cyan-300',
    bgClass: 'bg-cyan-500/15',
    borderClass: 'border-cyan-500/35',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/35 shadow-cyan-950/20',
    iconName: 'zap',
    energyLevel: 4,
    summary: 'Динамичный, бодрый темп с ощущением скорости, спорта и пластического движения.',
  },
  resilience: {
    keywords: [
      'драматиз',
      'преодолен',
      'тяжест',
      'испытан',
      'стержен',
      'тверд',
      'непоколебим',
      'палат',
      'костыл',
      'больниц',
      'операц',
      'честн',
      'тихий',
      'стальн',
      'воля',
      'сдержан',
      'шаг',
      'цел',
      'останавлива',
    ],
    label: 'Воля & Преодоление',
    secondaryLabel: 'Сдержанный драматизм',
    color: 'text-slate-200',
    bgClass: 'bg-slate-500/20',
    borderClass: 'border-slate-400/40',
    badgeClass: 'bg-slate-500/20 text-slate-200 border-slate-400/40 shadow-slate-950/20',
    iconName: 'shield',
    energyLevel: 3,
    summary: 'Несгибаемый внутренний стержень, честная сдержанность без жалости к себе.',
  },
  triumph: {
    keywords: [
      'триумф',
      'победонос',
      'искрящ',
      'торжеств',
      'красот',
      'сил',
      'выигрыва',
      'корон',
      'аплодисмент',
      'сияни',
      'фанфар',
      'волгоград',
      'сцен',
      'побед',
      'каблук',
      'ярк',
      'взлет',
    ],
    label: 'Триумф & Сияние',
    secondaryLabel: 'Победоносное торжество',
    color: 'text-yellow-300',
    bgClass: 'bg-yellow-500/20',
    borderClass: 'border-yellow-500/40',
    badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-yellow-950/20',
    iconName: 'trophy',
    energyLevel: 5,
    summary: 'Яркий, победоносный голос с ощущением праздника, подиума и заслуженной победы.',
  },
  glamour: {
    keywords: [
      'магнетизм',
      'шарм',
      'роскошн',
      'подиум',
      'стил',
      'царствен',
      'москв',
      'модел',
      'хедлайнер',
      'статус',
      'вспышк',
      'диплом',
      'номинац',
      'осанк',
      'поступь',
      'fashion',
    ],
    label: 'Шарм & Магнетизм',
    secondaryLabel: 'Высокий стиль и подиум',
    color: 'text-purple-300',
    bgClass: 'bg-purple-500/15',
    borderClass: 'border-purple-500/35',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/35 shadow-purple-950/20',
    iconName: 'sparkles',
    energyLevel: 4,
    summary: 'Глубокий магнетический тембр, царственная осанка и высокая эстетика подиума.',
  },
  wisdom: {
    keywords: [
      'осознанност',
      'глубин',
      'манифест',
      'чист',
      'кристальн',
      'драгоценн',
      'чекан',
      '50',
      'начинаетс',
      'уверенност',
      'наставник',
      'авторитет',
      'зеркал',
      'истори',
      'кульминац',
      'жизн',
      'гармони',
    ],
    label: 'Мудрость & Манифест',
    secondaryLabel: 'Осознанная зрелость',
    color: 'text-rose-300',
    bgClass: 'bg-rose-500/15',
    borderClass: 'border-rose-500/35',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/35 shadow-rose-950/20',
    iconName: 'sun',
    energyLevel: 4,
    summary: 'Взвешенная кристальная уверенность, гордость за прожитые годы и открытость будущему.',
  },
};

/**
 * Analyzes emotionDescription (and optional emotionKey/text) to extract emotional tone
 */
export function analyzeEmotionTone(
  emotionDescription: string,
  emotionKey = '',
  text = ''
): EmotionAnalysis {
  const combined = `${emotionDescription} ${emotionKey} ${text}`.toLowerCase();

  let bestCategory: EmotionToneCategory = 'warmth';
  let bestScore = -1;
  let detectedKeywords: string[] = [];

  const categories = Object.keys(EMOTION_DICTIONARIES) as EmotionToneCategory[];

  for (const cat of categories) {
    const dict = EMOTION_DICTIONARIES[cat];
    let score = 0;
    const matched: string[] = [];

    for (const kw of dict.keywords) {
      if (combined.includes(kw)) {
        score += kw.length > 5 ? 2 : 1;
        matched.push(kw);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat;
      detectedKeywords = matched;
    }
  }

  // Fallback defaults if no keywords matched
  if (bestScore <= 0) {
    bestCategory = 'warmth';
  }

  const result = EMOTION_DICTIONARIES[bestCategory];

  return {
    category: bestCategory,
    label: result.label,
    secondaryLabel: result.secondaryLabel,
    color: result.color,
    bgClass: result.bgClass,
    borderClass: result.borderClass,
    badgeClass: result.badgeClass,
    iconName: result.iconName,
    energyLevel: result.energyLevel,
    keywordsDetected: detectedKeywords.slice(0, 4),
    summary: result.summary,
  };
}
