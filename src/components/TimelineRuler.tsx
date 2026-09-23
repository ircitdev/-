import React, { useRef, useState, useCallback } from 'react';
import { VoiceSegment } from '../types';
import { formatTimeDisplay } from '../utils/audioEngine';

interface TimelineRulerProps {
  segments: VoiceSegment[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  activeSegmentId: number | null;
}

export const TimelineRuler: React.FC<TimelineRulerProps> = ({
  segments,
  currentTime,
  duration,
  onSeek,
  activeSegmentId,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const getTimeFromPointer = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!timelineRef.current) return 0;
      const rect = timelineRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, pos));
      return clamped * duration;
    },
    [duration]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    const time = getTimeFromPointer(e);
    onSeek(time);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newTime = getTimeFromPointer(moveEvent);
      onSeek(newTime);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const time = getTimeFromPointer(e);
    setHoverTime(time);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  const progressPercent = (currentTime / duration) * 100;
  const hoverPercent = hoverTime !== null ? (hoverTime / duration) * 100 : null;

  // Category colors for voice tracks
  const getCategoryColor = (cat: VoiceSegment['category'], isActive: boolean) => {
    switch (cat) {
      case 'childhood':
        return isActive
          ? 'bg-amber-500 text-amber-950 border-amber-300 ring-2 ring-amber-400'
          : 'bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border-amber-800/80';
      case 'motherhood':
        return isActive
          ? 'bg-rose-500 text-rose-950 border-rose-300 ring-2 ring-rose-400'
          : 'bg-rose-950/80 hover:bg-rose-900/90 text-rose-200 border-rose-800/80';
      case 'sport':
        return isActive
          ? 'bg-cyan-500 text-cyan-950 border-cyan-300 ring-2 ring-cyan-400'
          : 'bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-200 border-cyan-800/80';
      case 'recovery':
        return isActive
          ? 'bg-slate-400 text-slate-950 border-white ring-2 ring-white'
          : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700';
      case 'triumph':
        return isActive
          ? 'bg-amber-400 text-amber-950 border-yellow-200 ring-2 ring-yellow-300'
          : 'bg-amber-900/80 hover:bg-amber-800/90 text-amber-200 border-amber-700';
      case 'present':
      default:
        return isActive
          ? 'bg-fuchsia-500 text-fuchsia-950 border-fuchsia-300 ring-2 ring-fuchsia-400'
          : 'bg-fuchsia-950/80 hover:bg-fuchsia-900/90 text-fuchsia-200 border-fuchsia-800/80';
    }
  };

  // 14 ticks markings
  const timeTicks = [0, 10, 20, 30, 40, 50, 60, 70];

  return (
    <div className="bg-zinc-900/90 rounded-2xl p-4 border border-zinc-800 shadow-xl select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200 uppercase tracking-wider text-[11px]">
            Таймлайн ролика (0–70 сек)
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400">Нажмите на любой отрезок для мгновенного перехода</span>
        </div>
        <div className="font-mono text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
          <span className="text-rose-400 font-bold">{formatTimeDisplay(currentTime)}</span> / 01:10.0
        </div>
      </div>

      {/* Main Interactive Timeline Canvas */}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-28 bg-zinc-950 rounded-xl overflow-hidden cursor-pointer border border-zinc-800/90 group"
      >
        {/* Time Tick Marks & Labels */}
        <div className="absolute top-0 inset-x-0 h-6 border-b border-zinc-800/60 flex items-center justify-between px-2 text-[10px] font-mono text-zinc-500 pointer-events-none">
          {timeTicks.map((tick) => (
            <span key={tick} style={{ left: `${(tick / duration) * 100}%` }} className="relative -translate-x-1/2">
              {tick}с
            </span>
          ))}
        </div>

        {/* Vertical Grid Lines */}
        {timeTicks.map((tick) => (
          <div
            key={tick}
            style={{ left: `${(tick / duration) * 100}%` }}
            className="absolute top-6 bottom-0 w-px bg-zinc-800/40 pointer-events-none"
          />
        ))}

        {/* Phase Bands / Background Narrative Track */}
        <div className="absolute top-6 inset-x-0 h-4 flex opacity-40 text-[9px] font-medium text-zinc-400 pointer-events-none">
          <div style={{ width: `${(8 / 70) * 100}%` }} className="bg-amber-900/30 border-r border-zinc-800 flex items-center px-1 truncate">
            Детство
          </div>
          <div style={{ width: `${(14 / 70) * 100}%` }} className="bg-rose-900/30 border-r border-zinc-800 flex items-center px-1 truncate">
            Материнство
          </div>
          <div style={{ width: `${(10 / 70) * 100}%` }} className="bg-cyan-900/30 border-r border-zinc-800 flex items-center px-1 truncate">
            Лёд & Спорт
          </div>
          <div style={{ width: `${(9 / 70) * 100}%` }} className="bg-slate-800/40 border-r border-zinc-800 flex items-center px-1 truncate">
            Воля
          </div>
          <div style={{ width: `${(16 / 70) * 100}%` }} className="bg-amber-700/30 border-r border-zinc-800 flex items-center px-1 truncate">
            Триумф & Подиум
          </div>
          <div style={{ width: `${(13 / 70) * 100}%` }} className="bg-fuchsia-900/30 flex items-center px-1 truncate">
            Мне 50
          </div>
        </div>

        {/* Voice Segments Track */}
        <div className="absolute top-11 inset-x-0 h-10 flex items-center px-0.5">
          {segments.map((seg) => {
            const leftPct = (seg.startTime / duration) * 100;
            const widthPct = (seg.duration / duration) * 100;
            const isActive = activeSegmentId === seg.id;

            return (
              <div
                key={seg.id}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                }}
                className={`absolute top-0 bottom-0 m-0.5 rounded-lg border p-1 text-[10px] flex flex-col justify-between overflow-hidden transition-all shadow-sm ${getCategoryColor(
                  seg.category,
                  isActive
                )}`}
                title={`${seg.startTime}–${seg.endTime}с: ${seg.text}`}
              >
                <div className="flex items-center justify-between font-mono text-[9px] leading-none">
                  <span className="font-bold">#{seg.id}</span>
                  <span>{seg.duration}с</span>
                </div>
                <div className="font-semibold truncate text-[9px] leading-tight opacity-95">
                  {seg.text.slice(0, 24)}...
                </div>
              </div>
            );
          })}
        </div>

        {/* Sound FX Track Cues */}
        <div className="absolute bottom-1 inset-x-0 h-4 flex items-center px-1 text-[9px] text-zinc-500 pointer-events-none">
          <span style={{ left: `${(37 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-slate-800/80 text-white text-[8px]">
            ⚡ Костыли
          </span>
          <span style={{ left: `${(41 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-amber-900/80 text-amber-200 text-[8px]">
            👑 Корона
          </span>
          <span style={{ left: `${(46 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-blue-900/80 text-blue-200 text-[8px]">
            📸 Вспышки
          </span>
          <span style={{ left: `${(51 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-purple-900/80 text-purple-200 text-[8px]">
            ✨ Хедлайнер
          </span>
          <span style={{ left: `${(63 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-rose-900/80 text-rose-200 text-[8px]">
            🔥 Финал
          </span>
        </div>

        {/* Hover Time Indicator Line */}
        {hoverPercent !== null && (
          <div
            style={{ left: `${hoverPercent}%` }}
            className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none z-20"
          >
            <span className="absolute -top-1 -translate-x-1/2 -translate-y-full bg-black/90 text-white font-mono text-[10px] px-1.5 py-0.5 rounded border border-white/20">
              {formatTimeDisplay(hoverTime!)}
            </span>
          </div>
        )}

        {/* Master Active Playhead */}
        <div
          style={{ left: `${progressPercent}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-rose-400 z-30 pointer-events-none shadow-[0_0_12px_rgba(244,63,94,0.8)]"
        >
          {/* Playhead Pin */}
          <div className="absolute top-0 -translate-x-1/2 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-white shadow-md" />
        </div>
      </div>
    </div>
  );
};
