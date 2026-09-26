import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  extractWaveformFromAudio,
  generateCadenceWaveform,
  WaveformAnalysis,
} from '../utils/waveform';
import { Volume2, VolumeX, Sparkles, AlertCircle, BarChart2 } from 'lucide-react';

export interface WaveformVisualizerProps {
  audioSource?: string | Blob;
  audioUrl?: string; // Backwards-compatible alias
  duration: number; // Planned duration in seconds (e.g. 4.0)
  actualDuration?: number; // Actual audio duration if available
  status: 'idle' | 'generating' | 'ready' | 'error';
  isPlaying?: boolean;
  currentPlaybackTime?: number; // In seconds relative to start of this segment (0 to duration)
  onSeek?: (fraction: number) => void;
  accentColor?: string;
  text?: string;
  canvasHeight?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  audioSource,
  audioUrl,
  duration,
  actualDuration,
  status,
  isPlaying = false,
  currentPlaybackTime = 0,
  onSeek,
  accentColor = 'rose',
  text = '',
  canvasHeight = 56,
}) => {
  const [analysis, setAnalysis] = useState<WaveformAnalysis | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [hoverFraction, setHoverFraction] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(360);

  // Resolved source (accepts either audioSource or audioUrl)
  const source = audioSource || audioUrl;

  // Number of discrete bars for the waveform display
  const NUM_BARS = 64;

  // Track container width dynamically for perfect crisp canvas resolution
  useEffect(() => {
    if (!containerRef.current) return;
    const updateWidth = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) setContainerWidth(w);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch and decode audio via AudioContext whenever the source changes
  useEffect(() => {
    let isCancelled = false;

    if (!source || status === 'idle') {
      setAnalysis(null);
      return;
    }

    setIsLoadingAnalysis(true);
    extractWaveformFromAudio(source, duration, NUM_BARS)
      .then((data) => {
        if (!isCancelled) {
          setAnalysis(data);
          setIsLoadingAnalysis(false);
        }
      })
      .catch((err) => {
        console.warn('Waveform AudioContext extraction error:', err);
        if (!isCancelled) {
          // Fallback to text cadence simulation
          setAnalysis(generateCadenceWaveform(text, duration, NUM_BARS));
          setIsLoadingAnalysis(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [source, duration, status, text]);

  // Derived progress fraction (0 to 1)
  const effectiveDuration = actualDuration || duration || 4.0;
  const progressFraction = Math.max(
    0,
    Math.min(1, currentPlaybackTime / Math.max(0.1, effectiveDuration))
  );

  // Detect peak and silence statistics
  const stats = useMemo(() => {
    if (!analysis) return null;
    const { peaks, maxPeakDb, silenceRatio } = analysis;
    const peakCount = peaks.filter((p) => p >= 0.85).length;
    const silenceCount = peaks.filter((p) => p < 0.12).length;

    return {
      maxPeakDb,
      silencePercent: Math.round(silenceRatio * 100),
      peakCount,
      hasPeaks: peakCount > 0,
      hasSilence: silenceCount > 0,
      audioLength: actualDuration ? actualDuration.toFixed(1) : duration.toFixed(1),
    };
  }, [analysis, actualDuration, duration]);

  // HTML5 Canvas Drawing Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = containerWidth;
    const height = canvasHeight;

    // Set high-DPI canvas buffer size
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Draw subtle background
    ctx.fillStyle = '#09090b'; // zinc-950
    ctx.fillRect(0, 0, width, height);

    // 2. Draw subtle grid baseline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // 3. Draw vertical subdivision markers (quarter marks)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    [0.25, 0.5, 0.75].forEach((frac) => {
      const x = Math.round(width * frac);
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, height - 4);
      ctx.stroke();
    });

    const peaks = analysis?.peaks || [];
    const numBars = peaks.length > 0 ? peaks.length : NUM_BARS;
    const paddingX = 6;
    const usableWidth = width - paddingX * 2;
    const barGap = 2;
    const barWidth = Math.max(1.5, (usableWidth - (numBars - 1) * barGap) / numBars);

    // If idle or generating placeholder
    if (status === 'idle' || !analysis) {
      // Draw ghost/placeholder wave
      for (let i = 0; i < numBars; i++) {
        const x = paddingX + i * (barWidth + barGap);
        const norm = Math.sin((i / numBars) * Math.PI * 3) * 0.25 + 0.35;
        const barHeight = Math.max(6, norm * (height - 14));
        const y = (height - barHeight) / 2;

        ctx.fillStyle = status === 'generating' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(82, 82, 91, 0.25)';
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 2);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }
      ctx.restore();
      return;
    }

    // 4. Draw amplitude bars (mirrored around center line)
    for (let i = 0; i < numBars; i++) {
      const barFraction = i / (numBars - 1);
      const isPlayed = isPlaying && barFraction <= progressFraction;
      const isHovered = hoverFraction !== null && barFraction <= hoverFraction;
      const peak = peaks[i];

      const isPeak = peak >= 0.85;
      const isSilence = peak < 0.12;

      // Calculate mirrored bar height
      const barHeight = Math.max(4, peak * (height - 12));
      const x = paddingX + i * (barWidth + barGap);
      const y = (height - barHeight) / 2;

      // Determine bar color styling
      if (isSilence) {
        ctx.fillStyle = isPlayed ? '#52525b' : '#3f3f46'; // Muted dark for pauses/silence
      } else if (isPeak) {
        ctx.fillStyle = isPlayed ? '#fbbf24' : '#f59e0b'; // Amber-400 / Amber-500 for volume peaks
      } else {
        if (isPlayed) {
          // Linear gradient for active speech voice
          const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
          grad.addColorStop(0, '#f43f5e'); // Rose 500
          grad.addColorStop(0.5, '#fb7185'); // Rose 400
          grad.addColorStop(1, '#f43f5e');
          ctx.fillStyle = grad;
        } else if (isHovered) {
          ctx.fillStyle = '#d4d4d8'; // Light hover preview
        } else {
          ctx.fillStyle = '#71717a'; // Neutral zinc-500 unplayed voice
        }
      }

      // Draw rounded bar
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, Math.min(2, barWidth / 2));
        ctx.fill();
      } else {
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Draw small accent dot over peak spikes
      if (isPeak) {
        ctx.fillStyle = isPlayed ? '#fef08a' : '#fbbf24';
        ctx.beginPath();
        ctx.arc(x + barWidth / 2, Math.max(3, y - 2), 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. Draw Playhead Scrubber Line
    if (isPlaying || currentPlaybackTime > 0) {
      const playheadX = paddingX + progressFraction * usableWidth;

      // Glow effect
      ctx.shadowColor = 'rgba(244, 63, 94, 0.9)';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 2);
      ctx.lineTo(playheadX, height - 2);
      ctx.stroke();

      // Scrubber head cap
      ctx.fillStyle = '#ffe4e6';
      ctx.beginPath();
      ctx.arc(playheadX, 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }

    // 6. Draw Hover Cursor Line
    if (hoverFraction !== null) {
      const hoverX = paddingX + hoverFraction * usableWidth;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(hoverX, 0);
      ctx.lineTo(hoverX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [
    analysis,
    canvasHeight,
    containerWidth,
    currentPlaybackTime,
    hoverFraction,
    isPlaying,
    progressFraction,
    status,
  ]);

  // Re-render canvas whenever relevant props or state change
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Interactive seek handling on canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !onSeek || status !== 'ready') return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const fraction = x / rect.width;
    onSeek(fraction);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverFraction(x / rect.width);
  };

  const handleMouseLeave = () => {
    setHoverFraction(null);
  };

  const currentHoverTime =
    hoverFraction !== null ? (hoverFraction * effectiveDuration).toFixed(2) : null;

  return (
    <div
      ref={containerRef}
      className="my-2.5 rounded-xl bg-zinc-950/85 border border-zinc-800/90 p-2.5 sm:p-3 transition-colors hover:border-zinc-700/80 select-none"
    >
      {/* Top Header: Title, Durations & Acoustic Stats */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
            <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Амплитудная волна (HTML5 Canvas)</span>
          </div>

          <span className="font-mono text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
            {actualDuration ? `${actualDuration.toFixed(1)}с` : `${duration}с`}
          </span>
        </div>

        {/* Acoustic Metrics: Max Peak dB & Silence Percentage */}
        {stats && status === 'ready' && (
          <div className="flex items-center gap-2 text-[10px] font-mono">
            {/* Peak dB indicator */}
            <span
              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                stats.maxPeakDb > -0.5
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
              title="Пиковый уровень громкости аудиосигнала (0 dB = максимум)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  stats.maxPeakDb > -0.5 ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              Пик: {stats.maxPeakDb} dB
            </span>

            {/* Silence / pauses ratio */}
            <span
              className="px-1.5 py-0.5 rounded border bg-zinc-900 border-zinc-800 text-zinc-300 flex items-center gap-1"
              title="Доля естественных пауз и тишины между фразами"
            >
              <VolumeX className="w-2.5 h-2.5 text-zinc-400" />
              Паузы: {stats.silencePercent}%
            </span>
          </div>
        )}
      </div>

      {/* HTML5 Canvas Container */}
      <div className="relative w-full rounded-lg overflow-hidden border border-zinc-800/80 bg-zinc-950 group">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={`block w-full cursor-pointer transition-opacity ${
            status === 'ready' ? 'opacity-100 hover:opacity-95' : 'opacity-60'
          }`}
          style={{ height: `${canvasHeight}px` }}
        />

        {/* Idle overlay message */}
        {status === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 backdrop-blur-[1px] pointer-events-none">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-medium bg-zinc-900/90 px-2.5 py-1 rounded-full border border-zinc-800">
              <Sparkles className="w-3 h-3 text-rose-400" />
              Волновая форма появится после озвучки
            </span>
          </div>
        )}

        {/* Generating overlay message */}
        {status === 'generating' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 backdrop-blur-[1px] pointer-events-none">
            <span className="text-[11px] text-rose-300 flex items-center gap-1.5 font-medium bg-zinc-900/90 px-3 py-1 rounded-full border border-rose-500/40 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Декодирование AudioContext & расчёт амплитуды...
            </span>
          </div>
        )}

        {/* Hover Tooltip Box */}
        {hoverFraction !== null && status === 'ready' && (
          <div
            style={{ left: `${hoverFraction * 100}%` }}
            className="absolute bottom-1 -translate-x-1/2 bg-zinc-900/95 border border-zinc-700 text-white font-mono text-[10px] px-1.5 py-0.5 rounded shadow-lg whitespace-nowrap pointer-events-none flex items-center gap-1 z-30"
          >
            <span>+{currentHoverTime}с</span>
            {analysis && analysis.peaks[Math.floor(hoverFraction * NUM_BARS)] >= 0.85 && (
              <span className="text-amber-400 font-bold">• Пик</span>
            )}
            {analysis && analysis.peaks[Math.floor(hoverFraction * NUM_BARS)] < 0.12 && (
              <span className="text-zinc-400">• Пауза</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Legend */}
      <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-[10px] text-zinc-400">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-300" />
            <span>Голос / Речь</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Пики громкости</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>Паузы & Тишина</span>
          </span>
        </div>

        <span className="text-zinc-500 font-mono">Кликните для перемотки</span>
      </div>
    </div>
  );
};
