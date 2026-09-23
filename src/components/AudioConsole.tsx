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
}) => {
  return (
    <div className="bg-zinc-900/95 rounded-2xl p-5 border border-zinc-800 shadow-2xl space-y-4">
      {/* Top Playback Control Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Main Play Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onReset}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Сбросить в начало (0 сек)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onSkip(-5)}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Назад на 5 секунд"
          >
            <Rewind className="w-4 h-4" />
          </button>

          {/* Master Play/Pause */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm shadow-xl transition-all active:scale-95 ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-950/40 ring-2 ring-amber-400/50'
                : 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 shadow-rose-950/40'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Пауза</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Воспроизвести (70с)</span>
              </>
            )}
          </button>

          <button
            onClick={() => onSkip(5)}
            className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
            title="Вперёд на 5 секунд"
          >
            <FastForward className="w-4 h-4" />
          </button>
        </div>

        {/* Big Time Display */}
        <div className="text-center sm:text-right font-mono">
          <div className="text-2xl font-black text-white tracking-wider">
            <span className="text-rose-400">{formatTimeDisplay(currentTime)}</span>
            <span className="text-zinc-500 text-lg font-normal"> / {formatTimeDisplay(duration)}</span>
          </div>
          <div className="text-[11px] text-zinc-400 tracking-wide uppercase">Синхронный тайминг</div>
        </div>
      </div>

      {/* Scrubber Progress Bar */}
      <div className="space-y-1">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-400"
        />
        <div className="flex justify-between text-[10px] font-mono text-zinc-500 px-1">
          <span>00:00.0 (Старт)</span>
          <span>00:35.0 (Костыли & Воля)</span>
          <span>01:10.0 (Финал: Мне 50)</span>
        </div>
      </div>

      {/* Mixer & Voice Tuning Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2 border-t border-zinc-800/80 text-xs">
        {/* Voice Persona Selector */}
        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/60 space-y-2">
          <div className="flex items-center justify-between text-zinc-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Женский голос (Gemini AI)
            </span>
            <span className="text-[10px] text-rose-400 font-mono">Studio TTS</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'Kore' as const, name: 'Коре', desc: 'Тёплый, зрелый' },
              { id: 'Aoede' as const, name: 'Аэда', desc: 'Нежный, лиричный' },
              { id: 'Zephyr' as const, name: 'Зефир', desc: 'Мягкий' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => onUpdateSettings({ voice: v.id })}
                className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                  settings.voice === v.id
                    ? 'bg-rose-500 text-white font-bold shadow-md shadow-rose-950/40 ring-1 ring-white/30'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                }`}
              >
                <div className="text-[11px] font-medium">{v.name}</div>
                <div className="text-[9px] opacity-75 truncate">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Volume & Ducking Controls */}
        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/60 space-y-2.5">
          <div className="flex items-center justify-between text-zinc-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              Громкость голоса
            </span>
            <span className="font-mono text-[11px] text-zinc-400">{Math.round(settings.voiceVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.voiceVolume}
            onChange={(e) => onUpdateSettings({ voiceVolume: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />

          {/* Auto-Ducking Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer pt-1 text-zinc-300">
            <input
              type="checkbox"
              checked={settings.autoDucking}
              onChange={(e) => onUpdateSettings({ autoDucking: e.target.checked })}
              className="rounded bg-zinc-800 border-zinc-700 text-rose-500 focus:ring-rose-500/30"
            />
            <span className="text-[11px]">Авто-дакинг (приглушать музыку при голосе)</span>
          </label>
        </div>

        {/* Cinematic Music & SFX Mix */}
        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/60 space-y-2.5">
          <div className="flex items-center justify-between text-zinc-300 font-semibold">
            <span className="flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-amber-400" />
              Фоновая музыка
            </span>
            <span className="font-mono text-[11px] text-zinc-400">{Math.round(settings.bgMusicVolume * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={settings.bgMusicTrack}
              onChange={(e) => onUpdateSettings({ bgMusicTrack: e.target.value as any })}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1"
            >
              <option value="cinematic_piano">Эмоциональное фортепиано & струнные</option>
              <option value="inspirational_strings">Вдохновляющий оркестровый подъём</option>
              <option value="none">Без музыки (только голос)</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              disabled={settings.bgMusicTrack === 'none'}
              value={settings.bgMusicVolume}
              onChange={(e) => onUpdateSettings({ bgMusicVolume: parseFloat(e.target.value) })}
              className="w-1/2 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
            {/* Sound FX Toggle */}
            <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 text-[11px]">
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={(e) => onUpdateSettings({ soundEffects: e.target.checked })}
                className="rounded bg-zinc-800 border-zinc-700 text-amber-500 focus:ring-amber-500/30"
              />
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Звуки FX</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
