import React, { useRef, useState, useEffect } from 'react';
import { Upload, Video, Camera, Sparkles, Volume2, ShieldCheck, Heart, Award, Trophy, Compass } from 'lucide-react';
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

export const VideoVisualizer: React.FC<VideoVisualizerProps> = ({
  currentTime,
  duration,
  isPlaying,
  activeSegment,
  onSeek,
  uploadedVideoUrl,
  onVideoUpload,
  videoRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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
    if (file && (file.type.startsWith('video/') || file.name.endsWith('.mp4') || file.name.endsWith('.mov'))) {
      onVideoUpload(file);
    }
  };

  // Visual ambiance presets for the 14 scenes
  const getSceneTheme = (id: number) => {
    switch (id) {
      case 1:
        return {
          gradient: 'from-amber-950/70 via-stone-900 to-amber-900/40',
          accent: 'text-amber-300',
          border: 'border-amber-500/30',
          icon: <Sparkles className="w-5 h-5 text-amber-400" />,
          title: '01. Детство (50 лет назад)',
        };
      case 2:
        return {
          gradient: 'from-orange-950/70 via-stone-900 to-amber-800/40',
          accent: 'text-orange-300',
          border: 'border-orange-500/30',
          icon: <Compass className="w-5 h-5 text-orange-400" />,
          title: '02. Школа и книги (40 лет назад)',
        };
      case 3:
        return {
          gradient: 'from-rose-950/70 via-zinc-900 to-amber-950/50',
          accent: 'text-rose-300',
          border: 'border-rose-500/30',
          icon: <Heart className="w-5 h-5 text-rose-400" />,
          title: '03. Первенец — Рождение сына (30 лет назад)',
        };
      case 4:
        return {
          gradient: 'from-emerald-950/80 via-zinc-900 to-teal-950/50',
          accent: 'text-emerald-300',
          border: 'border-emerald-500/30',
          icon: <Award className="w-5 h-5 text-emerald-400" />,
          title: '04. Сын и футбол (20 лет назад)',
        };
      case 5:
        return {
          gradient: 'from-pink-950/70 via-zinc-900 to-rose-950/50',
          accent: 'text-pink-300',
          border: 'border-pink-500/30',
          icon: <Heart className="w-5 h-5 text-pink-400" />,
          title: '05. Рождение дочери (12 лет назад)',
        };
      case 6:
        return {
          gradient: 'from-cyan-950/80 via-zinc-900 to-blue-950/60',
          accent: 'text-cyan-300',
          border: 'border-cyan-500/30',
          icon: <Sparkles className="w-5 h-5 text-cyan-400" />,
          title: '06. Дочь на льду и танцы (5 лет назад)',
        };
      case 7:
        return {
          gradient: 'from-blue-950/80 via-zinc-900 to-indigo-950/60',
          accent: 'text-blue-300',
          border: 'border-blue-500/30',
          icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
          title: '07. Хореограф команды фигуристов (3 года назад)',
        };
      case 8:
        return {
          gradient: 'from-slate-950 via-zinc-900 to-cyan-950/40',
          accent: 'text-slate-300',
          border: 'border-cyan-700/30',
          icon: <Heart className="w-5 h-5 text-cyan-400" />,
          title: '08. Операция на ноги. Костыли (1 год назад)',
        };
      case 9:
        return {
          gradient: 'from-zinc-950 via-stone-900 to-amber-950/40',
          accent: 'text-amber-400',
          border: 'border-amber-600/40',
          icon: <Award className="w-5 h-5 text-amber-400" />,
          title: '09. Первый шаг. Несгибаемая воля',
        };
      case 10:
        return {
          gradient: 'from-amber-950/90 via-rose-950/60 to-purple-950/50',
          accent: 'text-amber-200',
          border: 'border-amber-400/50',
          icon: <Trophy className="w-5 h-5 text-amber-300" />,
          title: '10. Победа: «Миссис Волгоград» (6 месяцев назад)',
        };
      case 11:
        return {
          gradient: 'from-blue-950/90 via-indigo-950 to-violet-950/60',
          accent: 'text-blue-200',
          border: 'border-blue-400/40',
          icon: <Trophy className="w-5 h-5 text-blue-300" />,
          title: '11. Mrs World Russia — Номинация за магнетизм',
        };
      case 12:
        return {
          gradient: 'from-purple-950/90 via-fuchsia-950/60 to-amber-950/50',
          accent: 'text-purple-200',
          border: 'border-purple-400/40',
          icon: <Camera className="w-5 h-5 text-fuchsia-400" />,
          title: '12. Подиум недели моды — Хедлайнер проекта',
        };
      case 13:
        return {
          gradient: 'from-zinc-950 via-neutral-900 to-slate-900',
          accent: 'text-zinc-200',
          border: 'border-zinc-500/40',
          icon: <Compass className="w-5 h-5 text-zinc-300" />,
          title: '13. Зеркальный интерьер: А это я сейчас',
        };
      case 14:
      default:
        return {
          gradient: 'from-amber-950/90 via-rose-950/70 to-purple-950/70',
          accent: 'text-amber-200',
          border: 'border-amber-400/60',
          icon: <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />,
          title: '14. Финальный манифест: «Мне 50. Всё только начинается»',
        };
    }
  };

  const sceneTheme = getSceneTheme(activeSegment?.id || 1);

  return (
    <div
      className={`relative w-full aspect-[16/9] md:aspect-[16/9.2] bg-zinc-950 rounded-2xl overflow-hidden border shadow-2xl transition-all ${
        sceneTheme.border
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
        /* Cinematic Storyboard Preview Canvas */
        <div className={`w-full h-full flex flex-col justify-between p-4 md:p-6 bg-gradient-to-br ${sceneTheme.gradient} relative overflow-hidden select-none`}>
          {/* Subtle animated background lights */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-rose-500 blur-3xl animate-pulse" />
            <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full bg-amber-400 blur-3xl" />
          </div>

          {/* Top Info Bar */}
          <div className="relative z-10 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-white">
              {sceneTheme.icon}
              <span className="font-semibold tracking-wide">{sceneTheme.title}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs md:text-sm px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-zinc-300">
                <span className="text-rose-400 font-bold">{formatTimeDisplay(currentTime)}</span> / {formatTimeDisplay(duration)}
              </span>

              {/* Upload custom video file button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 text-xs transition-colors"
                title="Загрузить свой видеофайл (MP4) для точной проверки синхронизации"
              >
                <Upload className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Своё видео</span>
              </button>
            </div>
          </div>

          {/* Center Storyboard Focus: Scene & Camera Direction HUD */}
          <div className="relative z-10 my-auto text-center max-w-2xl mx-auto px-4 py-3">
            <div className="inline-block mb-2 px-3 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-[11px] text-zinc-300 font-medium tracking-wide">
              {activeSegment?.sceneTitle || 'Сцена'} ({activeSegment?.startTime}–{activeSegment?.endTime} сек)
            </div>

            {/* Visual Description */}
            <p className="text-xs md:text-sm text-zinc-300/90 leading-relaxed font-light drop-shadow-md">
              <span className="text-zinc-400 mr-1.5">Кадр:</span>
              {activeSegment?.sceneVisual}
            </p>

            {/* Camera Movement HUD */}
            {activeSegment?.cameraMovement && (
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-500/20">
                <Camera className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{activeSegment.cameraMovement}</span>
              </div>
            )}
          </div>

          {/* Bottom Live Subtitle Display */}
          <div className="relative z-10 text-center">
            <div className="inline-block max-w-3xl px-5 py-2.5 rounded-2xl bg-black/80 backdrop-blur-lg border border-white/15 shadow-2xl">
              <p className="text-sm md:text-lg lg:text-xl font-bold tracking-normal text-white drop-shadow-lg leading-snug">
                {activeSegment?.text ? (
                  <>
                    <span className="text-rose-400 font-serif mr-1.5">«</span>
                    {activeSegment.text}
                    <span className="text-rose-400 font-serif ml-1.5">»</span>
                  </>
                ) : (
                  <span className="text-zinc-500 italic text-sm">Пауза / Музыкальный переход</span>
                )}
              </p>
              {activeSegment?.emotionKey && (
                <div className="mt-1 flex items-center justify-center gap-2 text-[10px] md:text-xs text-zinc-400">
                  <span className="text-rose-400">•</span>
                  <span>Интонация: <strong className="text-zinc-200">{activeSegment.emotionKey}</strong></span>
                  {activeSegment.sfx && (
                    <>
                      <span className="text-zinc-600">|</span>
                      <span>Звук: <span className="text-amber-300/90">{activeSegment.sfx}</span></span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
