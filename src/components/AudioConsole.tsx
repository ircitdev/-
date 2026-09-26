import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Music,
  Zap,
  Sliders,
  Sparkles,
  FastForward,
  Rewind,
  Film,
  Headphones,
  Check,
  Radio,
  Volume1,
} from 'lucide-react';
import { AudioSettings } from '../types';
import { formatTimeDisplay } from '../utils/audioEngine';

interface AudioConsoleProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onSkip: (seconds: number) => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  settings: AudioSettings;
  onUpdateSettings: (newSettings: Partial<AudioSettings>) => void;
  uploadedVideoUrl?: string | null;
  isVideoMuted?: boolean;
  onToggleVideoMute?: () => void;
}

export const AudioConsole: React.FC<AudioConsoleProps> = ({
  isPlaying,
  onTogglePlay,
  onReset,
  onSkip,
  currentTime,
  duration,
  onSeek,
  settings,
  onUpdateSettings,
  uploadedVideoUrl,
  isVideoMuted = false,
  onToggleVideoMute,
}) => {
  const percentComplete = Math.min(100, Math.max(0, (currentTime / (duration || 70)) * 100));

  return (
    <div className="rounded-2xl p-4 sm:p-5 lg:p-6 border border-[#33a4d4]/30 bg-gradient-to-b from-[#0b1d30]/95 via-[#061424]/95 to-[#020912]/98 backdrop-blur-2xl shadow-[0_16px_50px_rgba(0,0,0,0.65)] space-y-5 transition-all">
      {/* Top Transport & Timeline Scrubber Bar */}
      <div className="space-y-3.5">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Main Transport Playback Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onReset}
              className="p-2.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all active:scale-95 cursor-pointer shadow-sm"
              title="Сбросить в начало (00:00)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => onSkip(-5)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all active:scale-95 cursor-pointer text-xs font-semibold shadow-sm"
              title="Назад на 5 секунд (←)"
            >
              <Rewind className="w-3.5 h-3.5" />
              <span>-5с</span>
            </button>

            {/* Master Play/Pause Button in Brand Cyan Style */}
            <button
              onClick={onTogglePlay}
              className={`flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3 rounded-full font-extrabold text-sm transition-all duration-200 active:scale-95 cursor-pointer select-none ${
                isPlaying
                  ? 'bg-gradient-to-r from-[#33a4d4] to-[#5fc1e8] text-[#04202b] shadow-[0_0_30px_rgba(51,164,212,0.65)] ring-2 ring-white/50 scale-[1.02]'
                  : 'bg-[#33a4d4] hover:bg-[#5fc1e8] text-[#04202b] shadow-[0_0_22px_rgba(51,164,212,0.45)] hover:shadow-[0_0_30px_rgba(51,164,212,0.7)]'
              }`}
              title="Воспроизведение / Пауза (Пробел)"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5 fill-current" />
                  <span>Пауза</span>
                  <div className="flex items-center gap-0.5 ml-1">
                    <span className="w-1 h-3.5 bg-[#04202b] rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1 h-4 bg-[#04202b] rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1 h-2.5 bg-[#04202b] rounded-full animate-bounce" />
                  </div>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                  <span>Воспроизвести (70с)</span>
                </>
              )}
            </button>

            <button
              onClick={() => onSkip(5)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 transition-all active:scale-95 cursor-pointer text-xs font-semibold shadow-sm"
              title="Вперёд на 5 секунд (→)"
            >
              <span>+5с</span>
              <FastForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Precision Digital LCD Time Display */}
          <div className="flex items-center gap-4 bg-[#02060d]/80 px-4 py-2 rounded-2xl border border-[#33a4d4]/25 shadow-inner">
            <div className="text-right font-mono">
              <div className="text-xl sm:text-2xl font-black tracking-wider flex items-baseline gap-1.5">
                <span className="text-[#33a4d4] drop-shadow-[0_0_14px_rgba(51,164,212,0.7)]">
                  {formatTimeDisplay(currentTime)}
                </span>
                <span className="text-[#5a6e85] text-sm sm:text-base font-normal">
                  / {formatTimeDisplay(duration)}
                </span>
              </div>
              <div className="text-[10px] text-[#7b8ea6] tracking-widest uppercase font-semibold">
                Мастер-таймлайн • 70 сек
              </div>
            </div>

            {/* Percentage Badge */}
            <div className="hidden sm:flex flex-col items-center justify-center pl-3 border-l border-[#33a4d4]/20">
              <span className="text-xs font-black font-mono text-[#5fc1e8]">
                {Math.round(percentComplete)}%
              </span>
              <span className="text-[9px] text-[#7b8ea6] uppercase">Прогресс</span>
            </div>
          </div>
        </div>

        {/* Master Interactive Progress Scrubber */}
        <div className="space-y-1.5 pt-1">
          <div className="relative group">
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-2.5 bg-[#02060d] rounded-lg appearance-none cursor-pointer accent-[#33a4d4] focus:outline-none focus:ring-2 focus:ring-[#33a4d4]/50 shadow-inner"
            />
            {/* Visual Progress Fill Overlay */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#143454] to-[#33a4d4] rounded-lg pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity"
              style={{ width: `${percentComplete}%` }}
            />
          </div>

          {/* Key Milestones on Timeline */}
          <div className="flex justify-between items-center text-[10px] font-mono text-[#7b8ea6] px-1 select-none">
            <span className="hover:text-[#5fc1e8] cursor-pointer" onClick={() => onSeek(0)}>
              00:00.0 (Старт)
            </span>
            <span className="hidden sm:inline hover:text-[#5fc1e8] cursor-pointer" onClick={() => onSeek(23)}>
              00:23 (Миссис Мира)
            </span>
            <span className="hover:text-[#5fc1e8] cursor-pointer" onClick={() => onSeek(35)}>
              00:35 (Костыли & Воля)
            </span>
            <span className="hidden sm:inline hover:text-[#5fc1e8] cursor-pointer" onClick={() => onSeek(53)}>
              00:53 (Миссис Волгоград)
            </span>
            <span className="hover:text-[#5fc1e8] cursor-pointer" onClick={() => onSeek(70)}>
              01:10.0 (Мне 50 лет)
            </span>
          </div>
        </div>
      </div>

      {/* Studio Mixer: 3 Responsive Engineering Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-[#33a4d4]/20 text-xs">
        {/* Module 1: AI Voice Persona & Tempo */}
        <div className="bg-[#02060d]/80 p-4 rounded-2xl border border-[#33a4d4]/20 space-y-3 shadow-inner hover:border-[#33a4d4]/35 transition-all">
          <div className="flex items-center justify-between text-[#eaf3ff] font-bold">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#33a4d4]" />
              Голос диктора
            </span>
            <span className="text-[10px] text-[#33a4d4] font-mono bg-[#33a4d4]/10 px-2 py-0.5 rounded-full border border-[#33a4d4]/30 font-semibold">
              Gemini TTS
            </span>
          </div>

          {/* Persona Selection Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'Kore' as const, name: 'Коре', desc: 'Тёплый' },
              { id: 'Aoede' as const, name: 'Аэда', desc: 'Лиричный' },
              { id: 'Zephyr' as const, name: 'Зефир', desc: 'Мягкий' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => onUpdateSettings({ voice: v.id })}
                className={`py-2 px-2 rounded-xl text-center transition-all cursor-pointer border ${
                  settings.voice === v.id
                    ? 'bg-[#33a4d4] text-[#04202b] font-bold border-[#33a4d4] shadow-[0_0_14px_rgba(51,164,212,0.45)] ring-1 ring-white/30'
                    : 'bg-white/[0.03] hover:bg-[#33a4d4]/10 text-[#b6c6da] hover:text-[#eaf3ff] border-white/[0.06]'
                }`}
              >
                <div className="text-xs font-bold">{v.name}</div>
                <div className={`text-[9px] truncate ${settings.voice === v.id ? 'text-[#04202b]/80' : 'text-[#7b8ea6]'}`}>
                  {v.desc}
                </div>
              </button>
            ))}
          </div>

          {/* Speech Pace Selector */}
          <div className="pt-2 border-t border-[#33a4d4]/10 flex items-center justify-between">
            <span className="text-[#7b8ea6] text-[11px] font-medium">Темп речи:</span>
            <div className="flex items-center gap-1 font-mono">
              {[
                { label: '0.9x', val: 0.9 },
                { label: '1.0x', val: 1.0 },
                { label: '1.1x', val: 1.1 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => onUpdateSettings({ pace: p.val })}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${
                    settings.pace === p.val
                      ? 'bg-[#33a4d4] text-[#04202b] font-bold border-[#33a4d4] shadow-sm'
                      : 'bg-white/[0.03] text-[#7b8ea6] hover:text-[#b6c6da] border-white/[0.05]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Volume Slider */}
          <div className="pt-2 border-t border-[#33a4d4]/10 space-y-1.5">
            <div className="flex items-center justify-between text-[#b6c6da]">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Volume2 className="w-3.5 h-3.5 text-[#33a4d4]" />
                Громкость голоса
              </span>
              <span className="font-mono text-[11px] font-bold text-[#5fc1e8]">
                {Math.round(settings.voiceVolume * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.voiceVolume}
              onChange={(e) => onUpdateSettings({ voiceVolume: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-[#02060d] rounded-lg appearance-none cursor-pointer accent-[#33a4d4]"
            />
          </div>
        </div>

        {/* Module 2: Soundtrack & Auto-Ducking */}
        <div className="bg-[#02060d]/80 p-4 rounded-2xl border border-[#33a4d4]/20 space-y-3 shadow-inner hover:border-[#33a4d4]/35 transition-all">
          <div className="flex items-center justify-between text-[#eaf3ff] font-bold">
            <span className="flex items-center gap-2">
              <Music className="w-4 h-4 text-[#33a4d4]" />
              Фоновая музыка
            </span>
            <span className="font-mono text-[11px] font-bold text-[#5fc1e8]">
              {settings.bgMusicTrack === 'none' ? 'Выкл' : `${Math.round(settings.bgMusicVolume * 100)}%`}
            </span>
          </div>

          {/* Music Track Selector */}
          <div className="space-y-1">
            <label className="text-[10px] text-[#7b8ea6] uppercase font-semibold">Саундтрек ролика</label>
            <select
              value={settings.bgMusicTrack}
              onChange={(e) => onUpdateSettings({ bgMusicTrack: e.target.value as any })}
              className="w-full bg-[#04111f] border border-[#33a4d4]/30 rounded-xl px-3 py-2 text-xs text-[#eaf3ff] focus:outline-none focus:ring-1 focus:ring-[#33a4d4] font-medium"
            >
              <option value="cinematic_piano">Эмоциональное фортепиано & струнные</option>
              <option value="inspirational_strings">Вдохновляющий оркестровый подъём</option>
              <option value="none">Без музыки (чистый голос)</option>
            </select>
          </div>

          {/* Music Volume Slider */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] text-[#7b8ea6]">
              <span>Громкость трека:</span>
              <span className="font-mono text-[#b6c6da]">
                {settings.bgMusicTrack === 'none' ? '0%' : `${Math.round(settings.bgMusicVolume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={settings.bgMusicTrack === 'none'}
              value={settings.bgMusicVolume}
              onChange={(e) => onUpdateSettings({ bgMusicVolume: parseFloat(e.target.value) })}
              className={`w-full h-1.5 bg-[#02060d] rounded-lg appearance-none cursor-pointer accent-[#33a4d4] ${
                settings.bgMusicTrack === 'none' ? 'opacity-30 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {/* Auto-Ducking Checkbox Toggle */}
          <div className="pt-2 border-t border-[#33a4d4]/10">
            <label className="flex items-center justify-between gap-2 cursor-pointer p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.autoDucking}
                  onChange={(e) => onUpdateSettings({ autoDucking: e.target.checked })}
                  className="rounded bg-[#02060d] border-[#33a4d4]/30 text-[#33a4d4] focus:ring-[#33a4d4]/30 accent-[#33a4d4]"
                />
                <span className="text-[11px] font-medium text-[#b6c6da]">Авто-дакинг</span>
              </div>
              <span className="text-[10px] text-[#5fc1e8] font-mono bg-[#33a4d4]/10 px-1.5 py-0.5 rounded">
                -65% при речи
              </span>
            </label>
          </div>
        </div>

        {/* Module 3: Video Audio & SFX Atmosphere */}
        <div className="bg-[#02060d]/80 p-4 rounded-2xl border border-[#33a4d4]/20 space-y-3 shadow-inner hover:border-[#33a4d4]/35 transition-all">
          <div className="flex items-center justify-between text-[#eaf3ff] font-bold">
            <span className="flex items-center gap-2">
              <Film className="w-4 h-4 text-[#33a4d4]" />
              Звук видео & SFX
            </span>
            <span className="text-[10px] text-[#7b8ea6] font-mono">
              Спецэффекты
            </span>
          </div>

          {/* Video Audio Mute/Unmute Dedicated Control Card */}
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-[#33a4d4]/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#b6c6da] font-medium flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-[#33a4d4]" />
                Дорожка видео:
              </span>
              <span className="text-[9px] font-mono text-[#7b8ea6]">Клавиша V</span>
            </div>

            {uploadedVideoUrl && onToggleVideoMute ? (
              <button
                onClick={onToggleVideoMute}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-sm ${
                  isVideoMuted
                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/20'
                    : 'bg-[#33a4d4]/20 hover:bg-[#33a4d4]/30 text-[#5fc1e8] border-[#33a4d4]/40 ring-1 ring-[#33a4d4]/20'
                }`}
                title="Переключить Mute для звука загруженного видео (V)"
              >
                {isVideoMuted ? (
                  <>
                    <VolumeX className="w-4 h-4 text-rose-400" />
                    <span>Звук видео: Mute (заглушён)</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-[#33a4d4]" />
                    <span>Звук видео: Включён</span>
                  </>
                )}
              </button>
            ) : (
              <div className="text-[11px] text-[#7b8ea6] italic py-1 px-2 text-center bg-black/30 rounded-lg">
                Своё видео не загружено (активен сториборд)
              </div>
            )}
          </div>

          {/* Cinematic Sound FX Toggle */}
          <div className="pt-2 border-t border-[#33a4d4]/10">
            <label className="flex items-center justify-between gap-2 cursor-pointer p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors border border-white/[0.04]">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={(e) => onUpdateSettings({ soundEffects: e.target.checked })}
                  className="rounded bg-[#02060d] border-[#33a4d4]/30 text-[#33a4d4] focus:ring-[#33a4d4]/30 accent-[#33a4d4]"
                />
                <span className="text-[11px] font-medium text-[#b6c6da] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#33a4d4]" />
                  Звуковые эффекты (SFX)
                </span>
              </div>
              <span className="text-[10px] text-[#5fc1e8] font-mono bg-[#33a4d4]/10 px-1.5 py-0.5 rounded">
                Шаги, вспышки, овации
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Micro Shortcut Guide Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#7b8ea6] pt-1 px-1">
        <div className="flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#b6c6da] border border-white/[0.1] font-mono text-[10px]">Пробел</kbd> Пуск / Пауза
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#b6c6da] border border-white/[0.1] font-mono text-[10px]">V</kbd> Mute видео
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#b6c6da] border border-white/[0.1] font-mono text-[10px]">M</kbd> Mute голоса
          </span>
          <span className="hidden sm:inline">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[#b6c6da] border border-white/[0.1] font-mono text-[10px]">← / →</kbd> ±5 сек
          </span>
        </div>
        <div className="text-[10px] text-[#33a4d4] font-medium flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#33a4d4] animate-pulse" />
          Студийный микшер 70с готов
        </div>
      </div>
    </div>
  );
};
