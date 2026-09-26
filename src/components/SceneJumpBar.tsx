import React from 'react';
import { VoiceSegment } from '../types';
import { Volume2, Sparkles, Check, Film, RefreshCw } from 'lucide-react';

interface SceneJumpBarProps {
  segments: VoiceSegment[];
  activeSegmentId: number | null;
  onSelectScene: (seg: VoiceSegment) => void;
}

export const SceneJumpBar: React.FC<SceneJumpBarProps> = ({
  segments,
  activeSegmentId,
  onSelectScene,
}) => {
  return (
    <div className="w-full bg-[#02060d]/80 rounded-2xl p-2.5 border border-[#33a4d4]/15 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 mb-2 px-1">
        <span className="text-[11px] font-bold text-[#b6c6da] uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#33a4d4]" />
          Быстрый навигатор по 14 сценам:
        </span>
        <span className="text-[10px] text-[#7b8ea6]">
          Кликните на номер сцены для перехода и скролла
        </span>
      </div>

      <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
        {segments.map((seg) => {
          const isActive = activeSegmentId === seg.id;
          const isReady = seg.status === 'ready';
          const isGenerating = seg.status === 'generating';
          const hasPrompt = Boolean(seg.videoPrompt);

          return (
            <button
              key={seg.id}
              onClick={() => onSelectScene(seg)}
              className={`group relative flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all duration-200 cursor-pointer text-center ${
                isActive
                  ? 'bg-[#33a4d4] text-[#04202b] font-bold border-white shadow-[0_0_14px_rgba(51,164,212,0.5)] scale-105 z-10'
                  : 'bg-white/[0.03] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#eaf3ff] border-[#33a4d4]/20 hover:border-[#33a4d4]/50'
              }`}
              title={`Сцена #${seg.id}: ${seg.sceneTitle}\n[${seg.startTime}–${seg.endTime}с, ${seg.duration}с]\n${
                isReady ? '✓ Озвучена' : 'Ожидает озвучки'
              }${hasPrompt ? ' • Промпт готов' : ''}`}
            >
              {/* Scene number */}
              <div className="flex items-center gap-0.5">
                <span className="text-xs font-mono font-bold leading-none">#{seg.id}</span>
                {isGenerating && <RefreshCw className="w-2.5 h-2.5 animate-spin text-[#33a4d4]" />}
              </div>

              {/* Time */}
              <span
                className={`text-[9px] font-mono leading-none mt-1 ${
                  isActive ? 'text-[#04202b]/90 font-bold' : 'text-[#7b8ea6]'
                }`}
              >
                {seg.startTime}s
              </span>

              {/* Status indicators */}
              <div className="flex items-center gap-0.5 mt-1">
                {isReady && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-[#04202b]' : 'bg-emerald-400 shadow-[0_0_6px_#34d399]'
                    }`}
                  />
                )}
                {hasPrompt && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-[#04202b]/70' : 'bg-amber-400 shadow-[0_0_6px_#fbbf24]'
                    }`}
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
