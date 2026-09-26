import React from 'react';
import {
  Play,
  Pause,
  Rewind,
  FastForward,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  Volume2,
  VolumeX,
  Compass,
} from 'lucide-react';
import { VoiceSegment } from '../types';
import { formatTimeDisplay } from '../utils/audioEngine';

interface FloatingMiniPlayerProps {
  isVisible: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSkip: (delta: number) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  activeSegment: VoiceSegment | null;
  onPrevSegment: () => void;
  onNextSegment: () => void;
  autoScroll: boolean;
  onToggleAutoScroll: () => void;
  onScrollToTop: () => void;
  voiceVolume: number;
  onUpdateVolume: (vol: number) => void;
  uploadedVideoUrl?: string | null;
  isVideoMuted?: boolean;
  onToggleVideoMute?: () => void;
}

export const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({
  isVisible,
  isPlaying,
  onTogglePlay,
  onSkip,
  currentTime,
  duration,
  onSeek,
  activeSegment,
  onPrevSegment,
  onNextSegment,
  autoScroll,
  onToggleAutoScroll,
  onScrollToTop,
  voiceVolume,
  onUpdateVolume,
  uploadedVideoUrl,
  isVideoMuted = false,
  onToggleVideoMute,
}) => {
  if (!isVisible) return null;

  const progressPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[#030a14]/95 backdrop-blur-xl border-t border-[#33a4d4]/30 shadow-[0_-10px_35px_rgba(0,0,0,0.7)] px-4 py-2.5 transition-all duration-300 animate-slideUp">
      {/* Top subtle mini progress bar */}
      <div
        className="absolute top-0 inset-x-0 h-1 bg-[#02060d] cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = (e.clientX - rect.left) / rect.width;
          onSeek(pos * duration);
        }}
        title="Кликните для перемотки"
      >
        <div
          style={{ width: `${progressPercent}%` }}
          className="h-full bg-gradient-to-r from-[#143454] via-[#33a4d4] to-[#5fc1e8] shadow-[0_0_8px_#33a4d4] transition-all"
        />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        {/* Left: Playback & Scene Step Controls */}
        <div className="flex items-center gap-2">
          {/* Prev scene */}
          <button
            onClick={onPrevSegment}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/20 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all active:scale-95 cursor-pointer"
            title="Предыдущая сцена ([)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Skip -5s */}
          <button
            onClick={() => onSkip(-5)}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/20 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all active:scale-95 cursor-pointer"
            title="Назад на 5 секунд (←)"
          >
            <Rewind className="w-3.5 h-3.5" />
          </button>

          {/* Master Play/Pause */}
          <button
            onClick={onTogglePlay}
            className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full bg-[#33a4d4] hover:bg-[#5fc1e8] text-[#04202b] font-bold shadow-[0_0_16px_rgba(51,164,212,0.4)] transition-all active:scale-95 cursor-pointer"
            title="Воспроизвести / Пауза (Пробел)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span className="text-xs">Пауза</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span className="text-xs">Старт</span>
              </>
            )}
          </button>

          {/* Skip +5s */}
          <button
            onClick={() => onSkip(5)}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/20 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all active:scale-95 cursor-pointer"
            title="Вперёд на 5 секунд (→)"
          >
            <FastForward className="w-3.5 h-3.5" />
          </button>

          {/* Next scene */}
          <button
            onClick={onNextSegment}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/20 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all active:scale-95 cursor-pointer"
            title="Следующая сцена (])"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Timecode badge */}
          <div className="font-mono text-xs text-[#eaf3ff] bg-[#02060d]/80 px-2.5 py-1 rounded-lg border border-[#33a4d4]/20">
            <span className="text-[#33a4d4] font-bold">{formatTimeDisplay(currentTime)}</span>
            <span className="text-[#7b8ea6]"> / 01:10.0</span>
          </div>
        </div>

        {/* Center: Current active scene info preview */}
        {activeSegment && (
          <div className="hidden md:flex items-center gap-2 max-w-md truncate">
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-[#33a4d4]/20 text-[#5fc1e8] border border-[#33a4d4]/30 shrink-0">
              #{activeSegment.id} [{activeSegment.startTime}–{activeSegment.endTime}с]
            </span>
            <p className="text-xs text-[#b6c6da] truncate">
              <span className="text-white font-medium mr-1.5">{activeSegment.sceneTitle}:</span>
              <span className="italic text-[#7b8ea6]">«{activeSegment.text}»</span>
            </p>
          </div>
        )}

        {/* Right: Quick Convenience Tools (Follow playhead, Volume, Scroll to top) */}
        <div className="flex items-center gap-3">
          {/* Auto-scroll toggle (follow playhead) */}
          <button
            onClick={onToggleAutoScroll}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              autoScroll
                ? 'bg-[#33a4d4]/20 text-[#5fc1e8] border border-[#33a4d4]/40 shadow-[0_0_10px_rgba(51,164,212,0.25)]'
                : 'bg-white/[0.03] text-[#7b8ea6] border border-white/[0.08] hover:text-[#b6c6da]'
            }`}
            title="Автоматически прокручивать список к карточке текущей сцены во время воспроизведения"
          >
            <Compass className={`w-3 h-3 ${autoScroll ? 'text-[#33a4d4] animate-spin' : ''}`} />
            <span>{autoScroll ? 'Следить за сценой' : 'Следить: Выкл'}</span>
          </button>

          {/* Quick Volume Slider */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={() => onUpdateVolume(voiceVolume > 0 ? 0 : 0.95)}
              className="text-[#7b8ea6] hover:text-[#5fc1e8]"
              title={voiceVolume > 0 ? 'Выключить звук' : 'Включить звук'}
            >
              {voiceVolume > 0 ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={voiceVolume}
              onChange={(e) => onUpdateVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-[#02060d] rounded appearance-none accent-[#33a4d4] cursor-pointer"
            />
          </div>

          {/* Uploaded Video Mute Button */}
          {uploadedVideoUrl && onToggleVideoMute && (
            <button
              onClick={onToggleVideoMute}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                isVideoMuted
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-[#33a4d4]/20 text-[#5fc1e8] border-[#33a4d4]/40 hover:bg-[#33a4d4]/30'
              }`}
              title={isVideoMuted ? 'Включить звук видео (клавиша V)' : 'Заглушить звук видео (клавиша V)'}
            >
              {isVideoMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden xl:inline">Видео Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#33a4d4]" />
                  <span className="hidden xl:inline">Видео звук вкл</span>
                </>
              )}
            </button>
          )}

          {/* Scroll to Top Button */}
          <button
            onClick={onScrollToTop}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 text-[11px] font-medium transition-colors cursor-pointer"
            title="Прокрутить наверх к видео и микшеру"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Наверх</span>
          </button>
        </div>
      </div>
    </div>
  );
};
