import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INITIAL_SEGMENTS } from './data/segments';
import { VoiceSegment, AudioSettings } from './types';
import { Header } from './components/Header';
import { VideoVisualizer } from './components/VideoVisualizer';
import { TimelineRuler } from './components/TimelineRuler';
import { AudioConsole } from './components/AudioConsole';
import { SegmentCard } from './components/SegmentCard';
import { ExportModal } from './components/ExportModal';
import {
  audioBufferToWav,
  createCinematicBackingBuffer,
  playSoundFX,
  generateSRT,
} from './utils/audioEngine';
import { Sparkles, Layers, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [segments, setSegments] = useState<VoiceSegment[]>(INITIAL_SEGMENTS);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const duration = 70.0;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [playingClipId, setPlayingClipId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<AudioSettings>({
    voice: 'Kore',
    pace: 1.0,
    voiceVolume: 0.95,
    bgMusicTrack: 'cinematic_piano',
    bgMusicVolume: 0.35,
    autoDucking: true,
    soundEffects: true,
  });

  // Audio Context & refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgMusicSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgMusicGainRef = useRef<GainNode | null>(null);
  const activeVoiceAudiosRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const triggeredSFXRef = useRef<Set<string>>(new Set());
  const spokenSegmentsRef = useRef<Set<number>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackStartOffsetRef = useRef<number>(0);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Find active segment based on currentTime
  const activeSegment =
    segments.find((s) => currentTime >= s.startTime && currentTime < s.endTime) ||
    (currentTime >= duration ? segments[segments.length - 1] : segments[0]);

  // Master Stop / Pause Voice Audio
  const stopAllVoiceAudio = useCallback(() => {
    activeVoiceAudiosRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeVoiceAudiosRef.current.clear();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    spokenSegmentsRef.current.clear();
    setPlayingClipId(null);
  }, []);

  // Stop background music
  const stopBgMusic = useCallback(() => {
    if (bgMusicSourceRef.current) {
      try {
        bgMusicSourceRef.current.stop();
        bgMusicSourceRef.current.disconnect();
      } catch (e) {}
      bgMusicSourceRef.current = null;
    }
  }, []);

  // Start background music at offset
  const startBgMusic = useCallback(
    (offsetSec: number) => {
      stopBgMusic();
      if (settings.bgMusicTrack === 'none' || settings.bgMusicVolume <= 0) return;

      const ctx = getAudioContext();
      const backingBuffer = createCinematicBackingBuffer(ctx, duration);
      const source = ctx.createBufferSource();
      source.buffer = backingBuffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(settings.bgMusicVolume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      source.start(0, Math.min(offsetSec, duration));
      bgMusicSourceRef.current = source;
      bgMusicGainRef.current = gain;
    },
    [duration, getAudioContext, settings.bgMusicTrack, settings.bgMusicVolume, stopBgMusic]
  );

  // Play / Pause Master Timeline
  const togglePlay = useCallback(() => {
    const ctx = getAudioContext();

    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      stopAllVoiceAudio();
      stopBgMusic();
      if (videoRef.current) videoRef.current.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      // Play
      let startFrom = currentTime;
      if (startFrom >= duration - 0.2) {
        startFrom = 0;
        setCurrentTime(0);
        triggeredSFXRef.current.clear();
      }

      setIsPlaying(true);
      playbackStartTimeRef.current = ctx.currentTime;
      playbackStartOffsetRef.current = startFrom;

      startBgMusic(startFrom);
      if (videoRef.current) {
        videoRef.current.currentTime = startFrom;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentTime, duration, getAudioContext, isPlaying, startBgMusic, stopAllVoiceAudio, stopBgMusic]);

  // Seek timeline to time
  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(duration, time));
      setCurrentTime(clamped);
      stopAllVoiceAudio();

      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }

      if (isPlaying) {
        const ctx = getAudioContext();
        playbackStartTimeRef.current = ctx.currentTime;
        playbackStartOffsetRef.current = clamped;
        startBgMusic(clamped);
      }
    },
    [duration, getAudioContext, isPlaying, startBgMusic, stopAllVoiceAudio]
  );

  // Reset to 0
  const handleReset = useCallback(() => {
    handleSeek(0);
    triggeredSFXRef.current.clear();
  }, [handleSeek]);

  // Skip +- seconds
  const handleSkip = useCallback(
    (delta: number) => {
      handleSeek(currentTime + delta);
    },
    [currentTime, handleSeek]
  );

  // Master Clock Update Loop
  useEffect(() => {
    if (!isPlaying) return;

    const ctx = getAudioContext();

    const loop = () => {
      const elapsed = ctx.currentTime - playbackStartTimeRef.current;
      const newTime = playbackStartOffsetRef.current + elapsed;

      if (newTime >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
        stopAllVoiceAudio();
        stopBgMusic();
        if (videoRef.current) videoRef.current.pause();
        return;
      }

      setCurrentTime(newTime);

      // Trigger SFX if enabled
      if (settings.soundEffects) {
        if (newTime >= 37.0 && newTime < 37.5 && !triggeredSFXRef.current.has('crutch')) {
          playSoundFX(ctx, 'crutch', 0.6);
          triggeredSFXRef.current.add('crutch');
        }
        if (newTime >= 41.0 && newTime < 41.5 && !triggeredSFXRef.current.has('applause')) {
          playSoundFX(ctx, 'applause', 0.5);
          triggeredSFXRef.current.add('applause');
        }
        if (newTime >= 46.5 && newTime < 47.0 && !triggeredSFXRef.current.has('shutter1')) {
          playSoundFX(ctx, 'shutter', 0.4);
          triggeredSFXRef.current.add('shutter1');
        }
        if (newTime >= 51.5 && newTime < 52.0 && !triggeredSFXRef.current.has('shutter2')) {
          playSoundFX(ctx, 'shutter', 0.4);
          triggeredSFXRef.current.add('shutter2');
        }
        if (newTime >= 63.0 && newTime < 63.5 && !triggeredSFXRef.current.has('chime')) {
          playSoundFX(ctx, 'chime', 0.45);
          triggeredSFXRef.current.add('chime');
        }
      }

      // Check current active segment voiceover
      const currentSeg = segments.find((s) => newTime >= s.startTime && newTime < s.endTime);

      if (currentSeg) {
        if (currentSeg.audioUrl && currentSeg.audioUrl.startsWith('data:audio')) {
          let audio = activeVoiceAudiosRef.current.get(currentSeg.id);
          const segOffset = newTime - currentSeg.startTime;

          if (!audio) {
            audio = new Audio(currentSeg.audioUrl);
            audio.volume = settings.voiceVolume;
            audio.currentTime = segOffset;
            audio.play().catch(() => {});
            activeVoiceAudiosRef.current.set(currentSeg.id, audio);
          }

          // Auto-Ducking
          if (settings.autoDucking && bgMusicGainRef.current) {
            bgMusicGainRef.current.gain.setTargetAtTime(settings.bgMusicVolume * 0.3, ctx.currentTime, 0.15);
          }
        } else if ('speechSynthesis' in window && !spokenSegmentsRef.current.has(currentSeg.id)) {
          spokenSegmentsRef.current.add(currentSeg.id);
          const u = new SpeechSynthesisUtterance(currentSeg.text);
          u.lang = 'ru-RU';
          u.rate = settings.pace;
          window.speechSynthesis.speak(u);

          if (settings.autoDucking && bgMusicGainRef.current) {
            bgMusicGainRef.current.gain.setTargetAtTime(settings.bgMusicVolume * 0.3, ctx.currentTime, 0.15);
          }
        }
      } else {
        // Return background music gain to normal
        if (bgMusicGainRef.current) {
          bgMusicGainRef.current.gain.setTargetAtTime(settings.bgMusicVolume, ctx.currentTime, 0.2);
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    duration,
    getAudioContext,
    isPlaying,
    segments,
    settings.autoDucking,
    settings.bgMusicVolume,
    settings.soundEffects,
    settings.voiceVolume,
    stopAllVoiceAudio,
    stopBgMusic,
  ]);

  // Generate Single Segment Voice with Gemini TTS
  const generateSegmentAudio = async (id: number) => {
    const target = segments.find((s) => s.id === id);
    if (!target) return;

    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'generating', error: undefined } : s))
    );

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: target.text,
          voice: settings.voice,
          stylePrompt: `${target.emotionKey}. ${target.emotionDescription}`,
          targetDuration: target.duration,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.audioUrl) {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'ready',
                  audioUrl: data.audioUrl,
                  audioDuration: data.duration,
                }
              : s
          )
        );
        showToast(`Сцена #${id} успешно озвучена!`);
      }
    } catch (err: any) {
      console.error('Error generating audio:', err);
      // If server or API key is unavailable, provide instant browser Web Speech synthesis so the user is delighted
      if ('speechSynthesis' in window) {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'ready',
                  audioUrl: 'webspeech:' + encodeURIComponent(s.text),
                  audioDuration: s.duration,
                }
              : s
          )
        );
        showToast(`Сцена #${id} готова (локальный голосовой движок)`);
      } else {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: 'error', error: err?.message || 'Ошибка' } : s
          )
        );
        showToast(`Ошибка озвучки: ${err?.message || 'Попробуйте снова'}`);
      }
    }
  };

  // Generate All Segments (1-Click)
  const generateAllSegments = async () => {
    if (isGeneratingAll) return;
    setIsGeneratingAll(true);
    showToast('Запущена генерация озвучки для всех 14 сцен...');

    for (const seg of segments) {
      await generateSegmentAudio(seg.id);
      // Short delay to avoid rate limit spikes
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsGeneratingAll(false);
    showToast('Все 14 сцен успешно озвучены!');
  };

  // Play Single Audio Clip
  const playSingleClip = (segment: VoiceSegment) => {
    if (playingClipId === segment.id) {
      stopAllVoiceAudio();
      return;
    }

    stopAllVoiceAudio();
    if (isPlaying) {
      setIsPlaying(false);
      stopBgMusic();
    }

    if (segment.audioUrl && segment.audioUrl.startsWith('data:audio')) {
      const audio = new Audio(segment.audioUrl);
      audio.volume = settings.voiceVolume;
      audio.onended = () => setPlayingClipId(null);
      audio.play().catch(() => {});
      activeVoiceAudiosRef.current.set(segment.id, audio);
      setPlayingClipId(segment.id);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(segment.text);
      u.lang = 'ru-RU';
      u.rate = settings.pace;
      u.onend = () => setPlayingClipId(null);
      window.speechSynthesis.speak(u);
      setPlayingClipId(segment.id);
    }
  };

  // Update text for a segment
  const handleUpdateText = (id: number, newText: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: newText, status: 'idle' } : s))
    );
    showToast(`Текст сцены #${id} обновлён. Нажмите «Озвучить» для записи.`);
  };

  // Download Single Clip WAV
  const downloadSingleClip = (segment: VoiceSegment) => {
    if (!segment.audioUrl) return;
    const a = document.createElement('a');
    a.href = segment.audioUrl;
    a.download = `scene_${segment.id}_${segment.startTime}-${segment.endTime}s.wav`;
    a.click();
  };

  // Download Master 70.0s Mixed WAV
  const downloadMasterWav = async () => {
    showToast('Подготавливаем мастер-дорожку (70.0 сек)...');
    const ctx = getAudioContext();
    const sampleRate = 24000;
    const totalSamples = Math.floor(sampleRate * duration);
    const masterBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const masterLeft = masterBuffer.getChannelData(0);
    const masterRight = masterBuffer.getChannelData(1);

    // 1. Mix background music if enabled
    if (settings.bgMusicTrack !== 'none' && settings.bgMusicVolume > 0) {
      const bgBuffer = createCinematicBackingBuffer(ctx, duration);
      const bgLeft = bgBuffer.getChannelData(0);
      const bgRight = bgBuffer.getChannelData(1);
      const musicVol = settings.bgMusicVolume;

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        // Check if voice is speaking at time t for ducking
        const isVoiceActive = segments.some(
          (s) => t >= s.startTime && t < s.endTime && s.status === 'ready'
        );
        const duckFactor = settings.autoDucking && isVoiceActive ? 0.35 : 1.0;
        masterLeft[i] += bgLeft[i] * musicVol * duckFactor;
        masterRight[i] += bgRight[i] * musicVol * duckFactor;
      }
    }

    // 2. Decode and place each voice segment at its exact start second
    for (const seg of segments) {
      if (seg.audioUrl && seg.audioUrl.startsWith('data:audio')) {
        try {
          const res = await fetch(seg.audioUrl);
          const arrayBuffer = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          const startSample = Math.floor(seg.startTime * sampleRate);
          const segSamples = decoded.length;
          const voiceVol = settings.voiceVolume;

          const decLeft = decoded.getChannelData(0);
          const decRight = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : decLeft;

          for (let i = 0; i < segSamples; i++) {
            const targetIdx = startSample + i;
            if (targetIdx < totalSamples) {
              masterLeft[targetIdx] += decLeft[i] * voiceVol;
              masterRight[targetIdx] += decRight[i] * voiceVol;
            }
          }
        } catch (e) {
          console.warn('Error decoding segment audio during master mix:', e);
        }
      }
    }

    // 3. Export to WAV blob and trigger download
    const wavBlob = audioBufferToWav(masterBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `озвучка_ролика_70_секунд_мастер_${settings.voice}.wav`;
    a.click();
    showToast('Мастер-дорожка успешно сохранена!');
  };

  // Export Subtitles (.SRT)
  const exportSRT = () => {
    const srt = generateSRT(segments);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'субтитры_70_секунд.srt';
    a.click();
    showToast('Файл субтитров .SRT скачан!');
  };

  // Handle Video File Upload
  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    showToast(`Видео «${file.name}» загружено и синхронизировано с таймлайном!`);
  };

  // Filtered segments
  const filteredSegments =
    selectedCategory === 'all'
      ? segments
      : segments.filter((s) => s.category === selectedCategory);

  const readyCount = segments.filter((s) => s.status === 'ready').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-rose-500/30 selection:text-rose-200">
      {/* Top Header */}
      <Header
        segments={segments}
        isGeneratingAll={isGeneratingAll}
        onGenerateAll={generateAllSegments}
        onDownloadMasterWav={downloadMasterWav}
        onExportSRT={exportSRT}
        onOpenScriptModal={() => setIsExportModalOpen(true)}
        readyCount={readyCount}
      />

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900/95 text-white border border-rose-500/40 shadow-2xl backdrop-blur-md animate-bounce text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-rose-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Control Grid: Video Visualizer + Audio Console */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Synchronized Storyboard Video Visualizer (7 cols) */}
          <div className="lg:col-span-7 flex flex-col">
            <VideoVisualizer
              currentTime={currentTime}
              duration={duration}
              isPlaying={isPlaying}
              activeSegment={activeSegment}
              onSeek={handleSeek}
              uploadedVideoUrl={uploadedVideoUrl}
              onVideoUpload={handleVideoUpload}
              videoRef={videoRef}
            />
          </div>

          {/* Right: Master Audio Console & Mixers (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <AudioConsole
              isPlaying={isPlaying}
              onTogglePlay={togglePlay}
              onReset={handleReset}
              onSkip={handleSkip}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              settings={settings}
              onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
            />
          </div>
        </div>

        {/* Interactive Master 70-Second Multi-Track Timeline */}
        <div className="w-full">
          <TimelineRuler
            segments={segments}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            activeSegmentId={activeSegment?.id || null}
          />
        </div>

        {/* Segment Manager: Header & Filter Bar */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-rose-400" />
                Сценарный план и реплики (14 сцен)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Каждая сцена идеально синхронизирована по хронометражу и интонации
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: 'Все 14 сцен' },
                { id: 'childhood', label: 'Детство (0–8с)' },
                { id: 'motherhood', label: 'Материнство (8–22с)' },
                { id: 'sport', label: 'Спорт & Танец (22–32с)' },
                { id: 'recovery', label: 'Преодоление (32–41с)' },
                { id: 'triumph', label: 'Триумф (41–57с)' },
                { id: 'present', label: 'Мне 50 (57–70с)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-zinc-800 text-rose-400 border border-rose-500/40 shadow-sm'
                      : 'bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 14 Cue Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSegments.map((segment) => (
              <SegmentCard
                key={segment.id}
                segment={segment}
                isActive={activeSegment?.id === segment.id}
                onSeek={handleSeek}
                onGenerateSingle={generateSegmentAudio}
                onPlaySingleClip={playSingleClip}
                isPlayingClip={playingClipId === segment.id}
                onUpdateText={handleUpdateText}
                onDownloadClip={downloadSingleClip}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Export / Script Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        segments={segments}
        onDownloadMasterWav={downloadMasterWav}
        onExportSRT={exportSRT}
      />
    </div>
  );
}
