import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Heart,
  Shield,
  Trophy,
  Sun,
  AlertCircle,
  Upload,
  Mic,
  FileAudio,
} from 'lucide-react';
import { VoiceSegment, VideoPromptDetails } from '../types';
import { WaveformVisualizer } from './WaveformVisualizer';
import { fitAudioToDuration, TimeStretchMode } from '../utils/timeStretch';
import { generateVideoPromptWithGemini } from '../utils/videoPromptService';
import { analyzeEmotionTone, EmotionAnalysis } from '../utils/emotionAnalyzer';
import { transcribeAudioFile } from '../utils/sttService';

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
  originalText?: string;
  onPrevScene?: () => void;
  onNextScene?: () => void;
  autoScroll?: boolean;
  onUploadAudioSTT?: (segmentId: number, file: File) => Promise<void>;
  isTranscribing?: boolean;
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
  originalText,
  onPrevScene,
  onNextScene,
  autoScroll = false,
  onUploadAudioSTT,
  isTranscribing = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
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
  const [isLocalTranscribing, setIsLocalTranscribing] = useState(false);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);

  // Sync textVal when segment.text changes from STT or external updates
  useEffect(() => {
    setTextVal(segment.text);
  }, [segment.text]);

  // Handle uploaded audio file & run Speech-to-Text
  const handleAudioFile = async (file: File) => {
    if (!file) return;
    setIsLocalTranscribing(true);
    try {
      if (onUploadAudioSTT) {
        await onUploadAudioSTT(segment.id, file);
      } else {
        const result = await transcribeAudioFile(file, `Сцена #${segment.id}: ${segment.sceneTitle}`);
        if (result.text) {
          setTextVal(result.text);
          onUpdateText(segment.id, result.text);
        }
        if (onUpdateSegmentAudio) {
          onUpdateSegmentAudio(segment.id, result.audioUrl, result.duration);
        }
      }
    } catch (err: any) {
      console.error('STT error in card:', err);
    } finally {
      setIsLocalTranscribing(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  // Auto-scroll to card when active
  useEffect(() => {
    if (isActive && autoScroll && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive, autoScroll]);

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

  // Text metrics & speech duration estimator (Russian speech ~ 14 chars/sec at 1.0x)
  const charCount = textVal.length;
  const wordCount = textVal.trim() ? textVal.trim().split(/\s+/).length : 0;
  const estDuration = Number((charCount / 14).toFixed(1));
  const estDelta = Number((estDuration - segment.duration).toFixed(1));
  const isTextModified = Boolean(originalText && textVal !== originalText);

  return (
    <div
      ref={cardRef}
      id={`scene-card-${segment.id}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingAudio(true);
      }}
      onDragLeave={() => setIsDraggingAudio(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingAudio(false);
        const file = e.dataTransfer.files?.[0];
        if (
          file &&
          (file.type.startsWith('audio/') ||
            file.name.match(/\.(wav|mp3|m4a|ogg|aac|webm|flac)$/i))
        ) {
          handleAudioFile(file);
        }
      }}
      className={`relative rounded-2xl p-4.5 transition-all duration-300 border ${
        isDraggingAudio
          ? 'ring-2 ring-[#33a4d4] border-[#33a4d4] bg-[#0e2640]/90 scale-[1.01]'
          : isActive
          ? 'bg-gradient-to-b from-[#143454]/95 to-[#041426]/95 border-[#33a4d4] shadow-[0_0_30px_rgba(51,164,212,0.35)] ring-1 ring-[#33a4d4]/60'
          : 'bg-gradient-to-b from-[#0e2640]/55 to-[#040e1a]/75 hover:from-[#143454]/70 hover:to-[#08182b]/85 border-[#33a4d4]/20 hover:border-[#33a4d4]/45 shadow-[0_10px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl'
      }`}
    >
      {/* Hidden File Input for uploading custom audio with Speech-to-Text */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.m4a,.ogg,.aac,.webm,.flac"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleAudioFile(file);
        }}
      />

      {/* Drag & Drop Audio File Overlay */}
      {isDraggingAudio && (
        <div className="absolute inset-0 z-40 bg-[#030a14]/95 backdrop-blur-md border-2 border-dashed border-[#33a4d4] rounded-2xl flex flex-col items-center justify-center p-4 text-center pointer-events-none animate-fadeIn">
          <Upload className="w-10 h-10 text-[#33a4d4] animate-bounce mb-2" />
          <p className="text-sm font-bold text-[#eaf3ff]">
            Отпустите аудиофайл для сцены #{segment.id}
          </p>
          <p className="text-xs text-[#5fc1e8] mt-1 font-mono">
            Автоматическое распознавание речи (STT) и заполнение поля «текст»
          </p>
        </div>
      )}

      {/* Active Speech-to-Text Transcribing Banner */}
      {(isLocalTranscribing || isTranscribing) && (
        <div className="mb-3 p-2.5 rounded-xl bg-[#33a4d4]/15 border border-[#33a4d4]/40 flex items-center justify-between gap-2 text-xs text-[#5fc1e8] animate-pulse">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[#33a4d4]" />
            <span className="font-bold">Распознавание речи через Gemini STT...</span>
          </div>
          <span className="text-[10px] text-[#7b8ea6] hidden sm:inline">Извлечение текста из аудиозаписи</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Scene Prev/Next Navigation */}
          {(onPrevScene || onNextScene) && (
            <div className="flex items-center gap-0.5 mr-1">
              <button
                onClick={onPrevScene}
                disabled={!onPrevScene}
                className="p-1 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/20 text-[#7b8ea6] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all disabled:opacity-30 cursor-pointer"
                title="Предыдущая сцена"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onNextScene}
                disabled={!onNextScene}
                className="p-1 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/20 text-[#7b8ea6] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all disabled:opacity-30 cursor-pointer"
                title="Следующая сцена"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Seek jump button */}
          <button
            onClick={() => onSeek(segment.startTime)}
            className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/25 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            title="Перейти к этой секунде на таймлайне"
          >
            <span className="text-[#33a4d4]">#{segment.id}</span>
            <span>{segment.startTime}–{segment.endTime} сек</span>
            <span className="text-[10px] text-[#7b8ea6]">({segment.duration}с)</span>
          </button>

          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold ${theme.bg}`}>
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

        {/* Status Badge & Duration Accuracy Delta */}
        <div className="flex items-center gap-1.5">
          {segment.audioUrl && (
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                isExactMatch
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : Math.abs(timeDifference) < 0.5
                  ? 'bg-[#33a4d4]/15 text-[#5fc1e8] border-[#33a4d4]/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
              title={`Фактическая длительность озвучки: ${currentAudioDuration.toFixed(1)}с. План сцены: ${plannedDuration}с. Разница: ${(timeDifference > 0 ? '+' : '') + timeDifference.toFixed(1)}с`}
            >
              {isExactMatch ? '✓ Идеально' : `${currentAudioDuration.toFixed(1)}с (${timeDifference > 0 ? '+' : ''}${timeDifference.toFixed(1)}с)`}
            </span>
          )}

          {segment.status === 'generating' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-[#33a4d4]/15 text-[#5fc1e8] border border-[#33a4d4]/30">
              <RefreshCw className="w-3 h-3 animate-spin text-[#33a4d4]" />
              Озвучивание...
            </span>
          )}
          {segment.status === 'ready' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-[#33a4d4]/15 text-[#5fc1e8] border border-[#33a4d4]/30 shadow-[0_0_10px_rgba(51,164,212,0.25)]">
              <Volume2 className="w-3 h-3 text-[#33a4d4]" />
              Готово
            </span>
          )}
          {segment.status === 'idle' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] bg-[#02060d]/80 text-[#7b8ea6] border border-white/[0.08]">
              Ожидает озвучки
            </span>
          )}
        </div>
      </div>

      {/* Voiceover Text Content & Smart Speech Estimator */}
      <div className="my-2.5">
        {isEditing ? (
          <div className="space-y-2 bg-[#02060d]/90 p-3 rounded-2xl border border-[#33a4d4]/40">
            <textarea
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              rows={2}
              className="w-full bg-[#030a14] border border-[#33a4d4]/40 rounded-xl p-2.5 text-sm text-[#eaf3ff] focus:outline-none focus:ring-2 focus:ring-[#33a4d4]"
              placeholder="Введите текст реплики..."
            />

            {/* Speaking Duration & Length Estimator Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7b8ea6] pt-1 border-t border-[#33a4d4]/15">
              <div className="flex items-center gap-2">
                <span>{charCount} симв.</span>
                <span>•</span>
                <span>{wordCount} сл.</span>
                <span>•</span>
                <span
                  className={`font-medium ${
                    Math.abs(estDelta) <= 0.8
                      ? 'text-emerald-400'
                      : estDelta > 0.8
                      ? 'text-amber-400'
                      : 'text-sky-300'
                  }`}
                  title="Оценка хронометража при стандартном дикторском темпе ~140 слов/мин"
                >
                  ~{estDuration}с ({estDelta > 0 ? `+${estDelta}с к плану` : `${Math.abs(estDelta)}с запас`})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={isLocalTranscribing || isTranscribing}
                  className="inline-flex items-center gap-1 text-[#5fc1e8] hover:text-white transition-colors cursor-pointer"
                  title="Загрузить аудиофайл и автоматически распознать текст через Gemini STT"
                >
                  <Mic className="w-3 h-3 text-[#33a4d4]" />
                  <span>Распознать из аудио (STT)</span>
                </button>

                {isTextModified && originalText && (
                  <button
                    type="button"
                    onClick={() => setTextVal(originalText)}
                    className="inline-flex items-center gap-1 text-[#5fc1e8] hover:text-white transition-colors"
                    title="Восстановить исходный текст Александра Успешного"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>К оригиналу</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setTextVal(segment.text);
                  setIsEditing(false);
                }}
                className="px-3 py-1 text-xs rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#b6c6da] border border-white/[0.08] cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveText}
                className="px-3.5 py-1 text-xs font-semibold rounded-full bg-[#33a4d4] hover:bg-[#5fc1e8] text-[#04202b] flex items-center gap-1 shadow-[0_0_12px_rgba(51,164,212,0.4)] cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <p className="text-sm md:text-base font-semibold text-[#eaf3ff] tracking-normal leading-relaxed pr-8">
              <span className="text-[#33a4d4] font-serif mr-1">«</span>
              {segment.text}
              <span className="text-[#33a4d4] font-serif ml-1">»</span>
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-0 right-0 p-1 text-[#7b8ea6] hover:text-[#5fc1e8] opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
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
      <div className="mt-2 text-xs bg-[#02060d]/80 rounded-xl p-3 border border-[#33a4d4]/15 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <p className="text-[#b6c6da] font-light leading-snug flex-1">
            <strong className="text-[#7b8ea6] font-normal">Кадр: </strong>
            {segment.sceneVisual}
          </p>

          {/* Button: 'Сгенерировать промпт для видео' */}
          <button
            onClick={handleGenerateVideoPrompt}
            disabled={isGeneratingVideoPrompt}
            className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#33a4d4]/15 hover:bg-[#33a4d4]/25 text-[#5fc1e8] hover:text-white border border-[#33a4d4]/40 hover:border-[#33a4d4] shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Сгенерировать развернутое кинематографичное описание (camera movement, lighting, style) через Gemini API"
          >
            {isGeneratingVideoPrompt ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#33a4d4]" />
                <span>Генерация промпта...</span>
              </>
            ) : segment.videoPrompt ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-[#33a4d4]" />
                <span>Обновить промпт (AI)</span>
              </>
            ) : (
              <>
                <Film className="w-3.5 h-3.5 text-[#33a4d4]" />
                <span>Сгенерировать промпт для видео</span>
              </>
            )}
          </button>
        </div>

        {/* Camera movement & Intonation line */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 text-[11px] text-[#7b8ea6] border-t border-[#33a4d4]/10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[#33a4d4] font-medium">
              <Camera className="w-3 h-3 text-[#33a4d4]" />
              {segment.cameraMovement}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-[#b6c6da]">
              <strong className="text-[#7b8ea6]">Интонация:</strong> {segment.emotionKey} ({segment.emotionDescription})
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
              className="text-[11px] text-[#5fc1e8] hover:text-white flex items-center gap-1 transition-colors font-medium ml-auto"
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
          <div className="mt-2.5 pt-2.5 border-t border-[#33a4d4]/20 bg-[#030a14]/90 rounded-xl p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#5fc1e8]">
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
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#33a4d4]/15">
        <div className="flex flex-wrap items-center gap-2">
          {/* Play individual audio clip */}
          <button
            onClick={() => onPlaySingleClip(segment)}
            disabled={segment.status === 'generating'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/25 transition-all active:scale-95"
            title="Прослушать эту реплику отдельно"
          >
            {isPlayingClip ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current text-[#33a4d4]" />
                <span>Стоп</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-[#33a4d4]" />
                <span>Слушать</span>
              </>
            )}
          </button>

          {/* Download clip WAV */}
          {segment.audioUrl && (
            <button
              onClick={() => onDownloadClip(segment)}
              className="p-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-colors"
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isExactMatch
                    ? 'bg-[#33a4d4]/20 text-[#5fc1e8] border border-[#33a4d4]/40'
                    : 'bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/30 active:scale-95'
                }`}
                title={
                  isExactMatch
                    ? `Длительность аудио (${segment.duration.toFixed(1)}с) идеально синхронизирована с таймингом сцены`
                    : `Автоматически пересчитать длительность аудио (${currentAudioDuration.toFixed(1)}с → ${plannedDuration.toFixed(1)}с) через Web Audio API pitch shifting или растяжение`
                }
              >
                {isSnappingTempo ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#33a4d4]" />
                    <span>Привязка темпа...</span>
                  </>
                ) : isExactMatch ? (
                  <>
                    <Sliders className="w-3.5 h-3.5 text-[#33a4d4]" />
                    <span>Темп привязан ({segment.duration.toFixed(1)}с)</span>
                  </>
                ) : (
                  <>
                    <Sliders className="w-3.5 h-3.5 text-[#33a4d4]" />
                    <span>Привязать темп</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#33a4d4]/15 text-[#5fc1e8] border border-[#33a4d4]/30">
                      {currentAudioDuration.toFixed(1)}с → {plannedDuration.toFixed(1)}с
                    </span>
                  </>
                )}
              </button>

              {/* Mode Settings Button */}
              <button
                onClick={() => setShowModeSelect(!showModeSelect)}
                disabled={isSnappingTempo}
                className="ml-1 p-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#7b8ea6] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-colors"
                title="Выбрать алгоритм растяжения (WSOLA с сохранением тона / Varispeed ресэмплинг)"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              {/* Mode selection popover */}
              {showModeSelect && (
                <div className="absolute left-0 bottom-full mb-2 w-72 bg-[#030a14] border border-[#33a4d4]/30 rounded-2xl p-3 shadow-2xl z-40 text-xs">
                  <div className="text-[11px] font-semibold text-[#eaf3ff] mb-2 flex items-center justify-between border-b border-[#33a4d4]/20 pb-1.5">
                    <span>Алгоритм Web Audio API:</span>
                    <button
                      onClick={() => setShowModeSelect(false)}
                      className="text-[#7b8ea6] hover:text-white"
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
                      className={`w-full text-left p-2 rounded-xl transition-colors flex flex-col ${
                        stretchMode === 'wsola'
                          ? 'bg-[#33a4d4]/20 text-[#5fc1e8] border border-[#33a4d4]/40'
                          : 'hover:bg-white/[0.04] text-[#b6c6da]'
                      }`}
                    >
                      <span className="font-medium text-xs flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#33a4d4]" />
                        <span>WSOLA (Сохранение тона)</span>
                        {stretchMode === 'wsola' && <Check className="w-3.5 h-3.5 text-[#33a4d4] ml-auto" />}
                      </span>
                      <span className="text-[10px] text-[#7b8ea6] mt-0.5">
                        Сохраняет естественную высоту и тембр голоса, меняя только скорость произношения
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setStretchMode('varispeed');
                        setShowModeSelect(false);
                        handleSnapTempo('varispeed');
                      }}
                      className={`w-full text-left p-2 rounded-xl transition-colors flex flex-col ${
                        stretchMode === 'varispeed'
                          ? 'bg-[#33a4d4]/20 text-[#5fc1e8] border border-[#33a4d4]/40'
                          : 'hover:bg-white/[0.04] text-[#b6c6da]'
                      }`}
                    >
                      <span className="font-medium text-xs flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-[#33a4d4]" />
                        <span>Varispeed (Ресэмплинг)</span>
                        {stretchMode === 'varispeed' && <Check className="w-3.5 h-3.5 text-[#33a4d4] ml-auto" />}
                      </span>
                      <span className="text-[10px] text-[#7b8ea6] mt-0.5">
                        Классическое аналоговое ускорение с пропорциональным изменением высоты тона
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback toast / pill */}
              {snapFeedback && (
                <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#5fc1e8] bg-[#33a4d4]/15 border border-[#33a4d4]/40 px-2.5 py-0.5 rounded-full animate-pulse whitespace-nowrap">
                  <Sparkles className="w-3 h-3 text-[#33a4d4]" />
                  {snapFeedback}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Upload Custom Audio & Run Speech-to-Text Button */}
          <button
            type="button"
            onClick={() => audioInputRef.current?.click()}
            disabled={isLocalTranscribing || isTranscribing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            title="Загрузить свой аудиофайл (WAV, MP3, M4A) и автоматически распознать текст реплики через Gemini STT"
          >
            {isLocalTranscribing || isTranscribing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#33a4d4]" />
                <span>Распознавание речи...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 text-[#33a4d4]" />
                <span>Своё аудио (STT)</span>
              </>
            )}
          </button>

          {/* Generate with Gemini TTS in Uspeshnyy Style */}
          <button
            onClick={() => onGenerateSingle(segment.id)}
            disabled={segment.status === 'generating'}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold bg-[#33a4d4] hover:bg-[#5fc1e8] text-[#04202b] shadow-[0_0_14px_rgba(51,164,212,0.35)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Сгенерировать озвучку реплики женским голосом через Gemini"
          >
            {segment.status === 'generating' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#04202b]" />
                <span>Генерация...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5 text-[#04202b]" />
                <span>{segment.status === 'ready' ? 'Переозвучить' : 'Озвучить (AI)'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
