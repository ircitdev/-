import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  RefreshCw,
  Download,
  Sparkles,
  Wand2,
  Edit3,
  Check,
  Volume2,
  Camera,
  Sliders,
  Settings2,
  Zap,
  Film,
  Copy,
  Lightbulb,
  Palette,
  ChevronDown,
  ChevronUp,
  Heart,
  Shield,
  Trophy,
  Sun,
} from 'lucide-react';
import { VoiceSegment, VideoPromptDetails } from '../types';
import { WaveformVisualizer } from './WaveformVisualizer';
import { fitAudioToDuration, TimeStretchMode } from '../utils/timeStretch';
import { generateVideoPromptWithGemini } from '../utils/videoPromptService';
import { analyzeEmotionTone, EmotionAnalysis } from '../utils/emotionAnalyzer';

interface SegmentCardProps {
  segment: VoiceSegment;
  isActive: boolean;
  onSeek: (time: number) => void;
  onGenerateSingle: (id: number) => void;
  onPlaySingleClip: (segment: VoiceSegment) => void;
  isPlayingClip: boolean;
  onUpdateText: (id: number, newText: string) => void;
  onDownloadClip: (segment: VoiceSegment) => void;
  onUpdateSegmentAudio?: (id: number, newAudioUrl: string, newDuration: number) => void;
  onUpdateVideoPrompt?: (id: number, prompt: VideoPromptDetails) => void;
  masterCurrentTime?: number;
  isMasterPlaying?: boolean;
}

export const SegmentCard: React.FC<SegmentCardProps> = ({
  segment,
  isActive,
  onSeek,
  onGenerateSingle,
  onPlaySingleClip,
  isPlayingClip,
  onUpdateText,
  onDownloadClip,
  onUpdateSegmentAudio,
  onUpdateVideoPrompt,
  masterCurrentTime = 0,
  isMasterPlaying = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [textVal, setTextVal] = useState(segment.text);
  const [localPlaybackTime, setLocalPlaybackTime] = useState(0);
  const [isSnappingTempo, setIsSnappingTempo] = useState(false);
  const [stretchMode, setStretchMode] = useState<TimeStretchMode>('wsola');
  const [showModeSelect, setShowModeSelect] = useState(false);
  const [snapFeedback, setSnapFeedback] = useState<string | null>(null);
  const [isGeneratingVideoPrompt, setIsGeneratingVideoPrompt] = useState(false);
  const [isVideoPromptExpanded, setIsVideoPromptExpanded] = useState(false);
  const [copiedType, setCopiedType] = useState<'ru' | 'en' | null>(null);

  // Smooth local playback timer for single clip preview
  useEffect(() => {
    if (!isPlayingClip) {
      setLocalPlaybackTime(0);
      return;
    }
    const startTime = performance.now();
    let animId: number;

    const update = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      setLocalPlaybackTime(elapsed);
      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isPlayingClip]);

  // Determine current relative playback offset within this segment (0 to duration)
  const currentPlaybackTime = useMemo(() => {
    if (isMasterPlaying && isActive && typeof masterCurrentTime === 'number') {
      return Math.max(0, masterCurrentTime - segment.startTime);
    }
    if (isPlayingClip) {
      return localPlaybackTime;
    }
    return 0;
  }, [isMasterPlaying, isActive, masterCurrentTime, segment.startTime, isPlayingClip, localPlaybackTime]);

  // Audio duration and timing comparison
  const plannedDuration = segment.duration;
  const currentAudioDuration = segment.audioDuration || plannedDuration;
  const timeDifference = Number((currentAudioDuration - plannedDuration).toFixed(2));
  const isExactMatch = Boolean(segment.audioUrl) && Math.abs(timeDifference) < 0.05;

  // Handle Snap Tempo via Web Audio API pitch shifting or stretching
  const handleSnapTempo = async (modeToUse: TimeStretchMode = stretchMode) => {
    if (!segment.audioUrl || isSnappingTempo) return;
    setIsSnappingTempo(true);
    setSnapFeedback(null);

    try {
      const result = await fitAudioToDuration(segment.audioUrl, plannedDuration, modeToUse);
      if (onUpdateSegmentAudio) {
        onUpdateSegmentAudio(segment.id, result.dataUrl, result.newDuration);
      }
      const label =
        timeDifference > 0.05
          ? `Сжато на ${(timeDifference).toFixed(1)}с`
          : timeDifference < -0.05
          ? `Растянуто на ${(Math.abs(timeDifference)).toFixed(1)}с`
          : `Темп синхронизирован (${plannedDuration.toFixed(1)}с)`;
      setSnapFeedback(label);
      setTimeout(() => setSnapFeedback(null), 3500);
    } catch (err: any) {
      console.error('Error fitting tempo with Web Audio API:', err);
      setSnapFeedback('Ошибка пересчёта');
      setTimeout(() => setSnapFeedback(null), 2500);
    } finally {
      setIsSnappingTempo(false);
    }
  };

  // Handle seeking from waveform interaction
  const handleWaveformSeek = (fraction: number) => {
    const targetSecond = segment.startTime + fraction * segment.duration;
    onSeek(targetSecond);
  };

  // Generate detailed video prompt using Gemini API
  const handleGenerateVideoPrompt = async () => {
    if (isGeneratingVideoPrompt) return;
    setIsGeneratingVideoPrompt(true);
    try {
      const promptDetails = await generateVideoPromptWithGemini(segment);
      setIsVideoPromptExpanded(true);
      if (onUpdateVideoPrompt) {
        onUpdateVideoPrompt(segment.id, promptDetails);
      }
    } catch (e) {
      console.error('Failed to generate video prompt:', e);
    } finally {
      setIsGeneratingVideoPrompt(false);
    }
  };

  const handleCopyPrompt = (text: string, type: 'ru' | 'en') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleSaveText = () => {
    onUpdateText(segment.id, textVal);
    setIsEditing(false);
  };

  // Analyze emotional tone based on keywords in emotionDescription, emotionKey and text
  const emotionAnalysis = useMemo(
    () => analyzeEmotionTone(segment.emotionDescription, segment.emotionKey, segment.text),
    [segment.emotionDescription, segment.emotionKey, segment.text]
  );

  const renderEmotionIcon = (iconName: EmotionAnalysis['iconName']) => {
    switch (iconName) {
      case 'heart':
        return <Heart className="w-3 h-3 text-rose-400 fill-rose-500/20" />;
      case 'zap':
        return <Zap className="w-3 h-3 text-cyan-400 fill-cyan-500/20" />;
      case 'shield':
        return <Shield className="w-3 h-3 text-slate-300" />;
      case 'trophy':
        return <Trophy className="w-3 h-3 text-yellow-400 fill-yellow-500/20" />;
      case 'sparkles':
        return <Sparkles className="w-3 h-3 text-purple-400" />;
      case 'sun':
      default:
        return <Sun className="w-3 h-3 text-rose-400" />;
    }
  };

  const getCategoryTheme = (cat: VoiceSegment['category']) => {
    switch (cat) {
      case 'childhood':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          badge: 'Детство',
        };
      case 'motherhood':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          badge: 'Материнство',
        };
      case 'sport':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          badge: 'Спорт & Танец',
        };
      case 'recovery':
        return {
          bg: 'bg-slate-400/10 border-slate-400/30 text-slate-300',
          badge: 'Испытание & Воля',
        };
      case 'triumph':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
          badge: 'Триумф & Подиум',
        };
      case 'present':
      default:
        return {
          bg: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300',
          badge: 'Мне 50 & Будущее',
        };
    }
  };

  const theme = getCategoryTheme(segment.category);

  return (
    <div
      className={`rounded-2xl p-4 transition-all border ${
        isActive
          ? 'bg-zinc-900 border-rose-500 shadow-xl shadow-rose-950/20 ring-1 ring-rose-500/40'
          : 'bg-zinc-950/80 hover:bg-zinc-900/90 border-zinc-800/80 shadow-md'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {/* Seek jump button */}
          <button
            onClick={() => onSeek(segment.startTime)}
            className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-rose-900/50 text-zinc-200 hover:text-rose-200 border border-zinc-700 transition-colors flex items-center gap-1.5"
            title="Перейти к этой секунде на таймлайне"
          >
            <span>{segment.startTime}–{segment.endTime} сек</span>
            <span className="text-[10px] text-zinc-400">({segment.duration}с)</span>
          </button>

          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${theme.bg}`}>
            {theme.badge}
          </span>

          {/* Emotional Tone Indicator Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10.5px] font-medium transition-all ${emotionAnalysis.badgeClass} cursor-help`}
            title={`Эмоциональный тон: ${emotionAnalysis.label} (${emotionAnalysis.secondaryLabel})\n${emotionAnalysis.summary}\nКлючевые слова: ${emotionAnalysis.keywordsDetected.join(', ')}`}
          >
            {renderEmotionIcon(emotionAnalysis.iconName)}
            <span>{emotionAnalysis.label}</span>
            <span
              className="flex items-center gap-0.5 ml-0.5"
              title={`Интенсивность эмоциональной энергии: ${emotionAnalysis.energyLevel}/5`}
            >
              {[1, 2, 3, 4, 5].map((lvl) => (
                <span
                  key={lvl}
                  className={`w-1 h-1 rounded-full ${
                    lvl <= emotionAnalysis.energyLevel
                      ? 'bg-current opacity-90'
                      : 'bg-zinc-700 opacity-40'
                  }`}
                />
              ))}
            </span>
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          {segment.status === 'generating' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Озвучивание...
            </span>
          )}
          {segment.status === 'ready' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Volume2 className="w-3 h-3 text-emerald-400" />
              Готово
            </span>
          )}
          {segment.status === 'idle' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700">
              Ожидает озвучки
            </span>
          )}
        </div>
      </div>

      {/* Voiceover Text Content */}
      <div className="my-2.5">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              rows={2}
              className="w-full bg-zinc-900 border border-rose-500/60 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setTextVal(segment.text);
                  setIsEditing(false);
                }}
                className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveText}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <p className="text-sm md:text-base font-semibold text-white tracking-normal leading-relaxed pr-8">
              <span className="text-rose-400 font-serif mr-1">«</span>
              {segment.text}
              <span className="text-rose-400 font-serif ml-1">»</span>
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-0 right-0 p-1 text-zinc-500 hover:text-zinc-200 opacity-60 hover:opacity-100 transition-opacity"
              title="Редактировать текст реплики"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Audio Waveform & Acoustic Dynamics Visualizer (HTML5 Canvas + AudioContext) */}
      {Boolean(segment.audioUrl) && (
        <WaveformVisualizer
          audioSource={segment.audioUrl}
          audioUrl={segment.audioUrl}
          duration={segment.duration}
          actualDuration={segment.audioDuration}
          status={segment.status}
          isPlaying={isPlayingClip || (isMasterPlaying && isActive)}
          currentPlaybackTime={currentPlaybackTime}
          onSeek={handleWaveformSeek}
          text={segment.text}
        />
      )}

      {/* Video & Camera Direction Box with Gemini Prompt Generator */}
      <div className="mt-2 text-xs bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/60 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <p className="text-zinc-300 font-light leading-snug flex-1">
            <strong className="text-zinc-400 font-normal">Кадр: </strong>
            {segment.sceneVisual}
          </p>

          {/* Button: 'Сгенерировать промпт для видео' */}
          <button
            onClick={handleGenerateVideoPrompt}
            disabled={isGeneratingVideoPrompt}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600/30 via-purple-600/30 to-pink-600/30 hover:from-violet-600/50 hover:to-pink-600/50 text-violet-200 hover:text-white border border-violet-500/40 shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Сгенерировать развернутое кинематографичное описание (camera movement, lighting, style) через Gemini API"
          >
            {isGeneratingVideoPrompt ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-300" />
                <span>Генерация промпта...</span>
              </>
            ) : segment.videoPrompt ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Обновить промпт (AI)</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5 text-violet-300" />
                <span>Сгенерировать промпт для видео</span>
              </>
            )}
          </button>
        </div>

        {/* Camera movement & Intonation line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-[11px] text-zinc-400 border-t border-zinc-800/50">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-amber-300/90 font-medium">
              <Camera className="w-3 h-3 text-amber-400" />
              {segment.cameraMovement}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-rose-300">
              <strong>Интонация:</strong> {segment.emotionKey} ({segment.emotionDescription})
            </span>
            {emotionAnalysis.keywordsDetected.length > 0 && (
              <span
                className={`text-[9.5px] px-1.5 py-0.5 rounded border font-mono ${emotionAnalysis.bgClass} ${emotionAnalysis.color} ${emotionAnalysis.borderClass}`}
                title={`Распознанные маркеры эмоционального тона: ${emotionAnalysis.keywordsDetected.join(', ')}`}
              >
                Тон: {emotionAnalysis.label} ({emotionAnalysis.keywordsDetected.join(', ')})
              </span>
            )}
          </div>

          {segment.videoPrompt && (
            <button
              onClick={() => setIsVideoPromptExpanded(!isVideoPromptExpanded)}
              className="text-[11px] text-violet-300 hover:text-violet-100 flex items-center gap-1 transition-colors font-medium ml-auto"
            >
              <span>{isVideoPromptExpanded ? 'Скрыть детали' : 'Показать промпт'}</span>
              {isVideoPromptExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          )}
        </div>

        {/* Detailed Video Prompt Card Generated by Gemini */}
        {segment.videoPrompt && isVideoPromptExpanded && (
          <div className="mt-2.5 pt-2.5 border-t border-violet-500/30 bg-zinc-950/80 rounded-xl p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-[11px] font-semibold text-violet-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Кинематографичный видео-ряд (Gemini API)
              </span>
              {segment.videoPrompt.generatedAt && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  Создан в {segment.videoPrompt.generatedAt}
                </span>
              )}
            </div>

            {/* Grid: Camera Movement, Lighting, Style */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
              {/* Camera Movement */}
              <div className="bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800 space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Движение камеры (Camera):</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {segment.videoPrompt.cameraMovement}
                </p>
              </div>

              {/* Lighting */}
              <div className="bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800 space-y-1">
                <div className="font-semibold text-amber-200 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Освещение (Lighting):</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {segment.videoPrompt.lighting}
                </p>
              </div>

              {/* Style & Optics */}
              <div className="bg-zinc-900/90 rounded-xl p-2.5 border border-zinc-800 space-y-1">
                <div className="font-semibold text-violet-300 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-violet-400" />
                  <span>Стиль & Оптика (Style):</span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {segment.videoPrompt.style}
                </p>
              </div>
            </div>

            {/* Composition notes if present */}
            {segment.videoPrompt.composition && (
              <div className="bg-zinc-900/60 rounded-lg px-2.5 py-1.5 border border-zinc-800/80 text-[11px] text-zinc-300 flex items-center gap-1.5">
                <strong className="text-zinc-400 font-semibold shrink-0">Композиция:</strong>
                <span>{segment.videoPrompt.composition}</span>
              </div>
            )}

            {/* Prompt Copy Boxes (English for Runway/Kling/Sora + Russian narrative) */}
            <div className="space-y-2 pt-1">
              {/* English AI Video Prompt */}
              <div className="bg-zinc-900/95 rounded-xl p-2.5 border border-zinc-700/80">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 flex items-center gap-1">
                    <span>Промпт для нейросети (Runway Gen-3 / Kling / Sora / Luma):</span>
                  </span>
                  <button
                    onClick={() => handleCopyPrompt(segment.videoPrompt!.fullPromptEn, 'en')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-colors border border-zinc-700 active:scale-95"
                    title="Скопировать английский промпт для генерации видео"
                  >
                    {copiedType === 'en' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Копировать EN</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] font-mono text-zinc-300 leading-relaxed select-all bg-black/50 p-2 rounded-lg border border-zinc-800">
                  {segment.videoPrompt.fullPromptEn}
                </p>
              </div>

              {/* Russian Prompt Description */}
              <div className="bg-zinc-900/95 rounded-xl p-2.5 border border-zinc-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300">
                    Режиссерское описание кадра (Русский):
                  </span>
                  <button
                    onClick={() => handleCopyPrompt(segment.videoPrompt!.fullPrompt, 'ru')}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-colors border border-zinc-800 active:scale-95"
                    title="Скопировать русское режиссерское описание"
                  >
                    {copiedType === 'ru' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Скопировано!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Копировать RU</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {segment.videoPrompt.fullPrompt}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
        <div className="flex flex-wrap items-center gap-2">
          {/* Play individual audio clip */}
          <button
            onClick={() => onPlaySingleClip(segment)}
            disabled={segment.status === 'generating'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
            title="Прослушать эту реплику отдельно"
          >
            {isPlayingClip ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current text-rose-400" />
                <span>Стоп</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                <span>Слушать</span>
              </>
            )}
          </button>

          {/* Download clip WAV */}
          {segment.audioUrl && (
            <button
              onClick={() => onDownloadClip(segment)}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
              title="Скачать аудио этой реплики (.wav)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Button: 'Привязать темп' */}
          {Boolean(segment.audioUrl) && (
            <div className="relative inline-flex items-center">
              <button
                onClick={() => handleSnapTempo()}
                disabled={isSnappingTempo || segment.status === 'generating'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isExactMatch
                    ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                    : 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-200 border border-amber-500/50 shadow-sm shadow-amber-950/20 active:scale-95'
                }`}
                title={
                  isExactMatch
                    ? `Длительность аудио (${segment.duration.toFixed(1)}с) идеально синхронизирована с таймингом сцены`
                    : `Автоматически пересчитать длительность аудио (${currentAudioDuration.toFixed(1)}с → ${plannedDuration.toFixed(1)}с) через Web Audio API pitch shifting или растяжение`
                }
              >
                {isSnappingTempo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Привязка темпа...</span>
                  </>
                ) : isExactMatch ? (
                  <>
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Темп привязан ({segment.duration.toFixed(1)}с)</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>Привязать темп</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {currentAudioDuration.toFixed(1)}с → {plannedDuration.toFixed(1)}с
                    </span>
                  </>
                )}
              </button>

              {/* Mode Settings Button */}
              <button
                onClick={() => setShowModeSelect(!showModeSelect)}
                disabled={isSnappingTempo}
                className="ml-1 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
                title="Выбрать алгоритм растяжения (WSOLA с сохранением тона / Varispeed ресэмплинг)"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              {/* Mode selection popover */}
              {showModeSelect && (
                <div className="absolute left-0 bottom-full mb-2 w-72 bg-zinc-900 border border-zinc-700 rounded-xl p-3 shadow-2xl z-40 text-xs">
                  <div className="text-[11px] font-semibold text-zinc-300 mb-2 flex items-center justify-between border-b border-zinc-800 pb-1.5">
                    <span>Алгоритм Web Audio API:</span>
                    <button
                      onClick={() => setShowModeSelect(false)}
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        setStretchMode('wsola');
                        setShowModeSelect(false);
                        handleSnapTempo('wsola');
                      }}
                      className={`w-full text-left p-2 rounded-lg transition-colors flex flex-col ${
                        stretchMode === 'wsola'
                          ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="font-medium text-xs flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-rose-400" />
                        <span>WSOLA (Сохранение тона)</span>
                        {stretchMode === 'wsola' && <Check className="w-3.5 h-3.5 text-rose-400 ml-auto" />}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        Сохраняет естественную высоту и тембр голоса, меняя только скорость произношения
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setStretchMode('varispeed');
                        setShowModeSelect(false);
                        handleSnapTempo('varispeed');
                      }}
                      className={`w-full text-left p-2 rounded-lg transition-colors flex flex-col ${
                        stretchMode === 'varispeed'
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                          : 'hover:bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      <span className="font-medium text-xs flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-amber-400" />
                        <span>Varispeed (Ресэмплинг)</span>
                        {stretchMode === 'varispeed' && <Check className="w-3.5 h-3.5 text-amber-400 ml-auto" />}
                      </span>
                      <span className="text-[10px] text-zinc-400 mt-0.5">
                        Классическое аналоговое ускорение с пропорциональным изменением высоты тона
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback toast / pill */}
              {snapFeedback && (
                <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 rounded-lg animate-pulse whitespace-nowrap">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  {snapFeedback}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Generate with Gemini TTS */}
        <button
          onClick={() => onGenerateSingle(segment.id)}
          disabled={segment.status === 'generating'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-rose-600/90 to-amber-600/90 hover:from-rose-500 hover:to-amber-500 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
          title="Сгенерировать озвучку реплики женским голосом через Gemini"
        >
          {segment.status === 'generating' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Генерация...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5 text-amber-200" />
              <span>{segment.status === 'ready' ? 'Переозвучить' : 'Озвучить (AI)'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
