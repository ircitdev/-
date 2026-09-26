import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Camera,
  Sparkles,
  ShieldCheck,
  Heart,
  Award,
  Trophy,
  Compass,
} from 'lucide-react';
import { VoiceSegment } from '../types';
import { formatTimeDisplay } from '../utils/audioEngine';

interface VideoVisualizerProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  activeSegment: VoiceSegment | null;
  onSeek: (time: number) => void;
  uploadedVideoUrl: string | null;
  onVideoUpload: (file: File) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

// Visual ambiance presets for the 14 scenes
const getSceneTheme = (id: number) => {
  switch (id) {
    case 1:
      return {
        gradient: 'from-amber-950/80 via-stone-900 to-amber-900/40',
        accent: 'text-amber-300',
        border: 'border-amber-500/30',
        icon: <Sparkles className="w-5 h-5 text-amber-400" />,
        title: '01. Детство (50 лет назад)',
        glowColor: 'bg-amber-500/20',
      };
    case 2:
      return {
        gradient: 'from-orange-950/80 via-stone-900 to-amber-800/40',
        accent: 'text-orange-300',
        border: 'border-orange-500/30',
        icon: <Compass className="w-5 h-5 text-orange-400" />,
        title: '02. Школа и книги (40 лет назад)',
        glowColor: 'bg-orange-500/20',
      };
    case 3:
      return {
        gradient: 'from-rose-950/80 via-zinc-900 to-amber-950/50',
        accent: 'text-rose-300',
        border: 'border-rose-500/30',
        icon: <Heart className="w-5 h-5 text-rose-400" />,
        title: '03. Первенец — Рождение сына (30 лет назад)',
        glowColor: 'bg-rose-500/20',
      };
    case 4:
      return {
        gradient: 'from-emerald-950/85 via-zinc-900 to-teal-950/50',
        accent: 'text-emerald-300',
        border: 'border-emerald-500/30',
        icon: <Award className="w-5 h-5 text-emerald-400" />,
        title: '04. Сын и футбол (20 лет назад)',
        glowColor: 'bg-emerald-500/20',
      };
    case 5:
      return {
        gradient: 'from-pink-950/80 via-zinc-900 to-rose-950/50',
        accent: 'text-pink-300',
        border: 'border-pink-500/30',
        icon: <Heart className="w-5 h-5 text-pink-400" />,
        title: '05. Рождение дочери (12 лет назад)',
        glowColor: 'bg-pink-500/20',
      };
    case 6:
      return {
        gradient: 'from-cyan-950/85 via-zinc-900 to-blue-950/60',
        accent: 'text-cyan-300',
        border: 'border-cyan-500/30',
        icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
        title: '06. Дочь на льду и танцы (5 лет назад)',
        glowColor: 'bg-cyan-500/20',
      };
    case 7:
      return {
        gradient: 'from-blue-950/85 via-zinc-900 to-indigo-950/60',
        accent: 'text-blue-300',
        border: 'border-blue-500/30',
        icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
        title: '07. Хореограф команды фигуристов (3 года назад)',
        glowColor: 'bg-blue-500/20',
      };
    case 8:
      return {
        gradient: 'from-slate-950 via-zinc-900 to-cyan-950/40',
        accent: 'text-slate-300',
        border: 'border-cyan-700/30',
        icon: <Heart className="w-5 h-5 text-cyan-400" />,
        title: '08. Операция на ноги. Костыли (1 год назад)',
        glowColor: 'bg-cyan-600/15',
      };
    case 9:
      return {
        gradient: 'from-zinc-950 via-stone-900 to-amber-950/40',
        accent: 'text-amber-400',
        border: 'border-amber-600/40',
        icon: <Award className="w-5 h-5 text-amber-400" />,
        title: '09. Первый шаг. Несгибаемая воля',
        glowColor: 'bg-amber-600/20',
      };
    case 10:
      return {
        gradient: 'from-amber-950 via-rose-950/70 to-purple-950/50',
        accent: 'text-amber-200',
        border: 'border-amber-400/50',
        icon: <Trophy className="w-5 h-5 text-amber-300" />,
        title: '10. Победа: «Миссис Волгоград» (6 месяцев назад)',
        glowColor: 'bg-amber-400/25',
      };
    case 11:
      return {
        gradient: 'from-blue-950 via-indigo-950 to-violet-950/70',
        accent: 'text-blue-200',
        border: 'border-blue-400/40',
        icon: <Trophy className="w-5 h-5 text-blue-300" />,
        title: '11. Mrs World Russia — Номинация за магнетизм',
        glowColor: 'bg-indigo-500/25',
      };
    case 12:
      return {
        gradient: 'from-purple-950 via-fuchsia-950/70 to-amber-950/50',
        accent: 'text-purple-200',
        border: 'border-purple-400/40',
        icon: <Camera className="w-5 h-5 text-fuchsia-400" />,
        title: '12. Подиум недели моды — Хедлайнер проекта',
        glowColor: 'bg-fuchsia-500/25',
      };
    case 13:
      return {
        gradient: 'from-zinc-950 via-neutral-900 to-slate-900',
        accent: 'text-zinc-200',
        border: 'border-zinc-500/40',
        icon: <Compass className="w-5 h-5 text-zinc-300" />,
        title: '13. Зеркальный интерьер: А это я сейчас',
        glowColor: 'bg-slate-400/15',
      };
    case 14:
    default:
      return {
        gradient: 'from-amber-950 via-rose-950/80 to-purple-950/80',
        accent: 'text-amber-200',
        border: 'border-amber-400/60',
        icon: <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />,
        title: '14. Финальный манифест: «Мне 50. Всё только начинается»',
        glowColor: 'bg-rose-500/25',
      };
  }
};

/**
 * Individual scene presentation layer used for smooth CSS cross-fading
 */
const SceneStoryboardLayer: React.FC<{
  segment: VoiceSegment | null;
  opacityClass: string;
  isForeground?: boolean;
}> = ({ segment, opacityClass, isForeground = false }) => {
  if (!segment) return null;
  const theme = getSceneTheme(segment.id);

  return (
    <div
      className={`absolute inset-0 w-full h-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-br ${
        theme.gradient
      } select-none transition-all duration-700 ease-in-out ${opacityClass} ${
        isForeground ? 'pointer-events-auto z-10' : 'pointer-events-none z-0'
      }`}
    >
      {/* Dynamic ambient background glow */}
      <div className="absolute inset-0 opacity-25 pointer-events-none overflow-hidden">
        <div
          className={`absolute top-1/4 left-1/3 w-96 h-96 rounded-full ${theme.glowColor} blur-3xl animate-pulse`}
        />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-amber-400/15 blur-3xl" />
      </div>

      {/* Top Info Bar Left: Scene Title Badge */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white shadow-sm transition-transform duration-700">
          {theme.icon}
          <span className="font-semibold tracking-wide">{theme.title}</span>
        </div>
      </div>

      {/* Center Storyboard Focus: Scene & Camera Direction HUD */}
      <div className="relative z-10 my-auto text-center max-w-2xl mx-auto px-4 py-3 transition-all duration-700 transform">
        <div className="inline-block mb-2 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] text-zinc-300 font-medium tracking-wide border border-white/5">
          {segment.sceneTitle || 'Сцена'} ({segment.startTime}–{segment.endTime} сек)
        </div>

        {/* Visual Description */}
        <p className="text-xs md:text-sm text-zinc-200/90 leading-relaxed font-light drop-shadow-md">
          <span className="text-zinc-400 mr-1.5 font-normal">Кадр:</span>
          {segment.sceneVisual}
        </p>

        {/* Camera Movement HUD */}
        {segment.cameraMovement && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-950/50 px-3 py-1 rounded-lg border border-amber-500/25 shadow-sm">
            <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{segment.cameraMovement}</span>
          </div>
        )}
      </div>

      {/* Bottom Live Subtitle Display */}
      <div className="relative z-10 text-center transition-all duration-700">
        <div className="inline-block max-w-3xl px-5 py-2.5 rounded-2xl bg-black/80 backdrop-blur-lg border border-white/15 shadow-2xl">
          <p className="text-sm md:text-lg lg:text-xl font-bold tracking-normal text-white drop-shadow-lg leading-snug">
            {segment.text ? (
              <>
                <span className="text-rose-400 font-serif mr-1.5">«</span>
                {segment.text}
                <span className="text-rose-400 font-serif ml-1.5">»</span>
              </>
            ) : (
              <span className="text-zinc-500 italic text-sm">Пауза / Музыкальный переход</span>
            )}
          </p>
          {segment.emotionKey && (
            <div className="mt-1 flex items-center justify-center gap-2 text-[10px] md:text-xs text-zinc-400">
              <span className="text-rose-400">•</span>
              <span>
                Интонация: <strong className="text-zinc-200">{segment.emotionKey}</strong>
              </span>
              {segment.sfx && (
                <>
                  <span className="text-zinc-600">|</span>
                  <span>
                    Звук: <span className="text-amber-300/90">{segment.sfx}</span>
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const VideoVisualizer: React.FC<VideoVisualizerProps> = ({
  currentTime,
  duration,
  isPlaying,
  activeSegment,
  uploadedVideoUrl,
  onVideoUpload,
  videoRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // States to facilitate smooth CSS cross-fade transitions between scenes
  const [currentSeg, setCurrentSeg] = useState<VoiceSegment | null>(activeSegment);
  const [prevSeg, setPrevSeg] = useState<VoiceSegment | null>(null);
  const [isCrossFading, setIsCrossFading] = useState<boolean>(false);

  // Sync HTML5 video currentTime with studio currentTime
  useEffect(() => {
    if (videoRef.current && uploadedVideoUrl) {
      if (Math.abs(videoRef.current.currentTime - currentTime) > 0.35) {
        videoRef.current.currentTime = currentTime;
      }
      if (isPlaying && videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else if (!isPlaying && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [currentTime, isPlaying, uploadedVideoUrl, videoRef]);

  // Handle activeSegment changes with smooth dual-layer cross-fade
  useEffect(() => {
    if (activeSegment && activeSegment.id !== currentSeg?.id) {
      setPrevSeg(currentSeg);
      setCurrentSeg(activeSegment);
      setIsCrossFading(true);

      // Clean up previous scene layer once CSS cross-fade (700ms) completes
      const timer = setTimeout(() => {
        setIsCrossFading(false);
        setPrevSeg(null);
      }, 700);

      return () => clearTimeout(timer);
    }
  }, [activeSegment, currentSeg]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onVideoUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (
      file &&
      (file.type.startsWith('video/') ||
        file.name.endsWith('.mp4') ||
        file.name.endsWith('.mov') ||
        file.name.endsWith('.webm'))
    ) {
      onVideoUpload(file);
    }
  };

  const currentTheme = getSceneTheme(currentSeg?.id || activeSegment?.id || 1);

  return (
    <div
      className={`relative w-full aspect-[16/9] md:aspect-[16/9.2] bg-zinc-950 rounded-2xl overflow-hidden border shadow-2xl transition-colors duration-700 ${
        currentTheme.border
      } ${isDragging ? 'ring-2 ring-rose-500 scale-[1.005]' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {/* Real Video Element if user uploaded video */}
      {uploadedVideoUrl ? (
        <video
          ref={videoRef}
          src={uploadedVideoUrl}
          playsInline
          muted={false}
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        /* Cinematic Storyboard Preview Canvas with CSS Cross-Fade */
        <div className="relative w-full h-full overflow-hidden">
          {/* Outgoing previous scene layer (fading out smoothly) */}
          {prevSeg && isCrossFading && (
            <SceneStoryboardLayer
              segment={prevSeg}
              opacityClass="opacity-0 scale-[0.99] filter blur-[0.5px]"
              isForeground={false}
            />
          )}

          {/* Incoming current scene layer (fading in smoothly) */}
          <SceneStoryboardLayer
            segment={currentSeg || activeSegment}
            opacityClass={isCrossFading ? 'opacity-100 scale-100' : 'opacity-100 scale-100'}
            isForeground={true}
          />
        </div>
      )}

      {/* Subtle 'Recording' / Timeline Processing Pulse Overlay */}
      {isPlaying && (
        <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
          {/* Perimeter subtle pulsing studio glow */}
          <div className="absolute inset-0 ring-1 ring-rose-500/40 shadow-[inset_0_0_28px_rgba(244,63,94,0.18)] animate-pulse" />

          {/* Camera Viewfinder Reticle Corner Brackets */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-rose-500/70" />
          <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-rose-500/70" />
          <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-rose-500/70" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-rose-500/70" />

          {/* Scanning Timeline Bar at the bottom */}
          <div className="absolute bottom-0 inset-x-0 h-1 bg-black/40 backdrop-blur-sm z-25">
            <div
              style={{ width: `${(currentTime / duration) * 100}%` }}
              className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 shadow-[0_0_10px_rgba(244,63,94,0.9)] transition-all duration-75 relative"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_6px_#fff]" />
            </div>
          </div>
        </div>
      )}

      {/* Sticky Persistent Top-Right HUD: REC Status, Timecode & Upload custom video button */}
      <div className="absolute top-4 md:top-6 right-4 md:right-6 z-30 flex flex-wrap items-center gap-2">
        {/* Recording / Live Processing Status Pill */}
        {isPlaying && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-950/85 backdrop-blur-md border border-rose-500/60 text-rose-200 text-xs font-mono shadow-lg shadow-rose-950/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
            </span>
            <span className="font-bold tracking-wider text-[11px] text-white">REC</span>
            <span className="text-rose-400/60 font-light">•</span>
            <span className="text-[10px] text-rose-200 font-sans font-medium hidden sm:inline">
              {activeSegment ? `Сцена #${activeSegment.id} (${activeSegment.startTime}–${activeSegment.endTime}с)` : 'Эфир'}
            </span>
          </div>
        )}

        {/* Master Timecode Pill */}
        <span className="font-mono text-xs md:text-sm px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-zinc-300 shadow-md">
          <span className="text-rose-400 font-bold">{formatTimeDisplay(currentTime)}</span> /{' '}
          {formatTimeDisplay(duration)}
        </span>

        {/* Upload custom video file button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs transition-colors shadow-lg active:scale-95"
          title="Загрузить свой видеофайл (MP4) для точной проверки синхронизации"
        >
          <Upload className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden sm:inline">Своё видео</span>
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Drop zone indicator */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-rose-950/80 backdrop-blur-sm border-2 border-dashed border-rose-400 rounded-2xl flex flex-col items-center justify-center text-white">
          <Upload className="w-12 h-12 text-rose-300 animate-bounce mb-2" />
          <p className="text-base font-semibold">Отпустите видео сюда для синхронизации</p>
          <p className="text-xs text-zinc-300 mt-1">Поддерживаются форматы MP4, MOV, WebM</p>
        </div>
      )}
    </div>
  );
};
