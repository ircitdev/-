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
          ? 'bg-[#33a4d4] text-[#04202b] font-bold border-white ring-2 ring-[#33a4d4] shadow-[0_0_12px_rgba(51,164,212,0.6)]'
          : 'bg-amber-950/70 hover:bg-amber-900/90 text-amber-200 border-amber-800/60';
      case 'motherhood':
        return isActive
          ? 'bg-[#33a4d4] text-[#04202b] font-bold border-white ring-2 ring-[#33a4d4] shadow-[0_0_12px_rgba(51,164,212,0.6)]'
          : 'bg-cyan-950/70 hover:bg-cyan-900/90 text-cyan-200 border-cyan-800/60';
      case 'sport':
        return isActive
          ? 'bg-[#33a4d4] text-[#04202b] font-bold border-white ring-2 ring-[#33a4d4] shadow-[0_0_12px_rgba(51,164,212,0.6)]'
          : 'bg-blue-950/70 hover:bg-blue-900/90 text-blue-200 border-blue-800/60';
      case 'recovery':
        return isActive
          ? 'bg-[#33a4d4] text-[#04202b] font-bold border-white ring-2 ring-[#33a4d4] shadow-[0_0_12px_rgba(51,164,212,0.6)]'
          : 'bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border-slate-700';
      case 'triumph':
        return isActive
          ? 'bg-[#33a4d4] text-[#04202b] font-bold border-white ring-2 ring-[#33a4d4] shadow-[0_0_12px_rgba(51,164,212,0.6)]'
          : 'bg-amber-900/70 hover:bg-amber-800/90 text-amber-200 border-amber-700';
      case 'present':
      default:
        return isActive
          ? 'bg-[#33a4d4] text-[#04202b] font-bold border-white ring-2 ring-[#33a4d4] shadow-[0_0_12px_rgba(51,164,212,0.6)]'
          : 'bg-sky-950/70 hover:bg-sky-900/90 text-sky-200 border-sky-800/60';
    }
  };

  // 14 ticks markings
  const timeTicks = [0, 10, 20, 30, 40, 50, 60, 70];

  return (
    <div className="rounded-2xl p-4 border border-[#33a4d4]/25 bg-gradient-to-b from-[#0e2640]/75 to-[#040e1a]/90 backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] select-none">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[#eaf3ff] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#33a4d4] shadow-[0_0_8px_#33a4d4]" />
            Таймлайн ролика (0–70 сек)
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-[#7b8ea6]">Нажмите на любой отрезок для мгновенного перехода</span>
        </div>
        <div className="font-mono text-[#b6c6da] bg-[#02060d]/80 px-2.5 py-1 rounded-lg border border-[#33a4d4]/20">
          <span className="text-[#33a4d4] font-bold">{formatTimeDisplay(currentTime)}</span> / 01:10.0
        </div>
      </div>

      {/* Main Interactive Timeline Canvas */}
      <div
        ref={timelineRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-28 bg-[#02060d] rounded-xl overflow-hidden cursor-pointer border border-[#33a4d4]/20 group"
      >
        {/* Time Tick Marks & Labels */}
        <div className="absolute top-0 inset-x-0 h-6 border-b border-[#33a4d4]/15 flex items-center justify-between px-2 text-[10px] font-mono text-[#7b8ea6] pointer-events-none">
          {timeTicks.map((tick) => (
            <span key={tick} style={{ left: `${(tick / duration) * 100}%` }} className="relative -translate-x-1/2">
              {tick}с
            </span>
          ))}
        </div>

        {/* Vertical Grid Lines (10s intervals) */}
        {timeTicks.map((tick) => (
          <div
            key={tick}
            style={{ left: `${(tick / duration) * 100}%` }}
            className="absolute top-6 bottom-0 w-px bg-white/[0.05] pointer-events-none z-0"
          />
        ))}

        {/* 14 Scene Start Visual Markers (Vertical Lines & Ruler Notches) */}
        {segments.map((seg) => {
          const leftPct = (seg.startTime / duration) * 100;
          const isActive = activeSegmentId === seg.id;

          return (
            <div
              key={`scene-marker-${seg.id}`}
              style={{ left: `${leftPct}%` }}
              className="absolute top-0 bottom-0 pointer-events-none z-20 flex flex-col items-center"
            >
              {/* Top Ruler Scene Badge & Downward Indicator */}
              <div
                className={`absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-300 ${
                  isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'
                }`}
              >
                {/* Scene number pill on the ruler */}
                <div
                  className={`px-1 py-[1px] rounded text-[8px] font-mono font-bold leading-none shadow-sm transition-colors ${
                    isActive
                      ? 'bg-[#33a4d4] text-[#04202b] ring-1 ring-white/60 shadow-[0_0_8px_rgba(51,164,212,0.8)]'
                      : 'bg-[#030a14]/90 text-[#7b8ea6] border border-[#33a4d4]/20 hover:text-[#b6c6da]'
                  }`}
                  title={`Сцена #${seg.id}: ${seg.startTime}–${seg.endTime}с`}
                >
                  #{seg.id}
                </div>
                {/* Micro pointer chevron */}
                <div
                  className={`w-0 h-0 border-x-[3px] border-x-transparent border-t-[3px] ${
                    isActive ? 'border-t-[#33a4d4]' : 'border-t-zinc-600'
                  }`}
                />
              </div>

              {/* Full-Height Vertical Boundary Marker Line */}
              <div
                className={`w-px h-full transition-all duration-300 ${
                  isActive
                    ? 'w-[2px] bg-[#33a4d4] shadow-[0_0_8px_rgba(51,164,212,0.8)] opacity-100'
                    : 'bg-white/[0.08] border-l border-dashed border-white/[0.1] opacity-70'
                }`}
              />

              {/* Bottom tick dot */}
              <div
                className={`absolute bottom-0 -translate-x-1/2 w-1 h-1 rounded-full ${
                  isActive ? 'bg-[#33a4d4]' : 'bg-zinc-600'
                }`}
              />
            </div>
          );
        })}

        {/* Phase Bands / Background Narrative Track */}
        <div className="absolute top-6 inset-x-0 h-4 flex opacity-50 text-[9px] font-medium text-[#b6c6da] pointer-events-none">
          <div style={{ width: `${(8 / 70) * 100}%` }} className="bg-amber-950/40 border-r border-[#33a4d4]/15 flex items-center px-1 truncate">
            Детство
          </div>
          <div style={{ width: `${(14 / 70) * 100}%` }} className="bg-sky-950/40 border-r border-[#33a4d4]/15 flex items-center px-1 truncate">
            Материнство
          </div>
          <div style={{ width: `${(10 / 70) * 100}%` }} className="bg-cyan-950/40 border-r border-[#33a4d4]/15 flex items-center px-1 truncate">
            Лёд & Спорт
          </div>
          <div style={{ width: `${(9 / 70) * 100}%` }} className="bg-slate-900/50 border-r border-[#33a4d4]/15 flex items-center px-1 truncate">
            Воля
          </div>
          <div style={{ width: `${(16 / 70) * 100}%` }} className="bg-amber-900/40 border-r border-[#33a4d4]/15 flex items-center px-1 truncate">
            Триумф & Подиум
          </div>
          <div style={{ width: `${(13 / 70) * 100}%` }} className="bg-[#143454]/40 flex items-center px-1 truncate">
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
        <div className="absolute bottom-1 inset-x-0 h-4 flex items-center px-1 text-[9px] text-[#7b8ea6] pointer-events-none">
          <span style={{ left: `${(37 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-slate-900/90 text-white text-[8px] border border-white/10">
            ⚡ Костыли
          </span>
          <span style={{ left: `${(41 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-[#0e3a5c] text-[#5fc1e8] text-[8px] border border-[#33a4d4]/30">
            👑 Корона
          </span>
          <span style={{ left: `${(46 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-[#0e3a5c] text-[#5fc1e8] text-[8px] border border-[#33a4d4]/30">
            📸 Вспышки
          </span>
          <span style={{ left: `${(51 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-[#0e3a5c] text-[#5fc1e8] text-[8px] border border-[#33a4d4]/30">
            ✨ Хедлайнер
          </span>
          <span style={{ left: `${(63 / 70) * 100}%` }} className="absolute -translate-x-1/2 px-1 rounded bg-[#0e3a5c] text-[#5fc1e8] text-[8px] border border-[#33a4d4]/30">
            🔥 Финал
          </span>
        </div>

        {/* Hover Time Indicator Line */}
        {hoverPercent !== null && (
          <div
            style={{ left: `${hoverPercent}%` }}
            className="absolute top-0 bottom-0 w-px bg-white/40 pointer-events-none z-20"
          >
            <span className="absolute -top-1 -translate-x-1/2 -translate-y-full bg-[#02060d] text-[#eaf3ff] font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#33a4d4]/40 shadow-lg">
              {formatTimeDisplay(hoverTime!)}
            </span>
          </div>
        )}

        {/* Master Active Playhead (Uspeshnyy Cyan Glow) */}
        <div
          style={{ left: `${progressPercent}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-[#33a4d4] z-30 pointer-events-none shadow-[0_0_12px_#33a4d4]"
        >
          {/* Playhead Pin */}
          <div className="absolute top-0 -translate-x-1/2 w-3.5 h-3.5 bg-[#33a4d4] rounded-full border-2 border-white shadow-[0_0_10px_#33a4d4]" />
        </div>
      </div>
    </div>
  );
};
